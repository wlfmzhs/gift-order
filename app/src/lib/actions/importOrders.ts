"use server";

import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/adminSession";
import { db } from "@/lib/db";
import type { OrderRecord } from "@/lib/types";

const HEADER_ALIASES: Record<string, string[]> = {
  recipient_name: ["배송지 이름", "받는분 이름", "받는사람", "받는분성명"],
  phone: ["주문자 휴대폰 번호", "주문자 휴대폰번호", "휴대폰 번호", "연락처"],
  item_name: ["상품 옵션 정보", "상품명", "옵션정보"],
  amount: ["결제 금액", "결제금액", "금액"],
  status: ["상품별 주문 상태", "주문상태"],
  delivery_message: ["배송 메모", "배송메세지", "배송메모"],
};

const CANCELLED_KEYWORDS = ["취소", "환불", "반품"];

function normalizePhone(value: string): string {
  return String(value ?? "").replace(/\D/g, "");
}

function findHeaderIndex(headerRow: string[], aliases: string[]): number {
  return headerRow.findIndex((h) => aliases.includes(String(h).trim()));
}

interface ParsedLine {
  rowIndex: number;
  excelRecipientName: string;
  excelPhone: string;
  excelItemName: string;
  excelAmount: string;
  excelDeliveryMessage: string;
  excelStatus: string;
}

export interface ImportCandidate {
  orderId: string;
  orderCode: string;
  recipientName: string;
  recipientPhone: string;
  hasExistingItemName: boolean;
}

export interface ImportRow {
  key: string;
  rowIndexes: number[];
  mergedRowCount: number;
  excelRecipientName: string;
  excelPhone: string;
  excelItemName: string;
  excelAmount: string;
  excelDeliveryMessage: string;
  excelStatus: string;
  candidates: ImportCandidate[];
}

export interface ImportPreviewResult {
  ok: true;
  rows: ImportRow[];
  skippedCancelledCount: number;
  exactDuplicateCount: number;
  stillUnmatchedOrders: {
    orderId: string;
    orderCode: string;
    recipientName: string;
    recipientPhone: string;
  }[];
}

export interface ImportPreviewError {
  ok: false;
  message: string;
}

function toCandidate(o: OrderRecord): ImportCandidate {
  return {
    orderId: o.id,
    orderCode: o.order_code,
    recipientName: o.recipient_name,
    recipientPhone: o.recipient_phone,
    hasExistingItemName: o.export_item_name.trim() !== "",
  };
}

