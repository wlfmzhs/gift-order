"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  importPaymentsAction,
  type ImportPaymentsResult,
} from "@/lib/actions/payments";

export default function ExportUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportPaymentsResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUpload = () => {
    if (!file) return;
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const res = await importPaymentsAction(fd);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setResult(res);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold">홈페이지 결제 엑셀 올리기</h2>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          onClick={handleUpload}
          disabled={!file || isPending}
          className="rounded-full bg-brand px-5 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "처리 중..." : "엑셀 반영"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        쇼핑몰에서 내려받은 &quot;주문 상품별 상세검색&quot; 엑셀을 그대로 올려주세요. 결제
        내역은 계속 누적되고, 겹치는 기간의 엑셀을 다시 올려도 이미 들어온 결제는 중복으로
        쌓이지 않아요. 연락처가 같은 주문서와는 자동으로 매칭됩니다.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {result && (
        <div className="mt-2 text-sm text-green-700">
          <p>
            새 결제 {result.added}건을 추가했어요.
            {result.alreadyStored > 0 && ` (이미 들어와 있던 ${result.alreadyStored}건은 그대로 둠)`}
            {result.duplicateInFile > 0 &&
              ` 파일 안에서 완전히 같은 행 ${result.duplicateInFile}건은 하나로 합쳤어요.`}
            {result.cancelledSkipped > 0 &&
              ` 취소/환불 ${result.cancelledSkipped}건은 제외했어요.`}
            {result.cancelledRemoved > 0 &&
              ` 이전에 들어온 결제 중 ${result.cancelledRemoved}건이 취소돼 결제 내역에서 뺐어요.`}
          </p>
          {result.cancelledOnOrders.length > 0 && (
            <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 font-medium text-red-600">
              취소된 결제가 이미 주문서의 품목명/금액에 반영돼 있어요. 직접 확인해주세요:{" "}
              {result.cancelledOnOrders.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
