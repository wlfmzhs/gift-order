"use server";

import { db } from "@/lib/db";

export interface LookupResult {
  ok: boolean;
  orderCode?: string;
  message?: string;
}

export async function lookupOrderAction(
  recipientName: string,
  phoneTail: string
): Promise<LookupResult> {
  const name = recipientName.trim();
  const tail = phoneTail.trim();

  if (!name || !/^\d{4}$/.test(tail)) {
    return {
      ok: false,
      message: "받는분 성함과 연락처 뒤 4자리를 정확히 입력해주세요.",
    };
  }

  const order = await db.findByNameAndPhoneTail(name, tail);
  if (!order) {
    return { ok: false, message: "일치하는 주문을 찾을 수 없습니다." };
  }
  return { ok: true, orderCode: order.order_code };
}
