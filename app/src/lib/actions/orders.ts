"use server";

import { toTitleCase } from "@/lib/titleCase";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orderFormSchema, type OrderFormValues } from "@/lib/orderSchema";
import type { NewOrderInput } from "@/lib/types";

export interface CreateOrderResult {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

export async function createOrderAction(
  values: OrderFormValues
): Promise<CreateOrderResult> {
  const parsed = orderFormSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "입력값을 다시 확인해주세요.", fieldErrors };
  }

  const v = parsed.data;
  const input: NewOrderInput = {
    label_design: v.label_design,
    event_date: v.event_date,
    birthday_date: v.birthday_date || null,
    baby_name_kr: v.baby_name_kr || null,
    baby_name_en: (v.baby_name_en && toTitleCase(v.baby_name_en.trim().replace(/s+/g, " "))) || null,
    father_name: v.father_name || null,
    mother_name: v.mother_name || null,
    groom_name_kr: v.groom_name_kr || null,
    groom_name_en: (v.groom_name_en && toTitleCase(v.groom_name_en.trim().replace(/s+/g, " "))) || null,
    bride_name_kr: v.bride_name_kr || null,
    bride_name_en: (v.bride_name_en && toTitleCase(v.bride_name_en.trim().replace(/s+/g, " "))) || null,
    towel_color: v.towel_color,
    embroidery_color: v.embroidery_color,
    recipient_name: v.recipient_name,
    recipient_phone: v.recipient_phone,
    recipient_zipcode: v.recipient_zipcode,
    recipient_address1: v.recipient_address1,
    recipient_address2: v.recipient_address2 || null,
  };

  let orderCode: string;
  try {
    const record = await db.create(input);
    orderCode = record.order_code;
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "주문 저장 중 오류가 발생했습니다.",
    };
  }

  redirect(`/order/complete/${orderCode}`);
}
