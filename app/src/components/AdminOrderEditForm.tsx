"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateOrderAction, type OrderPatch } from "@/lib/actions/admin";
import type { OrderRecord, OrderStatus } from "@/lib/types";

const STATUS_OPTIONS: OrderStatus[] = ["접수완료", "확인중", "발송준비", "발송완료"];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";
const labelClass = "text-xs font-medium text-muted";

export default function AdminOrderEditForm({ order }: { order: OrderRecord }) {
  const router = useRouter();
  const [values, setValues] = useState<OrderPatch>({
    status: order.status,
    carrier: order.carrier,
    tracking_no: order.tracking_no ?? "",
    ship_date: order.ship_date ?? "",
    recipient_name: order.recipient_name,
    recipient_phone: order.recipient_phone,
    recipient_zipcode: order.recipient_zipcode ?? "",
    recipient_address1: order.recipient_address1,
    recipient_address2: order.recipient_address2 ?? "",
    export_recipient_display: order.export_recipient_display,
    export_item_name: order.export_item_name,
    export_amount: order.export_amount,
    export_delivery_message: order.export_delivery_message,
    export_birthday: order.export_birthday,
    export_etc: order.export_etc,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const set = <K extends keyof OrderPatch>(key: K, value: OrderPatch[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await updateOrderAction(order.id, values);
      setMessage(result.ok ? "저장되었습니다." : result.message ?? "저장 실패");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">배송/상태 관리</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>상태</label>
            <select
              className={inputClass}
              value={values.status}
              onChange={(e) => set("status", e.target.value as OrderStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>발송일</label>
            <input
              type="date"
              className={inputClass}
              value={values.ship_date ?? ""}
              onChange={(e) => set("ship_date", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>택배사</label>
            <input
              className={inputClass}
              value={values.carrier ?? ""}
              onChange={(e) => set("carrier", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>송장번호</label>
            <input
              className={inputClass}
              value={values.tracking_no ?? ""}
              onChange={(e) => set("tracking_no", e.target.value)}
              placeholder="발송 처리 시 입력"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">배송지 수정</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>받는분 성함</label>
            <input
              className={inputClass}
              value={values.recipient_name ?? ""}
              onChange={(e) => set("recipient_name", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>받는분 연락처</label>
            <input
              className={inputClass}
              value={values.recipient_phone ?? ""}
              onChange={(e) => set("recipient_phone", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>우편번호</label>
            <input
              className={inputClass}
              value={values.recipient_zipcode ?? ""}
              onChange={(e) => set("recipient_zipcode", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>주소</label>
            <input
              className={inputClass}
              value={values.recipient_address1 ?? ""}
              onChange={(e) => set("recipient_address1", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>상세주소</label>
            <input
              className={inputClass}
              value={values.recipient_address2 ?? ""}
              onChange={(e) => set("recipient_address2", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">스프레드시트 출력값 (필요 시 수정)</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>받는분성명 (표시용)</label>
            <input
              className={inputClass}
              value={values.export_recipient_display ?? ""}
              onChange={(e) => set("export_recipient_display", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>생일날짜</label>
            <input
              className={inputClass}
              value={values.export_birthday ?? ""}
              onChange={(e) => set("export_birthday", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>기타 (부모님/신랑신부 성함)</label>
            <input
              className={inputClass}
              value={values.export_etc ?? ""}
              onChange={(e) => set("export_etc", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>품목명 (홈페이지 주문 대조 후 입력)</label>
            <input
              className={inputClass}
              value={values.export_item_name ?? ""}
              onChange={(e) => set("export_item_name", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>금액 (홈페이지 주문 대조 후 입력)</label>
            <input
              className={inputClass}
              value={values.export_amount ?? ""}
              onChange={(e) => set("export_amount", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>배송메세지1</label>
            <input
              className={inputClass}
              value={values.export_delivery_message ?? ""}
              onChange={(e) => set("export_delivery_message", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {message && <span className="text-sm text-muted">{message}</span>}
      </div>
    </div>
  );
}
