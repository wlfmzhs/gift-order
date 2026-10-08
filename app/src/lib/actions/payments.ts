"use server";

import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/adminSession";
import { db, paymentsDb } from "@/lib/db";
import { TOWEL_PICK_MARK, formatItemName } from "@/lib/itemName";
import { normalizePhone } from "@/lib/phone";
import { linkPaymentsToOrder } from "@/lib/reconcile";
import type { NewPaymentInput } from "@/lib/types";

const HEADER_ALIASES: Record<string, string[]> = {
  recipient_name: ["배송지 이름", "받는분 이름", "받는사람", "받는분성명"],
  phone: ["주문자 휴대폰 번호", "주문자 휴대폰번호", "휴대폰 번호", "연락처"],
  item_name: ["상품 옵션 정보", "상품명", "옵션정보"],
  amount: ["결제 금액", "결제금액", "금액"],
  quantity: ["수량", "주문수량", "구매수량"],
  status: ["상품별 주문 상태", "주문상태"],
  delivery_message: ["배송 메모", "배송메세지", "배송메모"],
  order_no: ["주문번호", "상품주문번호", "주문 번호"],
  extra_option: ["추가 옵션 정보", "추가옵션정보", "추가 옵션"],
};

const CANCELLED_KEYWORDS = ["취소", "환불", "반품"];

function findHeaderIndex(headerRow: string[], aliases: string[]): number {
  return headerRow.findIndex((h) => aliases.includes(String(h).trim()));
}

export interface ImportPaymentsResult {
  ok: true;
  added: number; // 새로 저장된 결제
  alreadyStored: number; // 이전에 올린 엑셀에 이미 있던 결제
  duplicateInFile: number; // 같은 파일 안에서 완전히 똑같아 합친 행
  cancelledSkipped: number; // 취소/환불로 제외한 행
  cancelledRemoved: number; // 이전에 저장했던 결제 중 이번에 취소된 건
  cancelledOnOrders: string[]; // 취소된 결제 중 이미 주문서에 반영돼 있던 건 (직접 확인 필요)
}

export interface ImportPaymentsError {
  ok: false;
  message: string;
}

/**
 * 홈페이지 결제 엑셀을 읽어 결제 내역에 누적 저장한다.
 * 주문서와의 연결(매칭)은 시트 내보내기 화면을 열 때 연락처로 자동 처리된다.
 */
