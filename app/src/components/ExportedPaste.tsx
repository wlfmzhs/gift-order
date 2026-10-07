"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  markExportedByPastedListAction,
  type MarkExportedResult,
} from "@/lib/actions/exportStatus";

export default function ExportedPaste() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<MarkExportedResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setResult(null);
    startTransition(async () => {
      const res = await markExportedByPastedListAction(text);
      setResult(res);
      if (res.ok) {
        setText("");
        router.refresh();
      }
    });
  };

  return (
    <details className="rounded-2xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        이미 시트에 옮긴 목록 내보내기 완료 처리
      </summary>
      <p className="mt-2 text-xs text-muted">
        스프레드시트에 정리해 둔 표를 그대로 붙여넣으면, 전화번호가 같은 주문과 결제를 모두
        &apos;내보내기 완료&apos;로 옮겨요.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-xs"
        placeholder="여기에 붙여넣기"
      />
      <button
        onClick={handleClick}
        disabled={isPending || text.trim() === ""}
        className="mt-2 rounded-full border border-brand px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white disabled:opacity-50"
      >
        {isPending ? "처리 중..." : "내보내기 완료로 옮기기"}
      </button>
      {result && !result.ok && <p className="mt-2 text-sm text-red-600">{result.message}</p>}
      {result?.ok && (
        <p className="mt-2 text-sm text-green-700">
          전화번호 {result.matchedPhones}개를 내보내기 완료로 옮겼어요.
          {result.unmatchedPhones &&
            result.unmatchedPhones.length > 0 &&
            ` (일치하는 주문/결제가 없는 번호 ${result.unmatchedPhones.length}개: ${result.unmatchedPhones.join(", ")})`}
        </p>
      )}
    </details>
  );
}