export async function previewHomepageImportAction(
  formData: FormData
): Promise<ImportPreviewResult | ImportPreviewError> {
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
    status: findHeaderIndex(headerRow, HEADER_ALIASES.status),
    delivery_message: findHeaderIndex(headerRow, HEADER_ALIASES.delivery_message),
  };

  if (col.recipient_name === -1 || col.phone === -1) {
    return {
      ok: false,
      message:
        "엑셀에서 '배송지 이름' 또는 '주문자 휴대폰 번호' 컬럼을 찾지 못했습니다. 홈페이지에서 내려받은 원본 파일인지 확인해주세요.",
    };
  }

  // 1) 엑셀 행 파싱 (취소/환불 건 제외)
  const parsedLines: ParsedLine[] = [];
  let skippedCancelledCount = 0;

  for (let i = 1; i < raw.length; i++) {
    const line = raw[i];
    if (!line || line.every((c) => String(c).trim() === "")) continue;

    const excelStatus = col.status !== -1 ? String(line[col.status] ?? "").trim() : "";
    if (CANCELLED_KEYWORDS.some((kw) => excelStatus.includes(kw))) {
      skippedCancelledCount++;
      continue;
    }

    parsedLines.push({
      rowIndex: i,
      excelRecipientName: String(line[col.recipient_name] ?? "").trim(),
      excelPhone: String(line[col.phone] ?? "").trim(),
      excelItemName:
        col.item_name !== -1 ? String(line[col.item_name] ?? "").trim() : "",
      excelAmount: col.amount !== -1 ? String(line[col.amount] ?? "").trim() : "",
      excelDeliveryMessage:
        col.delivery_message !== -1
          ? String(line[col.delivery_message] ?? "").trim()
          : "",
      excelStatus,
    });
  }

  // 2) 완전히 동일한 행(같은 사람/같은 상품/같은 금액)은 파일 중복으로 보고 하나로 합침
  const seenExact = new Set<string>();
  const dedupedLines: ParsedLine[] = [];
  let exactDuplicateCount = 0;

  for (const line of parsedLines) {
    const dupKey = [
      normalizePhone(line.excelPhone),
      line.excelRecipientName,
      line.excelItemName,
      line.excelAmount,
      line.excelDeliveryMessage,
    ].join("|");
    if (seenExact.has(dupKey)) {
      exactDuplicateCount++;
      continue;
    }
    seenExact.add(dupKey);
    dedupedLines.push(line);
  }

  // 3) 연락처 기준으로 기존 주문서와 매칭
  const allOrders = await db.list();
  const ordersByPhone = new Map<string, OrderRecord[]>();
  for (const o of allOrders) {
    const key = normalizePhone(o.recipient_phone);
    if (!key) continue;
    const arr = ordersByPhone.get(key) ?? [];
    arr.push(o);
    ordersByPhone.set(key, arr);
  }

  const matchedOrderIds = new Set<string>();
  const singleMatchGroups = new Map<string, ParsedLine[]>();
  const otherRows: ImportRow[] = [];

  for (const line of dedupedLines) {
    const phoneKey = normalizePhone(line.excelPhone);
    const matches = phoneKey ? ordersByPhone.get(phoneKey) ?? [] : [];
    matches.forEach((o) => matchedOrderIds.add(o.id));

    if (matches.length === 1) {
      // 같은 주문에 매칭되는 엑셀 행이 여러 개면(추가상품 등) 아래에서 합침
      const arr = singleMatchGroups.get(matches[0].id) ?? [];
      arr.push(line);
      singleMatchGroups.set(matches[0].id, arr);
    } else {
      otherRows.push({
        key: `row-${line.rowIndex}`,
        rowIndexes: [line.rowIndex],
        mergedRowCount: 1,
        excelRecipientName: line.excelRecipientName,
        excelPhone: line.excelPhone,
        excelItemName: line.excelItemName,
        excelAmount: line.excelAmount,
        excelDeliveryMessage: line.excelDeliveryMessage,
        excelStatus: line.excelStatus,
        candidates: matches.map(toCandidate),
      });
    }
  }

  // 4) 한 주문에 엑셀 행이 여러 개 매칭되면(상품 여러 줄) 품목명은 합치고 금액은 합산
  const mergedRows: ImportRow[] = [];
  for (const [orderId, lines] of singleMatchGroups) {
    const order = allOrders.find((o) => o.id === orderId)!;
    const itemNames = Array.from(
      new Set(lines.map((l) => l.excelItemName).filter(Boolean))
    );
    const amountSum = lines.reduce((sum, l) => {
      const n = parseInt(l.excelAmount.replace(/\D/g, ""), 10);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const deliveryMessages = Array.from(
      new Set(lines.map((l) => l.excelDeliveryMessage).filter(Boolean))
    );

    mergedRows.push({
      key: orderId,
      rowIndexes: lines.map((l) => l.rowIndex),
      mergedRowCount: lines.length,
      excelRecipientName: lines[0].excelRecipientName,
      excelPhone: lines[0].excelPhone,
      excelItemName: itemNames.join(" + "),
      excelAmount: String(amountSum),
      excelDeliveryMessage: deliveryMessages.join(" / "),
      excelStatus: lines[0].excelStatus,
      candidates: [toCandidate(order)],
    });
  }

  const rows = [...mergedRows, ...otherRows].sort(
    (a, b) => a.rowIndexes[0] - b.rowIndexes[0]
  );

  const stillUnmatchedOrders = allOrders
    .filter((o) => !matchedOrderIds.has(o.id) && o.export_item_name.trim() === "")
    .map((o) => ({
      orderId: o.id,
      orderCode: o.order_code,
      recipientName: o.recipient_name,
      recipientPhone: o.recipient_phone,
    }));

  return {
    ok: true,
    rows,
    skippedCancelledCount,
    exactDuplicateCount,
    stillUnmatchedOrders,
  };
}

export interface ApplyMatch {
  orderId: string;
  export_item_name: string;
  export_amount: string;
  export_delivery_message: string;
}

export async function applyHomepageImportAction(
  matches: ApplyMatch[]
): Promise<{ ok: boolean; message?: string; appliedCount?: number }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: "관리자 인증이 필요합니다." };
  }

  let appliedCount = 0;
  for (const m of matches) {
    await db.update(m.orderId, {
      export_item_name: m.export_item_name,
      export_amount: m.export_amount,
      ...(m.export_delivery_message.trim() !== ""
        ? { export_delivery_message: m.export_delivery_message }
        : {}),
    });
    appliedCount++;
  }

  return { ok: true, appliedCount };
}
