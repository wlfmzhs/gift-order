import { towelQuantityFromItem, towelQuantityNotes } from "./itemName";
import {
  TRIAL_KEYWORD,
  isTrialItem,
  mergePayments,
  parseAmount,
  partitionPayments,
} from "./paymentMerge";
import { normalizePhone } from "./phone";
import { TOWEL_NONE } from "./towelRules";
import type { OrderRecord, OrderStatus, PaymentRecord } from "./types";

export const NOTE_UNPAID = "결제X 주문서O";
export const NOTE_NO_ORDER = "결제O 주문서X";

export type Pairing = "matched" | "unpaid" | "no-order";

export interface LinkCandidate {
  orderId: string;
  label: string;
}

// 주문서 행의 확인사항을 계산하는 데 필요한 값들. 셀을 고치면 화면에서 바로 다시 계산한다.
export interface OrderNoteMeta {
  hasPayments: boolean; // 엑셀 결제가 연결돼 있는가
  mergedItem: string; // 연결된 결제들을 합친 품목명
  optionNotes: string[]; // 연결된 결제의 옵션 수량 문제
  excelAmount: number | null; // 연결된 결제들의 합계 금액
  samePhoneCount: number; // 같은 연락처의 주문서 수
  towelQuantity: number | null; // 주문서에 고객이 적은 타올 수량
  sameNamePayments: number; // 연락처는 다르지만 이름이 같은, 주문서 없는 결제 수
}

export function evaluateOrderRow(
  meta: OrderNoteMeta,
  itemValue: string,
  amountValue: string
): { pairing: Pairing; notes: string[] } {
  const item = itemValue.trim();
  const amount = amountValue.trim();
  const paid = item !== "" || amount !== "";

  const notes: string[] = [];
  if (!paid) notes.push(NOTE_UNPAID);
  if (paid && item === "") notes.push("품목명 없음");
  notes.push(...towelQuantityNotes(itemValue));
  const paidTowelQty = towelQuantityFromItem(itemValue);
  if (meta.towelQuantity !== null && paidTowelQty !== null && meta.towelQuantity !== paidTowelQty) {
    notes.push(`타올 수량 불일치 (주문서 ${meta.towelQuantity}개 / 결제 ${paidTowelQty}개)`);
  }
  if (!paid && meta.sameNamePayments > 0) {
    notes.push(
      `같은 이름 결제 ${meta.sameNamePayments}건 있음 (연락처 다름) - '결제O 주문서X' 줄에서 연결`
    );
  }

  if (meta.hasPayments) {
    // 품목명을 직접 고쳤다면 옵션 수량 문제는 이미 확인한 것으로 보고 다시 띄우지 않는다.
    if (itemValue === meta.mergedItem) notes.push(...meta.optionNotes);
    const orderAmount = parseAmount(amountValue);
    if (
      meta.excelAmount !== null &&
      orderAmount !== null &&
      meta.excelAmount !== orderAmount
    ) {
      notes.push(`엑셀 금액과 다름 (엑셀 ${meta.excelAmount}원)`);
    }
  }
  if (meta.samePhoneCount > 1) {
    notes.push(`연락처 중복 (같은 연락처 주문서 ${meta.samePhoneCount}건)`);
  }

  return { pairing: paid ? "matched" : "unpaid", notes: clean(notes) };
}

export interface ExportRow {
  key: string;
  // order: 주문서 줄 / trial: 같은 고객의 체험 패키지 분리 줄 / payment: 주문서 없는 결제 줄
  kind: "order" | "payment" | "trial";
  orderId: string | null;
  paymentIds: string[]; // 결제 행이면 이 행을 이루는 결제들
  pairing: Pairing;
  notes: string[];
  isTrial: boolean;
  orderStatus: OrderStatus | null;
  exported: boolean; // 이미 시트로 내보낸 행
  exportPaymentIds: string[]; // 내보내기 처리할 때 표시할 결제들 (주문서 줄은 주문서 자체에 표시하므로 비어 있음)
  candidates: LinkCandidate[]; // 결제 행에서 연결할 수 있는 같은 연락처 주문서
  meta: OrderNoteMeta | null; // 주문서 행만

