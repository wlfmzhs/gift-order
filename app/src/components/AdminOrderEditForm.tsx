"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateOrderAction, type OrderPatch } from "@/lib/actions/admin";
import type { LabelDesign, OrderRecord, OrderStatus } from "@/lib/types";

const STATUS_OPTIONS: OrderStatus[] = ["접수완료", "발송완료"];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";
const labelClass = "text-xs font-medium text-muted";

const LABEL_OPTIONS: LabelDesign[] = ["A", "B", "C", "D", "E", "F"];

// 고객이 주문서에 적은 내용. 화면에서는 문자열로 다루고, 저장할 때 빈 칸은 null로 바꾼다.
const CONTENT_TEXT_FIELDS = [
  ["event_date", "행사일 (YYYY-MM-DD)"],
  ["birthday_date", "아기 첫 생일(돌) (YYYY-MM-DD)"],
  ["baby_name_kr", "아기 이름(한글)"],
  ["baby_name_en", "아기 이름(영문)"],
  ["father_name", "아빠 성함"],
  ["mother_name", "엄마 성함"],
  ["groom_name_kr", "신랑 성함(한글)"],
  ["groom_name_en", "신랑 성함(영문)"],
  ["bride_name_kr", "신부 성함(한글)"],
  ["bride_name_en", "신부 성함(영문)"],
  ["towel_color", "타올 색상"],
  ["embroidery_color", "자수 색상"],
] as const;
type ContentField = (typeof CONTENT_TEXT_FIELDS)[number][0];

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
  const [label, setLabel] = useState<LabelDesign>(order.label_design);
  const [towelQty, setTowelQty] = useState(order.towel_quantity ? String(order.towel_quantity) : "");
  const [content, setContent] = useState<Record<ContentField, string>>(
    () =>
      Object.fromEntries(
        CONTENT_TEXT_FIELDS.map(([k]) => [k, (order[k] as string | null) ?? ""])
      ) as Record<ContentField, string>
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const set = <K extends keyof OrderPatch>(key: K, value: OrderPatch[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const contentPatch: OrderPatch = { label_design: label };
      for (const [k] of CONTENT_TEXT_FIELDS) {
        const v = content[k].trim();
        // 행사일은 비울 수 없고, 나머지 빈 칸은 null로 저장한다.
        (contentPatch as Record<string, unknown>)[k] = v === "" && k !== "event_date" ? null : v;
      }
      if (content.event_date.trim() === "") delete contentPatch.event_date;
      contentPatch.towel_quantity = towelQty.trim() === "" ? null : Number(towelQty);
      const result = await updateOrderAction(order.id, { ...values, ...contentPatch });
      if (result.ok && (values.tracking_no ?? "").trim() !== "") {
        setValues((v) => ({ ...v, status: "발송완료" }));
      }
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
          <div className="min-w-0">
            <label className={labelClass}>발송일</label>
            <input
              type="date"
              className={`${inputClass} min-w-0`}
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
            <p className="mt-1 text-[11px] text-muted">
              입력 후 저장하면 상태가 자동으로 발송완료로 바뀌어요.
            </p>
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
        <h2 className="font-semibold">고객이 적은 주문 내용 수정</h2>
        <p className="mt-1 text-xs text-muted">
          고객이 제출한 내용을 직접 고칠 수 있어요. 입력 규칙 검사 없이 그대로 저장돼요.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>라벨 디자인</label>
            <select
              className={inputClass}
              value={label}
              onChange={(e) => setLabel(e.target.value as LabelDesign)}
            >
              {LABEL_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          {CONTENT_TEXT_FIELDS.map(([k, text]) => (
            <div key={k}>
              <label className={labelClass}>{text}</label>
              <input
                className={inputClass}
                value={content[k]}
                onChange={(e) => setContent((c) => ({ ...c, [k]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className={labelClass}>타올 수량 (숫자)</label>
            <input
              className={inputClass}
              inputMode="numeric"
              value={towelQty}
              onChange={(e) => setTowelQty(e.target.value.replace(/\D/g, ""))}
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
