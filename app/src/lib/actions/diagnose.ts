"use server";

import { requireAdmin } from "@/lib/adminSession";
import { db, paymentsDb } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { linkPaymentsToOrder } from "@/lib/reconcile";

export interface DiagnoseResult {
  ok: boolean;
  message?: string;
  orders: { id: string; label: string }[];
  payments: { id: string; label: string; orderId: string | null }[];
}

/** 연락처 하나에 대해 주문서와 결제가 어떻게 저장돼 있는지 한눈에 보여준다. */
export async function diagnosePhoneAction(phone: string): Promise<DiagnoseResult> {
  try {
    await requireAdmin();
    const key = normalizePhone(phone);
    if (key.length < 10) {
      return { ok: false, message: "연락처를 정확히 입력해주세요.", orders: [], payments: [] };
    }

    const [orders, payments] = await Promise.all([db.list(), paymentsDb.list()]);
    const byId = new Map(orders.map((o) => [o.id, o]));

    const myOrders = orders.filter((o) => normalizePhone(o.recipient_phone) === key);
    const myPayments = payments.filter((p) => p.phone_norm === key);

    return {
      ok: true,
      orders: myOrders.map((o) => ({
        id: o.id,
        label:
          `${o.order_code} · ${o.recipient_name} · 접수 ${o.created_at.slice(0, 16).replace("T", " ")} · ` +
          `송장 ${o.tracking_no || "없음"} · 내보내기 ${o.exported_at ? "완료" : "전"} · ` +
          `품목명 "${o.export_item_name}" · 금액 "${o.export_amount}"`,
      })),
      payments: myPayments.map((p) => {
        const o = p.order_id ? byId.get(p.order_id) : undefined;
        const linked = p.order_id ? (o ? `연결: ${o.order_code}` : "연결: 삭제된 주문서") : "연결 안 됨";
        return {
          id: p.id,
          orderId: p.order_id,
          label:
            `${p.recipient_name} · "${p.item_name}" · ${p.amount} · ${linked} · ` +
            `${p.ignored ? "삭제(숨김)됨" : "표시 중"} · 내보내기 ${p.exported_at ? "완료" : "전"}`,
        };
      }),
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "조회 중 오류가 발생했습니다.",
      orders: [],
      payments: [],
    };
  }
}

/** 결제를 다른 주문서로 옮긴다. (이미 다른 주문서에 연결돼 있어도 된다) */
export async function movePaymentAction(
  paymentId: string,
  targetOrderId: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    await requireAdmin();
    const [order, payments] = await Promise.all([db.getById(targetOrderId), paymentsDb.list()]);
    if (!order) return { ok: false, message: "옮길 주문서를 찾을 수 없습니다." };
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return { ok: false, message: "결제 내역을 찾을 수 없습니다." };
    await linkPaymentsToOrder(order, [payment], payments);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "옮기는 중 오류가 발생했습니다." };
  }
}
