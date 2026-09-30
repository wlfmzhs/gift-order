import { createClient } from "@supabase/supabase-js";
import { generateOrderCode } from "../codes";
import { computeExportDefaults } from "../exportDefaults";
import type { OrderFilter, OrderRecord } from "../types";
import type { OrdersDB } from "./adapter";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

const TABLE = "orders";

export const supabaseOrdersDB: OrdersDB = {
  async create(input) {
    const defaults = computeExportDefaults(input);
    const record = {
      ...input,
      order_code: generateOrderCode(),
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

    const { data, error } = await getClient()
      .from(TABLE)
      .insert(record)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as OrderRecord;
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
    let query = getClient().from(TABLE).select("*");
    if (filter?.status) query = query.eq("status", filter.status);
    if (filter?.labelDesign) query = query.eq("label_design", filter.labelDesign);

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });
    if (error) throw new Error(error.message);
    let rows = (data as OrderRecord[]) ?? [];

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