export async function importPaymentsAction(
  formData: FormData
): Promise<ImportPaymentsResult | ImportPaymentsError> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: "관리자 인증이 필요합니다." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, message: "파일을 선택해주세요." };
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    return { ok: false, message: "엑셀 파일을 읽을 수 없습니다. 파일 형식을 확인해주세요." };
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    return { ok: false, message: "시트를 찾을 수 없습니다." };
  }

  const raw = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as string[][];

  if (raw.length < 2) {
    return { ok: false, message: "데이터가 없는 파일입니다." };
  }

  const headerRow = raw[0].map((h) => String(h).trim());
  const col = {
    recipient_name: findHeaderIndex(headerRow, HEADER_ALIASES.recipient_name),
    phone: findHeaderIndex(headerRow, HEADER_ALIASES.phone),
    item_name: findHeaderIndex(headerRow, HEADER_ALIASES.item_name),
    amount: findHeaderIndex(headerRow, HEADER_ALIASES.amount),
    quantity: findHeaderIndex(headerRow, HEADER_ALIASES.quantity),
    status: findHeaderIndex(headerRow, HEADER_ALIASES.status),
    delivery_message: findHeaderIndex(headerRow, HEADER_ALIASES.delivery_message),
    order_no: findHeaderIndex(headerRow, HEADER_ALIASES.order_no),
    extra_option: findHeaderIndex(headerRow, HEADER_ALIASES.extra_option),
  };

  if (col.recipient_name === -1 || col.phone === -1) {
    return {
      ok: false,
      message:
        "엑셀에서 '배송지 이름' 또는 '주문자 휴대폰 번호' 컬럼을 찾지 못했습니다. 홈페이지에서 내려받은 원본 파일인지 확인해주세요.",
    };
  }

  const cell = (line: string[], idx: number) =>
    idx !== -1 ? String(line[idx] ?? "").trim() : "";

  const active = new Map<string, NewPaymentInput>();
  const cancelledKeys = new Set<string>();
  let duplicateInFile = 0;
  let cancelledSkipped = 0;

  for (let i = 1; i < raw.length; i++) {
    const line = raw[i];
    if (!line || line.every((c) => String(c).trim() === "")) continue;

    const rawItemName = cell(line, col.item_name);
    const item = rawItemName
      ? col.quantity !== -1
        ? formatItemName(rawItemName, String(line[col.quantity] ?? ""))
        : { name: rawItemName, optionNote: "" }
      : { name: "", optionNote: "" };

    const phone = cell(line, col.phone);
    const phoneNorm = normalizePhone(phone);
    const recipientName = cell(line, col.recipient_name);
    const amount = cell(line, col.amount);
    const deliveryMessage = cell(line, col.delivery_message);

    // 완전히 같은 결제(같은 주문번호·사람·상품·금액)는 겹치는 엑셀을 여러 번 올려도 한 번만 저장한다.
    const dedupeKey = [
      cell(line, col.order_no),
      phoneNorm,
      recipientName,
      item.name,
      amount,
      deliveryMessage,
    ].join("|");

    // 같은 결제를 가리키는 키는 별표를 붙이기 전 품목명으로 만든다. (엑셀 열이 늘어도 중복 저장되지 않게)
    const towelPick = /세면타올선택\s*:\s*세면타올/.test(cell(line, col.extra_option));
    const itemNameForSheet =
      towelPick && item.name && !item.name.endsWith(TOWEL_PICK_MARK)
        ? `${item.name}${TOWEL_PICK_MARK}`
        : item.name;

    const status = cell(line, col.status);
    if (CANCELLED_KEYWORDS.some((kw) => status.includes(kw))) {
      cancelledSkipped++;
      cancelledKeys.add(dedupeKey);
      continue;
    }

    if (active.has(dedupeKey)) {
      duplicateInFile++;
      continue;
    }
    active.set(dedupeKey, {
      dedupe_key: dedupeKey,
      recipient_name: recipientName,
      phone,
      phone_norm: phoneNorm,
      item_name: itemNameForSheet,
      amount,
      delivery_message: deliveryMessage,
      option_note: item.optionNote,
      order_id: null,
    });
  }

  try {
    // 이전에 저장해 둔 결제가 이번 엑셀에서 취소됐다면 결제 내역에서 뺀다.
    // (같은 내용의 정상 결제가 이번 파일에 따로 있으면 건드리지 않는다.)
    const keysToRemove = Array.from(cancelledKeys).filter((k) => !active.has(k));
    const removed = keysToRemove.length > 0 ? await paymentsDb.deleteByKeys(keysToRemove) : [];

    let cancelledOnOrders: string[] = [];
    const linkedRemoved = removed.filter((p) => p.order_id);
    if (linkedRemoved.length > 0) {
      const orders = await db.list();
      const byId = new Map(orders.map((o) => [o.id, o]));
      cancelledOnOrders = Array.from(
        new Set(
          linkedRemoved.map((p) => {
            const o = byId.get(p.order_id as string);
            return `${p.recipient_name || o?.recipient_name || ""} (${o?.order_code ?? "삭제된 주문서"}) ${p.item_name}`.trim();
          })
        )
      );
    }

    // 이미 저장된 결제의 품목명이 달라졌으면(예: 세면타올 표시가 새로 붙음) 바꿔 주고, 연결된 주문서의 품목명에도 반영한다.
    const stored = new Map((await paymentsDb.list()).map((p) => [p.dedupe_key, p]));
    for (const [key, next] of active) {
      const prev = stored.get(key);
      // 표시를 새로 붙이는 경우만 바꾼다. (표시 없는 예전 엑셀을 다시 올려도 표시가 지워지지 않게)
      if (!prev || prev.item_name === next.item_name) continue;
      if (!next.item_name.endsWith(TOWEL_PICK_MARK) || prev.item_name.endsWith(TOWEL_PICK_MARK)) continue;
      await paymentsDb.update(prev.id, { item_name: next.item_name });
      if (prev.order_id && prev.item_name) {
        const order = await db.getById(prev.order_id);
        if (order && order.export_item_name.includes(prev.item_name)) {
          await db.update(order.id, {
            export_item_name: order.export_item_name.replace(prev.item_name, next.item_name),
          });
        }
      }
    }

    const inserted = await paymentsDb.insertMany(Array.from(active.values()));

    return {
      ok: true,
      added: inserted.length,
      alreadyStored: active.size - inserted.length,
      duplicateInFile,
      cancelledSkipped,
      cancelledRemoved: removed.length,
      cancelledOnOrders,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `결제 내역 저장 중 오류가 발생했습니다: ${err.message}`
          : "결제 내역 저장 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 주문서와 연결되지 않은 결제를 목록에서 삭제한다.
 * 기록은 지우지 않고 숨김 표시만 해서, 같은 엑셀을 다시 올려도 되살아나지 않는다.
 */
export async function ignorePaymentsAction(
  paymentIds: string[],
  allowLinked = false // 주문서에 연결된 체험 패키지 줄을 지울 때만 true
): Promise<{ ok: boolean; message?: string }> {
  try {
    await requireAdmin();
    const payments = await paymentsDb.list();
    const ids = new Set(paymentIds);
    const targets = payments.filter((p) => ids.has(p.id));
    if (targets.length === 0) return { ok: false, message: "삭제할 결제 내역을 찾을 수 없습니다." };
    if (!allowLinked && targets.some((p) => p.order_id)) {
      return { ok: false, message: "이미 주문서에 연결된 결제는 삭제할 수 없습니다." };
    }
    for (const p of targets) await paymentsDb.update(p.id, { ignored: true });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.";
    return {
      ok: false,
      message: msg.includes("ignored")
        ? "Supabase에서 payments 테이블에 ignored 칸을 추가하는 SQL을 먼저 실행해주세요. (supabase/schema.sql 맨 아래 참고)"
        : msg,
    };
  }
}

/** 같은 연락처의 주문서가 여러 건일 때, 결제를 어느 주문서에 붙일지 직접 정한다. */
export async function linkPaymentsAction(
  orderId: string,
  paymentIds: string[]
): Promise<{ ok: boolean; message?: string }> {
  try {
    await requireAdmin();
    const [order, payments] = await Promise.all([db.getById(orderId), paymentsDb.list()]);
    if (!order) return { ok: false, message: "주문서를 찾을 수 없습니다." };
    const ids = new Set(paymentIds);
    const toLink = payments.filter((p) => ids.has(p.id) && !p.order_id);
    if (toLink.length === 0) return { ok: false, message: "연결할 결제 내역을 찾을 수 없습니다." };
    await linkPaymentsToOrder(order, toLink, payments);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "연결 중 오류가 발생했습니다.",
    };
  }
}

/** 삭제(숨김)했던 결제를 다시 목록에 되살린다. */
export async function restorePaymentAction(
  paymentId: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    await requireAdmin();
    await paymentsDb.update(paymentId, { ignored: false });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "복구 중 오류가 발생했습니다.",
    };
  }
}
