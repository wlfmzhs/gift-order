"use client";

import { useState, useTransition } from "react";
import { diagnosePhoneAction } from "@/lib/actions/diagnose";

export default function DiagnosePhone() {
  const [phone, setPhone] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const res = await diagnosePhoneAction(phone);
      setError(res.ok ? null : (res.message ?? "조회에 실패했어요."));
      setLines(res.lines);
    });

  return (
    <details className="rounded-2xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        연락처로 주문·결제 연결 상태 확인
      </summary>
      <p className="mt-2 text-xs text-muted">
        매칭이 안 되는 고객의 연락처를 넣으면, 그 번호의 주문서와 결제가 어떻게 저장돼 있는지
        보여줘요.
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
          {isPending ? "조회 중..." : "조회"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {lines.length > 0 && (
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-background p-2 text-xs">
          {lines.join("\n")}
        </pre>
      )}
    </details>
  );
}
