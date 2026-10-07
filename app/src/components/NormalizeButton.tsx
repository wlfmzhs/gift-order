"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  normalizeExistingOrdersAction,
  type NormalizeResult,
} from "@/lib/actions/maintenance";

export default function NormalizeButton() {
  const router = useRouter();
  const [result, setResult] = useState<NormalizeResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (
      !window.confirm(
        "저장된 모든 주문의 받는분성명을 '받는분 성함 (표시이름)' 형식으로 다시 만들고, 품목명 앞부분(패키지 수량 선택: 24. 등)을 정리합니다.\n\n시트에서 직접 고쳐 둔 받는분성명도 새 형식으로 덮어써집니다. 진행할까요?"
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const res = await normalizeExistingOrdersAction();
      setResult(res);
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold">기존 주문 일괄 정리</h2>
        <button
          onClick={handleClick}
          disabled={isPending}
          className="rounded-full border border-brand px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white disabled:opacity-50"
        >
          {isPending ? "정리 중..." : "받는분성명·품목명 다시 정리"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        이미 접수된 주문의 받는분성명(예: 임인순 (이채은 Lee Chae eun))과 품목명(예: [체험] 2종
        핸드솝+주방세제)을 현재 규칙으로 한 번에 맞춰요. 여러 번 눌러도 결과는 같아요.
      </p>
      {result && !result.ok && (
        <p className="mt-2 text-sm text-red-600">{result.message}</p>
      )}
      {result?.ok && (
        <div className="mt-2 text-sm text-green-700">
          <p>
            받는분성명 {result.recipientUpdated}건, 품목명 {result.itemUpdated}건을 고쳤어요.
          </p>
          {result.itemStillRaw && result.itemStillRaw.length > 0 && (
            <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 font-medium text-red-600">
              구매 구간(예: 50~99개)이 그대로 남아 있어 수량을 알 수 없는 품목명 {result.itemStillRaw.length}건은
              직접 고쳐주세요: {result.itemStillRaw.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
