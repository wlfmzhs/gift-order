import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { generateOrderCode } from "../codes";
import { computeExportDefaults } from "../exportDefaults";
import type { OrderFilter, OrderRecord } from "../types";
import type { OrdersDB } from "./adapter";

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
  await writeFile(DATA_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

export const localOrdersDB: OrdersDB = {
  async create(input) {
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

  async update(id, patch) {
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
  },
};