  customerName: string; // 안내 문자에 쓰는 받는분 성함
  notesAck: string; // 확인완료한 확인사항 (주문서 줄만)
  recipient: string;
  phone: string;
  address: string;
  item: string;
  message: string;
  amount: string;
  birthday: string;
  shipDate: string;
  etc: string;
  label: string;
  towelColor: string;
  embroideryColor: string;
}

// 이름 비교용: 공백을 없애고 비교한다.
function nameKey(name: string | null | undefined): string {
  return String(name ?? "").replace(/\s+/g, "");
}

function clean(list: string[]): string[] {
  return Array.from(new Set(list.filter(Boolean)));
}

// 타올을 구매하지 않으면 시트에는 빈칸으로 둔다.
function towelColorForSheet(color: string | null): string {
  if (!color || color === TOWEL_NONE || color.startsWith("미포함")) return "";
  return color;
}

function embroideryColorForSheet(color: string | null): string {
  if (!color || color.startsWith("해당없음")) return "";
  return color;
}

export function buildExportRows(
  orders: OrderRecord[],
  payments: PaymentRecord[]
): ExportRow[] {
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const ordersByPhone = new Map<string, OrderRecord[]>();
  for (const o of orders) {
    const key = normalizePhone(o.recipient_phone);
    if (!key) continue;
    const arr = ordersByPhone.get(key) ?? [];
    arr.push(o);
    ordersByPhone.set(key, arr);
  }

  const linked = new Map<string, PaymentRecord[]>();
  const unlinkedByGroup = new Map<string, PaymentRecord[]>();
  for (const p of payments) {
    if (p.order_id && orderById.has(p.order_id)) {
      const arr = linked.get(p.order_id) ?? [];
      arr.push(p);
      linked.set(p.order_id, arr);
    } else {
      // 연락처가 같은 미연결 결제는 한 줄로 묶어서 보여준다.
      const groupKey = p.phone_norm ? `phone:${p.phone_norm}` : `id:${p.id}`;
      const arr = unlinkedByGroup.get(groupKey) ?? [];
      arr.push(p);
      unlinkedByGroup.set(groupKey, arr);
    }
  }

  // 연락처가 달라도 이름이 같으면 연결 후보로 제안한다. (자동 연결은 하지 않는다)
  const unpaidOrdersByName = new Map<string, OrderRecord[]>();
  for (const o of orders) {
    if (o.export_item_name.trim() !== "" || o.export_amount.trim() !== "") continue;
    const k = nameKey(o.recipient_name);
    if (!k) continue;
    const arr = unpaidOrdersByName.get(k) ?? [];
    arr.push(o);
    unpaidOrdersByName.set(k, arr);
  }
  const unlinkedGroupsByName = new Map<string, { phoneNorm: string }[]>();
  for (const group of unlinkedByGroup.values()) {
    const k = nameKey(group[0].recipient_name);
    if (!k) continue;
    const arr = unlinkedGroupsByName.get(k) ?? [];
    arr.push({ phoneNorm: group[0].phone_norm });
    unlinkedGroupsByName.set(k, arr);
  }

  // 결제가 하나도 붙지 않았고 품목명·금액도 비어 있는 주문서 (최근 접수순)
  const unpaidOrders = orders
    .filter(
      (o) =>
        !linked.has(o.id) && o.export_item_name.trim() === "" && o.export_amount.trim() === ""
    )
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const rows: ExportRow[] = [];

  for (const o of orders) {
    const phoneKey = normalizePhone(o.recipient_phone);
    const samePhoneCount = phoneKey ? (ordersByPhone.get(phoneKey) ?? []).length : 1;
    const myPayments = linked.get(o.id) ?? [];
    // 체험 패키지와 답례품을 같이 산 고객은 체험을 별도 줄로 나누고, 주문서 줄은 답례품 기준으로 본다.
    const part = partitionPayments(myPayments);
    const merged = mergePayments(part.rep);
    const meta: OrderNoteMeta = {
      hasPayments: myPayments.length > 0,
      mergedItem: merged.item,
      optionNotes: merged.optionNotes,
      excelAmount: parseAmount(merged.amount),
      samePhoneCount,
      towelQuantity: o.towel_quantity ?? null,
      sameNamePayments: (unlinkedGroupsByName.get(nameKey(o.recipient_name)) ?? []).filter(
        (g) => g.phoneNorm !== phoneKey
      ).length,
    };
    const { pairing, notes } = evaluateOrderRow(
      meta,
      o.export_item_name,
      o.export_amount
    );

    rows.push({
      key: `order:${o.id}`,
      kind: "order",
      orderId: o.id,
      paymentIds: myPayments.map((p) => p.id),
      pairing,
      notes,
      isTrial: o.export_item_name.includes(TRIAL_KEYWORD),
      orderStatus: o.status,
      exported: Boolean(o.exported_at),
      exportPaymentIds: [],
      candidates: [],
      meta,
      customerName: o.recipient_name,
      notesAck: o.notes_ack ?? "",
      recipient: o.export_recipient_display,
      phone: o.recipient_phone,
      address: `${o.recipient_address1} ${o.recipient_address2 ?? ""}`.trim(),
      item: o.export_item_name,
      message: o.export_delivery_message,
      amount: o.export_amount,
      birthday: o.export_birthday,
      shipDate: o.ship_date ?? "",
      etc: o.export_etc,
      label: o.label_design,
      towelColor: towelColorForSheet(o.towel_color),
      embroideryColor: embroideryColorForSheet(o.embroidery_color),
    });

    if (part.split) {
      const trialMerged = mergePayments(part.trial);
      rows.push({
        key: `trial:${o.id}`,
        kind: "trial",
        orderId: o.id,
        paymentIds: part.trial.map((p) => p.id),
        pairing: "matched",
        notes: clean(towelQuantityNotes(trialMerged.item)),
        isTrial: true,
        orderStatus: o.status,
        exported: part.trial.length > 0 && part.trial.every((p) => p.exported_at),
        exportPaymentIds: part.trial.map((p) => p.id),
        candidates: [],
        meta: null,
        customerName: o.recipient_name,
        notesAck: "",
        recipient: o.export_recipient_display,
        phone: o.recipient_phone,
        address: `${o.recipient_address1} ${o.recipient_address2 ?? ""}`.trim(),
        item: trialMerged.item,
        message: trialMerged.message,
        amount: trialMerged.amount,
        birthday: "",
        shipDate: o.ship_date ?? "",
        etc: "",
        label: "",
        towelColor: "",
        embroideryColor: "",
      });
    }
  }

  for (const [groupKey, group] of unlinkedByGroup) {
    const phoneKey = group[0].phone_norm;
    const phoneOrders = phoneKey ? ordersByPhone.get(phoneKey) ?? [] : [];
    const phoneOrderIds = new Set(phoneOrders.map((o) => o.id));
    const nameOrders = (unpaidOrdersByName.get(nameKey(group[0].recipient_name)) ?? []).filter(
      (o) => !phoneOrderIds.has(o.id)
    );
    // 이름·연락처가 모두 달라도(결제자와 주문서 작성자가 다른 경우) 직접 고를 수 있도록,
    // 아직 결제가 붙지 않은 나머지 주문서도 후보로 보여준다.
    const shown = new Set([...phoneOrders, ...nameOrders].map((o) => o.id));
    const otherUnpaid = unpaidOrders.filter((o) => !shown.has(o.id));
    const candidates = [
      ...phoneOrders.map((o) => ({
        orderId: o.id,
        label: `${o.order_code} · ${o.recipient_name}${
          o.export_item_name.trim() ? " (품목명 있음)" : ""
        }`,
      })),
      ...nameOrders.map((o) => ({
        orderId: o.id,
        label: `${o.order_code} · ${o.recipient_name} (이름 같음, 연락처 ${o.recipient_phone})`,
      })),
      ...otherUnpaid.map((o) => ({
        orderId: o.id,
        label: `${o.order_code} · ${o.recipient_name} (연락처 ${o.recipient_phone}) - 결제 없는 주문서`,
      })),
    ];

    // 체험과 답례품을 같이 결제했으면 줄을 나눈다. (연결은 어느 줄에서 해도 같은 고객의 결제 전체에 적용)
    const part = partitionPayments(group);
    const subsets = part.split ? [part.regular, part.trial] : [group];

    for (const subset of subsets) {
      const merged = mergePayments(subset);
      const notes = [
        NOTE_NO_ORDER,
        ...merged.optionNotes,
        ...towelQuantityNotes(merged.item),
      ];
      if (phoneOrders.length > 1) {
        notes.push(
          `같은 연락처 주문서 ${phoneOrders.length}건 - 연결할 주문서를 골라주세요`
        );
      }
      if (nameOrders.length > 0) {
        notes.push(
          `연락처는 다르지만 이름이 같은 주문서 ${nameOrders.length}건 있음 - 맞는지 확인하고 연결해주세요`
        );
      }

      rows.push({
        key: `pay:${groupKey}${part.split ? (isTrialItem(merged.item) ? ":trial" : ":regular") : ""}`,
        kind: "payment",
        orderId: null,
        paymentIds: group.map((p) => p.id),
        pairing: "no-order",
        notes: clean(notes),
        isTrial: isTrialItem(merged.item),
        orderStatus: null,
        exported: subset.length > 0 && subset.every((p) => p.exported_at),
        exportPaymentIds: subset.map((p) => p.id),
        candidates,
        meta: null,
        customerName: group[0].recipient_name,
        notesAck: "",
        recipient: group[0].recipient_name,
        phone: group[0].phone,
        address: "",
        item: merged.item,
        message: merged.message,
        amount: merged.amount,
        birthday: "",
        shipDate: "",
        etc: "",
        label: "",
        towelColor: "",
        embroideryColor: "",
      });
    }
  }

  return sortExportRows(rows, orders);
}

