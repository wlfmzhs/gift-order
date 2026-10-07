import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateOrderCode } from "../codes";
import { computeExportDefaults } from "../exportDefaults";
import type {
  NewPaymentInput,
  OrderFilter,
  OrderRecord,
  PaymentRecord,
} from "../types";
import type { OrdersDB, PaymentsDB } from "./adapter";

// 요청마다 클라이언트를 새로 만들지 않고 서버 인스턴스 안에서 재사용한다.
let client: SupabaseClient | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다."
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false },
  });
  return client;
}

const TABLE = "orders";

// Supabase(PostgREST)는 한 번의 select로 최대 1000행까지만 돌려주므로
// 그보다 많은 주문도 빠짐없이 가져오도록 나눠서 조회한다.
const PAGE_SIZE = 1000;

// 주문번호는 랜덤 생성이라 극히 드물게 기존 번호와 겹칠 수 있다 → 다시 생성해 재시도.
const MAX_CODE_RETRIES = 5;

export const supabaseOrdersDB: OrdersDB = {
  async create(input) {
    const defaults = computeExportDefaults(input);
    const base = {
      ...input,
      status: "접수완료" as const,
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

    for (let attempt = 0; ; attempt++) {
      const { data, error } = await getClient()
        .from(TABLE)
        .insert({ ...base, order_code: generateOrderCode() })
        .select()
        .single();
      if (!error) return data as OrderRecord;
      const isCodeCollision =
        error.code === "23505" && error.message.includes("order_code");
      if (!isCodeCollision || attempt >= MAX_CODE_RETRIES) {
        throw new Error(error.message);
      }
    }
  },

  async getByCode(orderCode) {
    const { data, error } = await getClient()
      .from(TABLE)
      .select("*")
      .eq("order_code", orderCode)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as OrderRecord) ?? null;
  },

  async getById(id) {
    const { data, error } = await getClient()
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as OrderRecord) ?? null;
  },

  async findByNameAndPhoneTail(recipientName, phoneTail) {
    const { data, error } = await getClient()
      .from(TABLE)
      .select("*")
      .eq("recipient_name", recipientName.trim());
    if (error) throw new Error(error.message);
    const rows = (data as OrderRecord[]) ?? [];
    return (
      rows.find((o) => o.recipient_phone.replace(/-/g, "").endsWith(phoneTail)) ??
      null
    );
  },

  async list(filter?: OrderFilter) {
    let rows: OrderRecord[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = getClient().from(TABLE).select("*");
      if (filter?.status) query = query.eq("status", filter.status);
      if (filter?.labelDesign) query = query.eq("label_design", filter.labelDesign);

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: true }) // 같은 시각 주문이 페이지 경계에서 누락/중복되지 않도록
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      const page = (data as OrderRecord[]) ?? [];
      rows = rows.concat(page);
      if (page.length < PAGE_SIZE) break;
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      rows = rows.filter((o) =>
        [o.order_code, o.recipient_name, o.recipient_phone, o.baby_name_kr]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return rows;
  },

  async update(id, patch) {
    const { data, error } = await getClient()
      .from(TABLE)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as OrderRecord;
  },

  async delete(id) {
    const { error } = await getClient().from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

const PAYMENTS_TABLE = "payments";
const INSERT_CHUNK = 500;

export const supabasePaymentsDB: PaymentsDB = {
  async list() {
    let rows: PaymentRecord[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await getClient()
        .from(PAYMENTS_TABLE)
        .select("*")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      const page = (data as PaymentRecord[]) ?? [];
      rows = rows.concat(page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  },

  async insertMany(inputs: NewPaymentInput[]) {
    // 같은 키가 입력 안에 두 번 있으면 upsert가 오류를 내므로 먼저 걸러낸다.
    const seen = new Set<string>();
    const unique = inputs.filter((i) => {
      if (seen.has(i.dedupe_key)) return false;
      seen.add(i.dedupe_key);
      return true;
    });
    const base = Date.now();
    const rows = unique.map((input, i) => ({
      ...input,
      // 한 번에 넣은 결제의 순서를 유지하도록 1ms씩 어긋나게 기록한다.
      created_at: new Date(base + i).toISOString(),
    }));

    let inserted: PaymentRecord[] = [];
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const { data, error } = await getClient()
        .from(PAYMENTS_TABLE)
        .upsert(rows.slice(i, i + INSERT_CHUNK), {
          onConflict: "dedupe_key",
          ignoreDuplicates: true,
        })
        .select();
      if (error) throw new Error(error.message);
      inserted = inserted.concat((data as PaymentRecord[]) ?? []);
    }
    return inserted;
  },

  async deleteByKeys(keys: string[]) {
    let removed: PaymentRecord[] = [];
    for (let i = 0; i < keys.length; i += INSERT_CHUNK) {
      const { data, error } = await getClient()
        .from(PAYMENTS_TABLE)
        .delete()
        .in("dedupe_key", keys.slice(i, i + INSERT_CHUNK))
        .select();
      if (error) throw new Error(error.message);
      removed = removed.concat((data as PaymentRecord[]) ?? []);
    }
    return removed;
  },

  async update(id, patch) {
    const { error } = await getClient()
      .from(PAYMENTS_TABLE)
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async delete(id) {
    const { error } = await getClient().from(PAYMENTS_TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
