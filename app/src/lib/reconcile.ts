import { db, paymentsDb } from "./db";
import { mergePayments } from "./paymentMerge";
import { normalizePhone } from "./phone";
import type { OrderRecord, PaymentRecord } from "./types";

/**
 * 결제 내역과 주문서를 연락처로 이어 붙인다. (여러 번 실행해도 결과가 같다)
 *
 * - 연락처가 같은 주문서가 정확히 1건이면 그 주문서에 자동 연결한다.
 *   주문서의 품목명/금액/배송메모가 비어 있을 때만 채우고, 이미 값이 있으면
 *   (직접 고친 값이거나 예전에 반영해 둔 값) 덮어쓰지 않는다.
 *   단, 주문서 값이 이전 결제 내용 그대로라면 추가 결제가 들어온 것이므로 갱신한다.
 * - 같은 연락처의 주문서가 2건 이상이면 어느 쪽인지 알 수 없으므로 연결하지 않는다.
 *   (시트 내보내기 화면에서 직접 연결)
 * - 연결된 주문서가 삭제됐다면 연결을 해제한다.
 */
export async function reconcilePayments(
  orders: OrderRecord[],
  payments: PaymentRecord[]
): Promise<{ orders: OrderRecord[]; payments: PaymentRecord[] }> {
  const orderList = orders.map((o) => ({ ...o }));
  const paymentList = payments.map((p) => ({ ...p }));
  const orderById = new Map(orderList.map((o) => [o.id, o]));

  // 1) 삭제된 주문서를 가리키는 연결 해제
  for (const p of paymentList) {
    if (p.order_id && !orderById.has(p.order_id)) {
      await paymentsDb.update(p.id, { order_id: null });
      p.order_id = null;
    }
  }

  const ordersByPhone = new Map<string, OrderRecord[]>();
  for (const o of orderList) {
    const key = normalizePhone(o.recipient_phone);
    if (!key) continue;
    const arr = ordersByPhone.get(key) ?? [];
    arr.push(o);
    ordersByPhone.set(key, arr);
  }

  // 2) 연락처로 1:1 대응되는 미연결 결제를 자동 연결
  const unlinkedByPhone = new Map<string, PaymentRecord[]>();
  for (const p of paymentList) {
    if (p.order_id || !p.phone_norm) continue;
    const arr = unlinkedByPhone.get(p.phone_norm) ?? [];
    arr.push(p);
    unlinkedByPhone.set(p.phone_norm, arr);
  }

  for (const [phone, unlinked] of unlinkedByPhone) {
    const candidates = ordersByPhone.get(phone) ?? [];
    if (candidates.length !== 1) continue;
    await linkPaymentsToOrder(candidates[0], unlinked, paymentList);
  }

  return { orders: orderList, payments: paymentList };
}

/**
 * 결제들을 주문서에 연결하고(order_id 기록), 주문서의 품목명/금액/배송메모를 규칙에 맞게 채운다.
 * order와 paymentList는 메모리상에서도 함께 갱신된다.
 */
export async function linkPaymentsToOrder(
  order: OrderRecord,
  toLink: PaymentRecord[],
  paymentList: PaymentRecord[]
): Promise<void> {
  const before = paymentList.filter((p) => p.order_id === order.id);
  for (const p of toLink) {
    await paymentsDb.update(p.id, { order_id: order.id });
    p.order_id = order.id;
  }
  const after = [...before, ...toLink];

  const oldM = mergePayments(before);
  const newM = mergePayments(after);

  const patch: Partial<OrderRecord> = {};
  const decide = (
    field: "export_item_name" | "export_amount" | "export_delivery_message",
    oldValue: string,
    newValue: string
  ) => {
    if (newValue === "") return;
    const cur = order[field];
    if (cur.trim() === "") {
      patch[field] = newValue;
    } else if (before.length > 0 && cur === oldValue && cur !== newValue) {
      patch[field] = newValue;
    }
  };
  decide("export_item_name", oldM.item, newM.item);
  decide("export_amount", oldM.amount, newM.amount);
  decide("export_delivery_message", oldM.message, newM.message);

  if (Object.keys(patch).length > 0) {
    const updated = await db.update(order.id, patch);
    Object.assign(order, updated);
  }
}
