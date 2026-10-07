import { randomUUID } from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { generateOrderCode } from "../codes";
import { computeExportDefaults } from "../exportDefaults";
import type { OrderFilter, OrderRecord, PaymentRecord } from "../types";
import type { OrdersDB, PaymentsDB } from "./adapter";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "orders.json");

async function readAll(): Promise<OrderRecord[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as OrderRecord[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(orders: OrderRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  // 임시 파일에 다 쓴 뒤 교체해서, 쓰는 도중에 읽으면 깨진 JSON을 보는 일이 없게 한다.
  const tmp = `${DATA_FILE}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(orders, null, 2), "utf-8");
  await rename(tmp, DATA_FILE);
}

// 읽기→수정→쓰기 사이에 다른 요청이 끼어들면 먼저 저장된 주문이 사라지므로
// 쓰기 작업은 한 번에 하나씩만 실행한다.
let writeQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => {});
  return run;
}

export const localOrdersDB: OrdersDB = {
  create(input) {
    return withWriteLock(async () => {
      const orders = await readAll();
      const now = new Date().toISOString();
      const defaults = computeExportDefaults(input);

      const record: OrderRecord = {
        ...input,
        id: randomUUID(),
        order_code: generateOrderCode(),
        created_at: now,
        updated_at: now,
        status: "접수완료",
        carrier: "롯데택배",
        tracking_no: null,
        ship_date: defaults.ship_date,
        export_recipient_display: defaults.export_recipient_display,
        export_item_name: "",
        export_amount: "",
        export_delivery_message: "",
        export_birthday: defaults.export_birthday,
        export_etc: defaults.export_etc,
      };

      orders.push(record);
      await writeAll(orders);
      return record;
    });
  },

  async getByCode(orderCode) {
    const orders = await readAll();
    return orders.find((o) => o.order_code === orderCode) ?? null;
  },

  async getById(id) {
    const orders = await readAll();
    return orders.find((o) => o.id === id) ?? null;
  },

  async findByNameAndPhoneTail(recipientName, phoneTail) {
    const orders = await readAll();
    const name = recipientName.trim();
    return (
      orders.find(
        (o) =>
          o.recipient_name.trim() === name &&
          o.recipient_phone.replace(/-/g, "").endsWith(phoneTail)
      ) ?? null
    );
  },

  async list(filter?: OrderFilter) {
    let orders = await readAll();
    if (filter?.status) {
      orders = orders.filter((o) => o.status === filter.status);
    }
    if (filter?.labelDesign) {
      orders = orders.filter((o) => o.label_design === filter.labelDesign);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      orders = orders.filter((o) =>
        [o.order_code, o.recipient_name, o.recipient_phone, o.baby_name_kr]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return orders.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },

  update(id, patch) {
    return withWriteLock(async () => {
      const orders = await readAll();
      const idx = orders.findIndex((o) => o.id === id);
      if (idx === -1) throw new Error("주문을 찾을 수 없습니다.");
      orders[idx] = {
        ...orders[idx],
        ...patch,
        updated_at: new Date().toISOString(),
      };
      await writeAll(orders);
      return orders[idx];
    });
  },

  delete(id) {
    return withWriteLock(async () => {
      const orders = await readAll();
      await writeAll(orders.filter((o) => o.id !== id));
    });
  },
};

const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");

async function readPayments(): Promise<PaymentRecord[]> {
  try {
    const raw = await readFile(PAYMENTS_FILE, "utf-8");
    return JSON.parse(raw) as PaymentRecord[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writePayments(payments: PaymentRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${PAYMENTS_FILE}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(payments, null, 2), "utf-8");
  await rename(tmp, PAYMENTS_FILE);
}

let paymentsQueue: Promise<unknown> = Promise.resolve();
function withPaymentsLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = paymentsQueue.then(fn, fn);
  paymentsQueue = run.catch(() => {});
  return run;
}

export const localPaymentsDB: PaymentsDB = {
  async list() {
    const rows = await readPayments();
    return rows.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  },

  insertMany(inputs) {
    return withPaymentsLock(async () => {
      const rows = await readPayments();
      const seen = new Set(rows.map((r) => r.dedupe_key));
      const base = Date.now();
      const inserted: PaymentRecord[] = [];
      for (const input of inputs) {
        if (seen.has(input.dedupe_key)) continue;
        seen.add(input.dedupe_key);
        // 한 번에 넣은 결제의 순서를 유지하도록 1ms씩 어긋나게 기록한다.
        const created_at = new Date(base + inserted.length).toISOString();
        inserted.push({ ...input, id: randomUUID(), created_at });
      }
      if (inserted.length > 0) await writePayments([...rows, ...inserted]);
      return inserted;
    });
  },

  deleteByKeys(keys) {
    return withPaymentsLock(async () => {
      const keySet = new Set(keys);
      const rows = await readPayments();
      const removed = rows.filter((r) => keySet.has(r.dedupe_key));
      if (removed.length > 0) {
        await writePayments(rows.filter((r) => !keySet.has(r.dedupe_key)));
      }
      return removed;
    });
  },

  update(id, patch) {
    return withPaymentsLock(async () => {
      const rows = await readPayments();
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("결제 내역을 찾을 수 없습니다.");
      rows[idx] = { ...rows[idx], ...patch };
      await writePayments(rows);
    });
  },

  delete(id) {
    return withPaymentsLock(async () => {
      const rows = await readPayments();
      await writePayments(rows.filter((r) => r.id !== id));
    });
  },
};
