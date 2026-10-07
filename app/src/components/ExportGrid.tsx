"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { updateOrderAction } from "@/lib/actions/admin";
import { setExportedAction } from "@/lib/actions/exportStatus";
import { ignorePaymentsAction, linkPaymentsAction } from "@/lib/actions/payments";
import {
  evaluateOrderRow,
  isAcked,
  notesSignature,
  rowState,
  type ExportRow,
  type RowState,
} from "@/lib/exportRows";
import { EXPORT_COLUMNS } from "@/lib/types";
import NoticeSms from "./NoticeSms";

type EditableField =
  | "recipient"
  | "item"
  | "message"
  | "amount"
  | "birthday"
  | "shipDate"
  | "etc"
  | "notesAck";

type Edits = Record<string, Partial<Record<EditableField, string>>>;

const ORDER_FIELD: Record<EditableField, string> = {
  recipient: "export_recipient_display",
  item: "export_item_name",
  message: "export_delivery_message",
  amount: "export_amount",
  birthday: "export_birthday",
  shipDate: "ship_date",
  etc: "export_etc",
  notesAck: "notes_ack",
};

const STATE_STYLE: Record<RowState, { label: string; badge: string; row: string }> = {
  ok: { label: "정상", badge: "bg-green-100 text-green-700", row: "" },
  check: { label: "확인", badge: "bg-amber-100 text-amber-800", row: "bg-amber-50/60" },
  unpaid: { label: "결제X", badge: "bg-red-100 text-red-700", row: "bg-red-50/70" },
  "no-order": { label: "주문서X", badge: "bg-orange-100 text-orange-700", row: "bg-orange-50/70" },
};

// 시트에 붙여넣을 때 줄바꿈/탭이 칸 구분을 깨뜨리지 않도록 공백으로 바꾼다.
const sheetCell = (v: string) => v.replace(/[\t\r\n]+/g, " ").trim();

const cellClass =
  "rounded border border-transparent bg-transparent px-1 py-0.5 text-xs outline-none [field-sizing:content] focus:border-brand focus:bg-surface";
const textAreaClass = `${cellClass} block max-w-[18rem] min-w-[5rem] resize-none whitespace-pre-wrap break-words`;

