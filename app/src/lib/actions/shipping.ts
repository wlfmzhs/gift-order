"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { shippingFormSchema, type ShippingFormValues } from "@/lib/orderSchema";

export interface UpdateShippingResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateShippingAction(
  orderCode: string,
  values: ShippingFormValues
): Promise<UpdateShippingResult> {
  const parsed = shippingFormSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "입력값을 다시 확인해주세요.", fieldErrors };
  }

  const order = await db.getByCode(orderCode);
  if (!order) return { ok: false, message: "주문을 찾을 수 없습니다." };

  if (order.status === "발송준비" || order.status === "발송완료") {
    return {
      ok: false,
      message:
        "이미 발송 준비 중이거나 발송된 주문은 직접 변경할 수 없어요. 카카오톡 상담으로 문의해주세요.",
    };
  }

  const v = parsed.data;
  try {
    await db.update(order.id, {
      recipient_name: v.recipient_name,
      recipient_phone: v.recipient_phone,
      recipient_zipcode: v.recipient_zipcode,
      recipient_address1: v.recipient_address1,
      recipient_address2: v.recipient_address2 || null,
    });
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "배송지 변경 중 오류가 발생했습니다.",
    };
  }

  revalidatePath(`/order/${orderCode}`);
  return { ok: true };
}