/**
 * 체험 패키지는 발송일과 상관없이 맨 위, 나머지는 발송일이 빠른 순.
 * 발송일이 없는 행(결제만 있는 행 등)은 각 그룹의 맨 아래.
 */
function sortExportRows(rows: ExportRow[], orders: OrderRecord[]): ExportRow[] {
  const createdAt = new Map(orders.map((o) => [o.id, o.created_at]));
  const withIndex = rows.map((r, i) => ({ r, i }));
  withIndex.sort((a, b) => {
    if (a.r.isTrial !== b.r.isTrial) return a.r.isTrial ? -1 : 1;
    const da = a.r.shipDate || "9999-99-99";
    const dbb = b.r.shipDate || "9999-99-99";
    if (da !== dbb) return da < dbb ? -1 : 1;
    const ca = (a.r.orderId && createdAt.get(a.r.orderId)) || "";
    const cb = (b.r.orderId && createdAt.get(b.r.orderId)) || "";
    if (ca !== cb) return ca < cb ? -1 : 1;
    return a.i - b.i;
  });
  return withIndex.map((x) => x.r);
}

// 확인사항을 "확인완료"로 표시하면 그때의 확인사항 목록을 저장해 두고,
// 목록이 그대로인 동안만 해결된 것으로 본다. (새 문제가 생기거나 내용이 바뀌면 다시 나타남)
export function notesSignature(notes: string[]): string {
  return notes.join("|");
}

export function isAcked(ack: string, notes: string[]): boolean {
  return ack !== "" && notes.length > 0 && ack === notesSignature(notes);
}

export type RowState = "ok" | "check" | "unpaid" | "no-order";

export function rowState(pairing: Pairing, notes: string[], acked = false): RowState {
  if (acked) return "ok";
  if (pairing === "unpaid") return "unpaid";
  if (pairing === "no-order") return "no-order";
  return notes.length > 0 ? "check" : "ok";
}
