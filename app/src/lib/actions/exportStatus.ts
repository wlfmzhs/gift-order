"use server";

import { requireAdmin } from "@/lib/adminSession";
import { db, paymentsDb } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

export interface ExportTarget {
  orderId: string | null;
  paymentIds: string[];
}

export interface MarkExportedResult {
  ok: boolean;
  message?: string;
  matchedPhones?: number;
  unmatchedPhones?: string[];
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "처리 중 오류가 발생했습니다.";
  return msg.includes("exported_at")
    ? "Supabase에서 exported_at 칸을 추가하는 SQL을 먼저 실행해주세요. (supabase/schema.sql 맨 아래 참고)"
    : msg;
}

/** 선택한 행들을 내보내기 완료(또는 내보내기 전)로 표시한다. */
export async function setExportedAction(
  targets: ExportTarget[],
  exported: boolean
): Promise<MarkExportedResult> {
  try {
    await requireAdmin();
    const at = exported ? new Date().toISOString() : null;
    const orderIds = new Set(targets.map((t) => t.orderId).filter((v): v is string => !!v));
    const paymentIds = new Set(targets.flatMap((t) => t.paymentIds));
    for (const id of orderIds) await db.update(id, { exported_at: at });
    for (const id of paymentIds) await paymentsDb.update(id, { exported_at: at });
    return { ok: true };
  } catch (err) {
    return { ok: false, message: friendlyError(err) };
  }
}

/**
 * 이미 스프레드시트에 옮겨 둔 목록을 붙여넣으면, 그 안의 전화번호와 같은 주문/결제를
 * 모두 "내보내기 완료"로 표시한다.
 */
export async function markExportedByPastedListAction(text: string): Promise<MarkExportedResult> {
  try {
    await requireAdmin();
    const found = new Set<string>();
    for (const m of text.matchAll(/(?:\+?82[-\s]?)?0?1[0-9][-\s.]?\d{3,4}[-\s.]?\d{4}/g)) {
      const n = normalizePhone(m[0]);
      if (n.length >= 10) found.add(n);
    }
    if (found.size === 0) return { ok: false, message: "붙여넣은 내용에서 전화번호를 찾지 못했어요." };

    const [orders, payments] = await Promise.all([db.list(), paymentsDb.list()]);
    const at = new Date().toISOString();
    const hit = new Set<string>();
    for (const o of orders) {
      const n = normalizePhone(o.recipient_phone);
      if (!found.has(n)) continue;
      hit.add(n);
      if (!o.exported_at) await db.update(o.id, { exported_at: at });
    }
    for (const p of payments) {
      if (!found.has(p.phone_norm)) continue;
      hit.add(p.phone_norm);
      if (!p.exported_at) await paymentsDb.update(p.id, { exported_at: at });
    }
    return {
      ok: true,
      matchedPhones: hit.size,
      unmatchedPhones: Array.from(found).filter((n) => !hit.has(n)),
    };
  } catch (err) {
    return { ok: false, message: friendlyError(err) };
  }
}
