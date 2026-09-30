"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Script from "next/script";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { updateShippingAction } from "@/lib/actions/shipping";
import { shippingFormSchema, type ShippingFormValues } from "@/lib/orderSchema";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors";
const labelClass = "text-sm font-medium text-foreground";
const errorClass = "text-xs text-red-600 mt-1";

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const len = digits.length;
  if (len < 4) return digits;
  if (len < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (len <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, len - 4)}-${digits.slice(len - 4)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function ShippingEditor({
  orderCode,
  defaultValues,
}: {
  orderCode: string;
  defaultValues: ShippingFormValues;
}) {
  const [editing, setEditing] = useState(false);
  const [showPostcode, setShowPostcode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError: setFieldError,
    reset,
    formState: { errors },
  } = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues,
  });

  const embedPostcode = (node: HTMLDivElement | null) => {
    if (!node || !window.daum) return;
    node.innerHTML = "";
    new window.daum.Postcode({
      oncomplete: (data) => {
        setValue("recipient_zipcode", data.zonecode, { shouldValidate: true });
        setValue("recipient_address1", data.address, { shouldValidate: true });
        setShowPostcode(false);
      },
      width: "100%",
      height: "100%",
    }).embed(node);
  };

  const onSubmit = async (values: ShippingFormValues) => {
    setError(null);
    setSaving(true);
    try {
      const result = await updateShippingAction(orderCode, values);
      if (!result.ok) {
        setError(result.message ?? "배송지 변경에 실패했습니다.");
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            setFieldError(field as keyof ShippingFormValues, { message });
          }
        }
        return;
      }
      setSaved(true);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    reset(defaultValues);
    setError(null);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div>
        {saved && (
          <p className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            배송지가 변경되었어요.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setSaved(false);
            setEditing(true);
          }}
          className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-brand"
        >
          배송지 변경하기
        </button>
      </div>
    );
  }

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
      />
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <label className={labelClass}>받는분 성함</label>
          <input className={inputClass} {...register("recipient_name")} />
          {errors.recipient_name && (
            <p className={errorClass}>{errors.recipient_name.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>연락처</label>
          <Controller
            control={control}
            name="recipient_phone"
            render={({ field }) => (
              <input
                {...field}
                inputMode="numeric"
                placeholder="010-1234-5678"
                className={inputClass}
                onChange={(e) => field.onChange(formatPhoneInput(e.target.value))}
              />
            )}
          />
          {errors.recipient_phone && (
            <p className={errorClass}>{errors.recipient_phone.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>배송지 주소</label>
          <div className="flex gap-2">
            <Controller
              control={control}
              name="recipient_zipcode"
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value ?? ""}
                  readOnly
                  placeholder="우편번호"
                  className={`${inputClass} w-28 bg-background`}
                />
              )}
            />
            <button
              type="button"
              onClick={() => setShowPostcode(true)}
              className="shrink-0 rounded-lg border border-border px-4 text-sm font-medium hover:border-brand"
            >
              주소 검색
            </button>
          </div>
          {errors.recipient_zipcode && (
            <p className={errorClass}>{errors.recipient_zipcode.message}</p>
          )}
          <Controller
            control={control}
            name="recipient_address1"
            render={({ field }) => (
              <input
                {...field}
                readOnly
                placeholder="주소 검색을 눌러주세요"
                className={`${inputClass} mt-2 bg-background`}
              />
            )}
          />
          {errors.recipient_address1 && (
            <p className={errorClass}>{errors.recipient_address1.message}</p>
          )}
          <input
            className={`${inputClass} mt-2`}
            placeholder="상세 주소 (동/호수 등)"
            {...register("recipient_address2")}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="flex-1 rounded-full border border-border py-3 text-sm font-medium hover:border-brand disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-brand py-3 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? "저장 중..." : "변경 저장"}
          </button>
        </div>
      </form>

      {showPostcode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowPostcode(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPostcode(false)}
                className="text-sm text-muted"
              >
                닫기
              </button>
            </div>
            <div ref={embedPostcode} style={{ height: 450 }} />
          </div>
        </div>
      )}
    </>
  );
}
