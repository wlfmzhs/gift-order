import { db, paymentsDb } from "./db";
import { isTrialOnlyValue, mergePayments, partitionPayments } from "./paymentMerge";
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

  // 3) 체험 패키지와 답례품을 같이 결제한 고객: 주문서에 체험 값만 남아 있으면 답례품 값으로 바로잡는다.
  const linkedByOrder = new Map<string, PaymentRecord[]>();
  for (const p of paymentList) {
    if (!p.order_id) continue;
    const arr = linkedByOrder.get(p.order_id) ?? [];
    arr.push(p);
    linkedByOrder.set(p.order_id, arr);
  }
  for (const [orderId, list] of linkedByOrder) {
    const order = orderById.get(orderId);
    if (!order) continue;
    // 결제는 연결돼 있는데 주문서의 품목명·금액이 모두 비어 있으면(연결 뒤에 값이 지워진 경우 등) 다시 채운다.
    const emptied = order.export_item_name.trim() === "" && order.export_amount.trim() === "";
    if (!emptied && !partitionPayments(list).split) continue;
    await syncOrderFromPayments(order, list, list);
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
  await syncOrderFromPayments(order, before, [...before, ...toLink]);
}

/**
 * 주문서의 품목명/금액/배송메모를 연결된 결제에 맞춰 채운다.
 * 주문서 줄은 "대표 결제"(일반 결제가 있으면 일반만, 체험뿐이면 체험)를 나타낸다.
 * 체험은 시트에서 별도 줄로 나오기 때문이다.
 */
async function syncOrderFromPayments(
  order: OrderRecord,
  before: PaymentRecord[],
  after: PaymentRecord[]
): Promise<void> {
  const oldM = mergePayments(partitionPayments(before).rep);
  const pa = partitionPayments(after);
  const newM = mergePayments(pa.rep);
  // 예전에 체험 결제만 반영해 둔 값이 남아 있는데 이제 답례품 결제도 있는 경우
  const staleTrial = pa.split && isTrialOnlyValue(order.export_item_name);

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
    } else if (staleTrial && cur !== newValue) {
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
