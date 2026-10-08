"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  diagnosePhoneAction,
  movePaymentAction,
  type DiagnoseResult,
} from "@/lib/actions/diagnose";

export default function DiagnosePhone() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [target, setTarget] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const res = await diagnosePhoneAction(phone);
      setError(res.ok ? null : (res.message ?? "조회에 실패했어요."));
      setResult(res);
    });

  const move = (paymentId: string) =>
    startTransition(async () => {
      const res = await movePaymentAction(paymentId, target[paymentId]);
      if (!res.ok) {
        setError(res.message ?? "옮기기에 실패했어요.");
        return;
      }
      const fresh = await diagnosePhoneAction(phone);
      setResult(fresh);
      setError(null);
      router.refresh();
    });

  return (
    <details className="rounded-2xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        연락처로 주문·결제 연결 상태 확인 / 결제 옮기기
      </summary>
      <p className="mt-2 text-xs text-muted">
        매칭이 안 되는 고객의 연락처를 넣으면, 그 번호의 주문서와 결제가 어떻게 저장돼 있는지
        보여줘요. 결제가 엉뚱한 주문서에 붙어 있으면 여기서 다른 주문서로 옮길 수 있어요.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="010-0000-0000"
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button
          onClick={run}
          disabled={isPending || phone.trim() === ""}
          className="rounded-full border border-brand px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white disabled:opacity-50"
        >
          {isPending ? "처리 중..." : "조회"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {result?.ok && (
        <div className="mt-2 space-y-2 text-xs">
          <div>
            <p className="font-semibold">주문서 {result.orders.length}건</p>
            <ul className="mt-1 space-y-1">
              {result.orders.map((o) => (
                <li key={o.id} className="break-words rounded bg-background p-1.5">
                  {o.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold">결제 {result.payments.length}건</p>
            <ul className="mt-1 space-y-1">
              {result.payments.map((p) => {
                const others = result.orders.filter((o) => o.id !== p.orderId);
                return (
                  <li key={p.id} className="break-words rounded bg-background p-1.5">
                    <div>{p.label}</div>
                    {others.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <select
                          className="max-w-[22rem] rounded border border-border bg-surface px-1 py-0.5"
                          value={target[p.id] ?? ""}
                          onChange={(e) => setTarget((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        >
                          <option value="">옮길 주문서 선택...</option>
                          {others.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label.split(" · ").slice(0, 3).join(" · ")}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => move(p.id)}
                          disabled={!target[p.id] || isPending}
                          className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-medium text-white hover:bg-brand-dark disabled:opacity-40"
                        >
                          이 주문서로 옮기기
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </details>
  );
}
