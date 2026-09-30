"use client";

import { useState } from "react";
import { updateOrderAction } from "@/lib/actions/admin";
import { EXPORT_COLUMNS, type OrderRecord } from "@/lib/types";

interface Row {
  id: string;
  export_recipient_display: string;
  recipient_phone: string;
  address_full: string;
  address_detail: string;
  export_item_name: string;
  export_delivery_message: string;
  export_amount: string;
  export_birthday: string;
  ship_date: string;
  export_etc: string;
  label_design: string;
  towel_color: string;
  embroidery_color: string;
}

function toRow(o: OrderRecord): Row {
  return {
    id: o.id,
    export_recipient_display: o.export_recipient_display,
    recipient_phone: o.recipient_phone,
    address_full: `${o.recipient_address1} ${o.recipient_address2 ?? ""}`.trim(),
    address_detail: o.recipient_address2 ?? "",
    export_item_name: o.export_item_name,
    export_delivery_message: o.export_delivery_message,
    export_amount: o.export_amount,
    export_birthday: o.export_birthday,
    ship_date: o.ship_date ?? "",
    export_etc: o.export_etc,
    label_design: o.label_design,
    towel_color: o.towel_color ?? "",
    embroidery_color: o.embroidery_color ?? "",
  };
}

const cellInputClass =
  "w-full min-w-[90px] rounded border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none focus:border-brand focus:bg-surface";

export default function ExportGrid({ orders }: { orders: OrderRecord[] }) {
  const [rows, setRows] = useState<Row[]>(orders.map(toRow));
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setCell = (id: string, field: keyof Row, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const saveCell = async (id: string, field: keyof Row, value: string) => {
    let result: { ok: boolean; message?: string };
    if (field === "ship_date") {
      result = await updateOrderAction(id, { ship_date: value || null });
    } else if (field === "export_recipient_display") {
      result = await updateOrderAction(id, { export_recipient_display: value });
    } else if (
      field === "export_item_name" ||
      field === "export_delivery_message" ||
      field === "export_amount" ||
      field === "export_birthday" ||
      field === "export_etc"
    ) {
      result = await updateOrderAction(id, { [field]: value });
    } else {
      return;
    }

    if (!result.ok) {
      setSaveError(
        `저장에 실패했어요${result.message ? `: ${result.message}` : ""} — 새로고침 후 다시 시도해주세요.`
      );
    } else {
      setSaveError(null);
    }
  };

  const handleCopyAll = async () => {
    const header = EXPORT_COLUMNS.join("\t");
    const lines = rows.map((r) =>
      [
        r.export_recipient_display,
        r.recipient_phone,
        r.address_full,
        r.address_detail,
        r.export_item_name,
        r.export_delivery_message,
        r.export_amount,
        r.export_birthday,
        r.ship_date,
        r.export_etc,
        r.label_design,
        r.towel_color,
        r.embroidery_color,
      ].join("\t")
    );
    const tsv = [header, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 무시: 사용자가 표를 직접 드래그해서 복사할 수 있음
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-3">
        {saveError && <span className="text-xs text-red-600">{saveError}</span>}
        <button
          onClick={handleCopyAll}
          className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          {copied ? "복사됨!" : "표 전체 복사 (클립보드)"}
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              {EXPORT_COLUMNS.map((c) => (
                <th key={c} className="whitespace-nowrap px-2 py-2.5">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-1 py-1">
                  <input
                    className={cellInputClass}
                    value={r.export_recipient_display}
                    onChange={(e) =>
                      setCell(r.id, "export_recipient_display", e.target.value)
                    }
                    onBlur={(e) =>
                      saveCell(r.id, "export_recipient_display", e.target.value)
                    }
                  />
                </td>
                <td className="whitespace-nowrap px-2 py-1">{r.recipient_phone}</td>
                <td className="min-w-[220px] px-2 py-1">{r.address_full}</td>
                <td className="min-w-[140px] px-2 py-1">{r.address_detail}</td>
                <td className="px-1 py-1">
                  <input
                    className={cellInputClass}
                    value={r.export_item_name}
                    onChange={(e) =>
                      setCell(r.id, "export_item_name", e.target.value)
                    }
                    onBlur={(e) =>
                      saveCell(r.id, "export_item_name", e.target.value)
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={cellInputClass}
                    value={r.export_delivery_message}
                    onChange={(e) =>
                      setCell(r.id, "export_delivery_message", e.target.value)
                    }
                    onBlur={(e) =>
                      saveCell(r.id, "export_delivery_message", e.target.value)
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={cellInputClass}
                    value={r.export_amount}
                    onChange={(e) => setCell(r.id, "export_amount", e.target.value)}
                    onBlur={(e) => saveCell(r.id, "export_amount", e.target.value)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={cellInputClass}
                    value={r.export_birthday}
                    onChange={(e) =>
                      setCell(r.id, "export_birthday", e.target.value)
                    }
                    onBlur={(e) => saveCell(r.id, "export_birthday", e.target.value)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="date"
                    className={cellInputClass}
                    value={r.ship_date}
                    onChange={(e) => setCell(r.id, "ship_date", e.target.value)}
                    onBlur={(e) => saveCell(r.id, "ship_date", e.target.value)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={cellInputClass}
                    value={r.export_etc}
                    onChange={(e) => setCell(r.id, "export_etc", e.target.value)}
                    onBlur={(e) => saveCell(r.id, "export_etc", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1">{r.label_design}</td>
                <td className="px-2 py-1">{r.towel_color}</td>
                <td className="px-2 py-1">{r.embroidery_color}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={EXPORT_COLUMNS.length}
                  className="px-4 py-8 text-center text-muted"
                >
                  표시할 주문이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
