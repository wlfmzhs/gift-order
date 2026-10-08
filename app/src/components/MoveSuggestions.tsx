"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { movePaymentAction } from "@/lib/actions/payments";

export interface MoveSuggestion {
  orderId: string;
  orderCode: string;
  name: string;
  phone: string;
  fromCode: string; // 결제가 지금 붙어 있는 (송장 등록된) 주문서
  payments: { id: string; label: string }[];
}

export default function MoveSuggestions({ suggestions }: { suggestions: MoveSuggestion[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (suggestions.length === 0) return null;

  const move = (paymentId: string, orderId: string) =>
    startTransition(async () => {
      const res = await movePaymentAction(paymentId, orderId);
      if (!res.ok) {
        setError(res.message ?? "옮기기에 실패했어요.");
        return;
      }
      setError(null);
      router.refresh();
    });

  return (
    <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        결제가 이미 발송된 주문서에 붙어 있는 건이 {suggestions.length}건 있어요
      </p>
      <p className="mt-1 text-xs text-amber-900/80">
        같은 연락처의 새 주문서에는 결제가 없고, 결제는 송장이 등록된 예전 주문서에 붙어 있어요.
        새 주문서에 해당하는 결제만 골라서 옮겨주세요. (체험 패키지처럼 예전 주문서의 결제는 그대로
        두세요)
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <ul className="mt-2 space-y-2">
        {suggestions.map((s) => (
          <li key={s.orderId} className="rounded-lg bg-surface p-3 text-xs">
            <p className="font-medium">
              {s.name} ({s.phone}) · 새 주문서 {s.orderCode} ← 예전 주문서 {s.fromCode}
            </p>
            <ul className="mt-1 space-y-1">
              {s.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 break-words">{p.label}</span>
                  <button
                    onClick={() => move(p.id, s.orderId)}
                    disabled={isPending}
                    className="shrink-0 rounded-full bg-brand px-3 py-1 text-[11px] font-medium text-white hover:bg-brand-dark disabled:opacity-40"
                  >
                    {s.orderCode}로 옮기기
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
