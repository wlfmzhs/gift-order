"use client";

import { useMemo, useState, useTransition } from "react";
import {
  applyHomepageImportAction,
  previewHomepageImportAction,
  type ImportRow,
} from "@/lib/actions/importOrders";

interface Selection {
  // key -> chosen orderId ("" = none selected)
  [key: string]: string;
}

export default function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [stillUnmatched, setStillUnmatched] = useState<
    { orderId: string; orderCode: string; recipientName: string; recipientPhone: string }[]
  >([]);
  const [skippedCancelled, setSkippedCancelled] = useState(0);
  const [exactDuplicateCount, setExactDuplicateCount] = useState(0);
  const [selection, setSelection] = useState<Selection>({});
  const [error, setError] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePreview = () => {
    if (!file) return;
    setError(null);
    setApplyMessage(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const result = await previewHomepageImportAction(fd);
      if (!result.ok) {
        setError(result.message);
        setRows(null);
        return;
      }
      setRows(result.rows);
      setStillUnmatched(result.stillUnmatchedOrders);
      setSkippedCancelled(result.skippedCancelledCount);
      setExactDuplicateCount(result.exactDuplicateCount);

      const initial: Selection = {};
      result.rows.forEach((r) => {
        if (r.candidates.length === 1 && !r.candidates[0].hasExistingItemName) {
          initial[r.key] = r.candidates[0].orderId;
        } else {
          initial[r.key] = "";
        }
      });
      setSelection(initial);
    });
  };

  const selectedCount = useMemo(
    () => Object.values(selection).filter((v) => v !== "").length,
    [selection]
  );

  const handleApply = () => {
    if (!rows) return;
    const matches = rows
      .filter((r) => selection[r.key])
      .map((r) => ({
        orderId: selection[r.key],
        export_item_name: r.excelItemName,
        export_amount: r.excelAmount,
        export_delivery_message: r.excelDeliveryMessage,
      }));

    if (matches.length === 0) {
      setError("적용할 항목을 선택해주세요.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await applyHomepageImportAction(matches);
      if (!result.ok) {
        setError(result.message ?? "적용 중 오류가 발생했습니다.");
        return;
      }
      setApplyMessage(`${result.appliedCount}건의 주문에 품목명/금액을 반영했습니다.`);
      setRows(null);
      setFile(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">1. 홈페이지 주문 엑셀 업로드</h2>
        <p className="mt-1 text-sm text-muted">
          쇼핑몰에서 내려받은 &quot;주문 상품별 상세검색&quot; 엑셀(.xlsx) 파일을 그대로 올려주세요.
          받는분 연락처를 기준으로 이미 접수된 주문서와 자동으로 매칭합니다.
        </p>
        <p className="mt-1 text-xs text-muted">
          완전히 똑같은 행(같은 사람·같은 상품·같은 금액)은 파일 안 중복으로 보고 자동으로
          하나로 합치고, 같은 사람이 상품을 여러 줄로 나눠 주문한 경우엔 품목명을 합치고
          금액을 더해서 보여드려요.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            onClick={handlePreview}
            disabled={!file || isPending}
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {isPending ? "처리 중..." : "미리보기"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {applyMessage && (
          <p className="mt-3 text-sm text-green-700">{applyMessage}</p>
        )}
      </div>

      {rows && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              2. 매칭 결과 확인 ({rows.length}건 중 {selectedCount}건 선택됨)
            </h2>
            <button
              onClick={handleApply}
              disabled={isPending || selectedCount === 0}
              className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              선택한 항목 반영하기
            </button>
          </div>
          {(skippedCancelled > 0 || exactDuplicateCount > 0) && (
            <p className="mt-1 text-xs text-muted">
              {skippedCancelled > 0 &&
                `취소/환불로 표시된 ${skippedCancelled}건은 자동으로 제외했습니다. `}
              {exactDuplicateCount > 0 &&
                `완전히 동일한 행 ${exactDuplicateCount}건은 중복으로 보고 1건으로 합쳤습니다.`}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            이미 품목명이 입력되어 있던 주문은 실수로 덮어쓰지 않도록 기본적으로 선택 해제되어
            있어요. 필요하면 체크해서 최신 값으로 갱신하세요.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-2 py-2">반영</th>
                  <th className="px-2 py-2">엑셀 받는분</th>
                  <th className="px-2 py-2">엑셀 연락처</th>
                  <th className="px-2 py-2">상품옵션</th>
                  <th className="px-2 py-2">금액</th>
                  <th className="px-2 py-2">매칭된 주문서</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const noMatch = r.candidates.length === 0;
                  const multi = r.candidates.length > 1;
                  return (
                    <tr
                      key={r.key}
                      className={`border-b border-border last:border-0 ${
                        noMatch ? "bg-red-50" : multi ? "bg-yellow-50" : ""
                      }`}
                    >
                      <td className="px-2 py-2">
                        {!noMatch && (
                          <input
                            type="checkbox"
                            checked={!!selection[r.key]}
                            onChange={(e) =>
                              setSelection((prev) => ({
                                ...prev,
                                [r.key]: e.target.checked
                                  ? prev[r.key] || r.candidates[0]?.orderId || ""
                                  : "",
                              }))
                            }
                          />
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {r.excelRecipientName}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.excelPhone}</td>
                      <td className="px-2 py-2">
                        {r.excelItemName}
                        {r.mergedRowCount > 1 && (
                          <span className="ml-1 text-xs text-amber-600">
                            (엑셀 {r.mergedRowCount}개 행 합침)
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.excelAmount}</td>
                      <td className="px-2 py-2">
                        {noMatch && (
                          <span className="text-xs text-red-600">
                            매칭되는 주문서 없음 (아직 상세주문서 미제출)
                          </span>
                        )}
                        {!noMatch && !multi && (
                          <span className="text-xs">
                            {r.candidates[0].orderCode} · {r.candidates[0].recipientName}
                            {r.candidates[0].hasExistingItemName && (
                              <span className="ml-1 text-amber-600">(기존값 있음)</span>
                            )}
                          </span>
                        )}
                        {multi && (
                          <select
                            className="rounded border border-border bg-background px-2 py-1 text-xs"
                            value={selection[r.key] ?? ""}
                            onChange={(e) =>
                              setSelection((prev) => ({
                                ...prev,
                                [r.key]: e.target.value,
                              }))
                            }
                          >
                            <option value="">직접 선택...</option>
                            {r.candidates.map((c) => (
                              <option key={c.orderId} value={c.orderId}>
                                {c.orderCode} · {c.recipientName}
                                {c.hasExistingItemName ? " (기존값 있음)" : ""}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {stillUnmatched.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">
                이 파일로 매칭되지 않은 접수 주문 ({stillUnmatched.length}건)
              </h3>
              <p className="mt-1 text-xs text-muted">
                상세주문서는 접수됐지만 이번 엑셀에는 해당 연락처의 결제 내역이 없어요. 다른
                회차 파일에 있거나, 연락처가 다르게 입력됐을 수 있어요.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted">
                {stillUnmatched.map((o) => (
                  <li key={o.orderId}>
                    {o.orderCode} · {o.recipientName} · {o.recipientPhone}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
