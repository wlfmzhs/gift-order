"use server";

import { requireAdmin } from "@/lib/adminSession";
import { db } from "@/lib/db";
import { computeExportDefaults } from "@/lib/exportDefaults";
import { cleanSavedItemName } from "@/lib/itemName";
import type { OrderRecord } from "@/lib/types";

export interface NormalizeResult {
  ok: boolean;
  message?: string;
  recipientUpdated?: number;
  itemUpdated?: number;
  itemStillRaw?: string[]; // 구매 구간이 남아 있어 직접 고쳐야 하는 품목명 (주문번호 · 품목명)
}

/**
 * 이미 저장된 모든 주문서를 현재 규칙으로 다시 정리한다. (여러 번 실행해도 결과가 같다)
 * - 받는분성명: "받는분 성함 (표시이름)" 형식으로 다시 계산 → 시트에서 직접 고친 값도 덮어쓴다.
 * - 품목명: "패키지 수량 선택: 24. " 같은 앞부분 제거, 체험 패키지는 공백 정리.
 */
export async function normalizeExistingOrdersAction(): Promise<NormalizeResult> {
  try {
    await requireAdmin();
    const orders = await db.list();
    let recipientUpdated = 0;
    let itemUpdated = 0;
    const itemStillRaw: string[] = [];

    for (const o of orders) {
      const patch: Partial<OrderRecord> = {};

      const display = computeExportDefaults(o).export_recipient_display;
      if (display !== o.export_recipient_display) {
        patch.export_recipient_display = display;
        recipientUpdated++;
      }

      if (o.export_item_name.trim() !== "") {
        const cleaned = cleanSavedItemName(o.export_item_name);
        if (cleaned.name !== o.export_item_name) {
          patch.export_item_name = cleaned.name;
          itemUpdated++;
        }
        if (cleaned.stillRaw) itemStillRaw.push(`${o.order_code} · ${cleaned.name}`);
      }

      if (Object.keys(patch).length > 0) await db.update(o.id, patch);
    }

    return { ok: true, recipientUpdated, itemUpdated, itemStillRaw };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "정리 중 오류가 발생했습니다.",
    };
  }
}