export default function ExportGrid({ rows, done }: { rows: ExportRow[]; done: boolean }) {
  const router = useRouter();
  const [edits, setEdits] = useState<Edits>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [linkSel, setLinkSel] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  // 마지막으로 저장된 값 (바뀌지 않았으면 저장 요청을 보내지 않기 위함)
  const savedRef = useRef<Record<string, string>>({});

  const val = (r: ExportRow, f: EditableField): string =>
    edits[r.key]?.[f] ?? r[f];

  const setCell = (r: ExportRow, f: EditableField, value: string) => {
    setEdits((prev) => ({ ...prev, [r.key]: { ...prev[r.key], [f]: value } }));
  };

  const saveCell = async (r: ExportRow, f: EditableField, value: string) => {
    if (r.kind !== "order" || !r.orderId) return;
    const savedKey = `${r.key}:${f}`;
    const last = savedRef.current[savedKey] ?? r[f];
    if (value === last) return;

    const field = ORDER_FIELD[f];
    const result = await updateOrderAction(r.orderId, {
      [field]: f === "shipDate" ? value || null : value,
    });
    if (!result.ok) {
      setSaveError(
        `저장에 실패했어요${result.message ? `: ${result.message}` : ""} — 새로고침 후 다시 시도해주세요.`
      );
    } else {
      savedRef.current[savedKey] = value;
      setSaveError(null);
    }
  };

  const evaluated = (r: ExportRow) => {
    if (r.kind === "order" && r.meta) {
      const e = evaluateOrderRow(r.meta, val(r, "item"), val(r, "amount"));
      return { pairing: e.pairing, notes: e.notes };
    }
    return { pairing: r.pairing, notes: r.notes };
  };

  const selectedRows = rows.filter((r) => selected.has(r.key));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  const toggleRow = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.key)));

  const copyRows = async (target: ExportRow[]): Promise<boolean> => {
    const lines = target.map((r) =>
      [
        val(r, "recipient"),
        r.phone,
        r.address,
        val(r, "item"),
        val(r, "message"),
        val(r, "amount"),
        val(r, "birthday"),
        val(r, "shipDate"),
        val(r, "etc"),
        r.label,
        r.towelColor,
        r.embroideryColor,
        (isAcked(val(r, "notesAck"), evaluated(r).notes) && r.kind === "order"
          ? []
          : evaluated(r).notes
        ).join(", "),
      ]
        .map(sheetCell)
        .join("\t")
    );
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      return true;
    } catch {
      setSaveError("복사에 실패했어요. 브라우저의 클립보드 권한을 확인해주세요.");
      return false;
    }
  };

  const flash = (msg: string) => {
    setCopied(msg);
    setTimeout(() => setCopied(null), 2500);
  };

  const toTargets = (target: ExportRow[]) =>
    target.map((r) => ({
      orderId: r.kind === "order" ? r.orderId : null,
      paymentIds: r.exportPaymentIds,
    }));

  // 복사한 뒤 '내보내기 완료' 탭으로 옮긴다.
  const handleExport = (target: ExportRow[]) => {
    if (target.length === 0) return;
    startTransition(async () => {
      if (!(await copyRows(target))) return;
      const result = await setExportedAction(toTargets(target), true);
      if (!result.ok) {
        setSaveError(result.message ?? "내보내기 처리에 실패했어요.");
        return;
      }
      setSaveError(null);
      flash(`${target.length}행 복사됨 · 내보내기 완료로 이동`);
      router.refresh();
    });
  };

  const handleCopyOnly = async (target: ExportRow[]) => {
    if (target.length > 0 && (await copyRows(target))) flash(`${target.length}행 복사됨`);
  };

  const handleRevert = (target: ExportRow[]) => {
    if (target.length === 0) return;
    startTransition(async () => {
      const result = await setExportedAction(toTargets(target), false);
      if (!result.ok) {
        setSaveError(result.message ?? "되돌리기에 실패했어요.");
        return;
      }
      setSaveError(null);
      router.refresh();
    });
  };

  const handleLink = (r: ExportRow) => {
    const orderId = linkSel[r.key];
    if (!orderId) return;
    startTransition(async () => {
      const result = await linkPaymentsAction(orderId, r.paymentIds);
      if (!result.ok) {
        setSaveError(result.message ?? "연결에 실패했어요.");
        return;
      }
      setSaveError(null);
      router.refresh();
    });
  };

  const handleIgnore = (r: ExportRow) => {
    if (
      !window.confirm(
        `${r.recipient} (${r.phone}) 결제 내역을 목록에서 삭제할까요?
같은 엑셀을 다시 올려도 다시 나타나지 않아요.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await ignorePaymentsAction(r.paymentIds);
      if (!result.ok) {
        setSaveError(result.message ?? "삭제에 실패했어요.");
        return;
      }
      setSaveError(null);
      router.refresh();
    });
  };

  // Enter는 줄바꿈 대신 칸 이동(저장)으로 쓴다.
  const blurOnEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  const textInput = (r: ExportRow, f: EditableField) => (
    <input
      className={cellClass}
      value={val(r, f)}
      onChange={(e) => setCell(r, f, e.target.value)}
      onBlur={(e) => saveCell(r, f, e.target.value)}
      onKeyDown={blurOnEnter}
    />
  );

  const textArea = (r: ExportRow, f: EditableField) => (
    <textarea
      rows={1}
      className={textAreaClass}
      value={val(r, f)}
      onChange={(e) => setCell(r, f, e.target.value)}
      onBlur={(e) => saveCell(r, f, e.target.value)}
      onKeyDown={blurOnEnter}
    />
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-3">
        {saveError && <span className="text-xs text-red-600">{saveError}</span>}
        {copied && <span className="text-xs font-medium text-green-700">{copied}</span>}
        {done ? (
          <>
            <button
              onClick={() => handleCopyOnly(selectedRows)}
              disabled={selectedRows.length === 0}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-brand disabled:opacity-40"
            >
              선택 복사만 ({selectedRows.length}행)
            </button>
            <button
              onClick={() => handleRevert(selectedRows)}
              disabled={selectedRows.length === 0 || isPending}
              className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40"
            >
              선택 내보내기 전으로 되돌리기 ({selectedRows.length}행)
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleExport(rows)}
              disabled={rows.length === 0 || isPending}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-brand disabled:opacity-40"
            >
              전체 복사·내보내기 ({rows.length}행)
            </button>
            <button
              onClick={() => handleExport(selectedRows)}
              disabled={selectedRows.length === 0 || isPending}
              className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40"
            >
              선택 복사·내보내기 ({selectedRows.length}행)
            </button>
          </>
        )}
      </div>
      <div className="max-h-[78vh] overflow-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_var(--border)]">
            <tr className="text-left text-[11px] text-muted">
              <th className="px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="전체 선택"
                />
              </th>
              <th className="whitespace-nowrap px-2 py-2">상태</th>
              {EXPORT_COLUMNS.map((c) => (
                <th key={c} className="whitespace-nowrap px-2 py-2">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const { pairing, notes } = evaluated(r);
              const acked = isAcked(val(r, "notesAck"), notes) && r.kind === "order";
              const activeNotes = acked ? [] : notes;
              const st = STATE_STYLE[rowState(pairing, notes, acked)];
              const isOrder = r.kind === "order";
              return (
                <tr
                  key={r.key}
                  className={`border-b border-border align-top last:border-0 ${st.row}`}
                >
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={selected.has(r.key)}
                      onChange={() => toggleRow(r.key)}
                      aria-label={`${r.recipient} 선택`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.badge}`}
                    >
                      {st.label}
                    </span>
                    {r.kind === "trial" && (
                      <span className="ml-1 whitespace-nowrap rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                        체험
                      </span>
                    )}
                  </td>
                  <td className="px-1 py-1">
                    {isOrder ? textInput(r, "recipient") : <span className="px-1">{r.recipient}</span>}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">{r.phone}</td>
                  <td className="min-w-[14rem] max-w-[22rem] px-2 py-1.5">{r.address}</td>
                  <td className="px-1 py-1">
                    {isOrder ? textArea(r, "item") : <span className="px-1">{r.item}</span>}
                  </td>
                  <td className="px-1 py-1">
                    {isOrder ? textArea(r, "message") : <span className="px-1">{r.message}</span>}
                  </td>
                  <td className="px-1 py-1">
                    {isOrder ? textInput(r, "amount") : <span className="px-1">{r.amount}</span>}
                  </td>
                  <td className="px-1 py-1">{isOrder ? textInput(r, "birthday") : null}</td>
                  <td className="px-1 py-1">
                    {!isOrder && <span className="whitespace-nowrap px-1">{r.shipDate}</span>}
                    {isOrder && (
                      <input
                        type="date"
                        className={cellClass}
                        value={val(r, "shipDate")}
                        onChange={(e) => setCell(r, "shipDate", e.target.value)}
                        onBlur={(e) => saveCell(r, "shipDate", e.target.value)}
                      />
                    )}
                  </td>
                  <td className="px-1 py-1">{isOrder ? textInput(r, "etc") : null}</td>
                  <td className="px-2 py-1.5">{r.label}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{r.towelColor}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{r.embroideryColor}</td>
                  <td className="min-w-[12rem] max-w-[24rem] px-2 py-1.5">
                    {activeNotes.length > 0 && (
                      <span className="font-medium text-red-600">{activeNotes.join(", ")}</span>
                    )}
                    {acked && (
                      <span className="text-muted">✓ 확인완료: {notes.join(", ")}</span>
                    )}
                    {r.kind === "order" && notes.length > 0 && (
                      <div className="mt-1">
                        <button
                          onClick={() => {
                            const next = acked ? "" : notesSignature(notes);
                            setCell(r, "notesAck", next);
                            saveCell(r, "notesAck", next);
                          }}
                          className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium hover:border-brand"
                        >
                          {acked ? "확인 취소" : "확인완료"}
                        </button>
                      </div>
                    )}
                    <NoticeSms customerName={r.customerName} phone={r.phone} notes={activeNotes} />
                    {r.kind === "payment" && (
                      <button
                        onClick={() => handleIgnore(r)}
                        disabled={isPending}
                        className="mt-1 rounded-full border border-red-200 px-2.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        삭제
                      </button>
                    )}
                    {r.kind === "payment" && r.candidates.length > 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        <select
                          className="max-w-[14rem] rounded border border-border bg-background px-1 py-0.5 text-[11px]"
                          value={linkSel[r.key] ?? ""}
                          onChange={(e) =>
                            setLinkSel((prev) => ({ ...prev, [r.key]: e.target.value }))
                          }
                        >
                          <option value="">주문서 선택...</option>
                          {r.candidates.map((c) => (
                            <option key={c.orderId} value={c.orderId}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleLink(r)}
                          disabled={!linkSel[r.key] || isPending}
                          className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-medium text-white hover:bg-brand-dark disabled:opacity-40"
                        >
                          연결
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={EXPORT_COLUMNS.length + 2}
                  className="px-4 py-8 text-center text-muted"
                >
                  {done ? "내보내기 완료된 행이 없습니다." : "내보낼 새 행이 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
