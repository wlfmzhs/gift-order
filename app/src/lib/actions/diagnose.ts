"use server";

import { requireAdmin } from "@/lib/adminSession";
import { db, paymentsDb } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

/** 연락처 하나에 대해 주문서와 결제가 어떻게 저장돼 있는지 한눈에 보여준다. */
export async function diagnosePhoneAction(
  phone: string
): Promise<{ ok: boolean; lines: string[]; message?: string }> {
  try {
    await requireAdmin();
    const key = normalizePhone(phone);
    if (key.length < 10) return { ok: false, lines: [], message: "연락처를 정확히 입력해주세요." };

    const [orders, payments] = await Promise.all([db.list(), paymentsDb.list()]);
    const byId = new Map(orders.map((o) => [o.id, o]));
    const lines: string[] = [];

    const myOrders = orders.filter((o) => normalizePhone(o.recipient_phone) === key);
    lines.push(`[주문서 ${myOrders.length}건]`);
    for (const o of myOrders) {
      lines.push(
        `${o.order_code} · ${o.recipient_name} · 접수 ${o.created_at.slice(0, 16)} · 송장 ${o.tracking_no || "없음"} · ` +
          `내보내기 ${o.exported_at ? "완료" : "전"} · 품목명 "${o.export_item_name}" · 금액 "${o.export_amount}"`
      );
    }

    const myPayments = payments.filter((p) => p.phone_norm === key);
    lines.push(`[결제 ${myPayments.length}건]`);
    for (const p of myPayments) {
      const linked = p.order_id
        ? byId.get(p.order_id)
          ? `연결: ${byId.get(p.order_id)!.order_code} (${byId.get(p.order_id)!.recipient_name}, 연락처 ${byId.get(p.order_id)!.recipient_phone})`
          : "연결: 삭제된 주문서"
        : "연결 안 됨";
      lines.push(
        `${p.recipient_name} · "${p.item_name}" · ${p.amount} · ${linked} · ${p.ignored ? "삭제(숨김)됨" : "표시 중"}` +
          ` · 내보내기 ${p.exported_at ? "완료" : "전"}`
      );
    }
    return { ok: true, lines };
  } catch (err) {
    return { ok: false, lines: [], message: err instanceof Error ? err.message : "조회 중 오류가 발생했습니다." };
  }
}
