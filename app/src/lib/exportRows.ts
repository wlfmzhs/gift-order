import { towelQuantityNotes } from "./itemName";
import { mergePayments, parseAmount } from "./paymentMerge";
import { normalizePhone } from "./phone";
import { TOWEL_NONE } from "./towelRules";
import type { OrderRecord, OrderStatus, PaymentRecord } from "./types";

// 체험 패키지 여부는 엑셀 매칭으로 들어온 품목명("[체험]...")으로 판단한다.
const TRIAL_KEYWORD = "[체험]";

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
  kind: "order" | "payment";
  orderId: string | null;
  paymentIds: string[]; // 결제 행이면 이 행을 이루는 결제들
  pairing: Pairing;
  notes: string[];
  isTrial: boolean;
  orderStatus: OrderStatus | null;
  candidates: LinkCandidate[]; // 결제 행에서 연결할 수 있는 같은 연락처 주문서
  meta: OrderNoteMeta | null; // 주문서 행만

  customerName: string; // 안내 문자에 쓰는 받는분 성함
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

  const rows: ExportRow[] = [];

  for (const o of orders) {
    const phoneKey = normalizePhone(o.recipient_phone);
    const samePhoneCount = phoneKey ? (ordersByPhone.get(phoneKey) ?? []).length : 1;
    const myPayments = linked.get(o.id) ?? [];
    const merged = mergePayments(myPayments);
    const meta: OrderNoteMeta = {
      hasPayments: myPayments.length > 0,
      mergedItem: merged.item,
      optionNotes: merged.optionNotes,
      excelAmount: parseAmount(merged.amount),
      samePhoneCount,
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
      candidates: [],
      meta,
      customerName: o.recipient_name,
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
  }

  for (const [groupKey, group] of unlinkedByGroup) {
    const merged = mergePayments(group);
    const phoneKey = group[0].phone_norm;
    const candidates = (phoneKey ? ordersByPhone.get(phoneKey) ?? [] : []).map(
      (o) => ({
        orderId: o.id,
        label: `${o.order_code} · ${o.recipient_name}${
          o.export_item_name.trim() ? " (품목명 있음)" : ""
        }`,
      })
    );

    const notes = [
      NOTE_NO_ORDER,
      ...merged.optionNotes,
      ...towelQuantityNotes(merged.item),
    ];
    if (candidates.length > 1) {
      notes.push(
        `같은 연락처 주문서 ${candidates.length}건 - 연결할 주문서를 골라주세요`
      );
    }

    rows.push({
      key: `pay:${groupKey}`,
      kind: "payment",
      orderId: null,
      paymentIds: group.map((p) => p.id),
      pairing: "no-order",
      notes: clean(notes),
      isTrial: merged.item.includes(TRIAL_KEYWORD),
      orderStatus: null,
      candidates,
      meta: null,
      customerName: group[0].recipient_name,
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

export type RowState = "ok" | "check" | "unpaid" | "no-order";

export function rowState(pairing: Pairing, notes: string[]): RowState {
  if (pairing === "unpaid") return "unpaid";
  if (pairing === "no-order") return "no-order";
  return notes.length > 0 ? "check" : "ok";
}
