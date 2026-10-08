"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restorePaymentAction } from "@/lib/actions/payments";
import type { PaymentRecord } from "@/lib/types";

export default function IgnoredPayments({ payments }: { payments: PaymentRecord[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const restore = (id: string) =>
    startTransition(async () => {
      const res = await restorePaymentAction(id);
      if (!res.ok) {
        setError(res.message ?? "복구에 실패했어요.");
        return;
      }
      setError(null);
      router.refresh();
    });

  return (
    <details className="rounded-2xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        삭제한 결제 {payments.length}건 (복구하기)
      </summary>
      <p className="mt-2 text-xs text-muted">
        전에 &apos;삭제&apos;로 숨긴 결제예요. 복구하면 다시 목록에 나타나고, 연락처가 같은 주문서가
        있으면 자동으로 연결돼요.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <ul className="mt-2 max-h-60 space-y-1 overflow-auto text-xs">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center gap-2 border-b border-border py-1">
            <span className="min-w-0 flex-1">
              {p.recipient_name} · {p.phone} · {p.item_name} · {p.amount}
            </span>
            <button
              onClick={() => restore(p.id)}
              disabled={isPending}
              className="rounded-full border border-brand px-2.5 py-0.5 text-[11px] font-medium text-brand hover:bg-brand hover:text-white disabled:opacity-40"
            >
              복구
            </button>
          </li>
        ))}
        {payments.length === 0 && <li className="text-muted">삭제한 결제가 없어요.</li>}
      </ul>
    </details>
  );
}
