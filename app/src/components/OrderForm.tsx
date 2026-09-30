"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Script from "next/script";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { createOrderAction } from "@/lib/actions/orders";
import { getFieldRequirements } from "@/lib/orderRules";
import { orderFormSchema, type OrderFormValues } from "@/lib/orderSchema";

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: { zonecode: string; address: string }) => void;
        width?: string;
        height?: string;
      }) => { embed: (element: HTMLElement) => void };
    };
  }
}

const LABEL_OPTIONS: {
  value: OrderFormValues["label_design"];
  hint: string;
  img: string;
}[] = [
  {
    value: "A",
    hint: "아기 이름(한글) · 부모님 성함 · 생일",
    img: "/brand/labels/a.jpg",
  },
  { value: "B", hint: "아기 이름(한글/영문)", img: "/brand/labels/b.jpg" },
  { value: "C", hint: "아기 이름(한글/영문)", img: "/brand/labels/c.jpg" },
  { value: "D", hint: "아기 이름(한글/영문)", img: "/brand/labels/d.jpg" },
  {
    value: "E",
    hint: "아기 이름(한글/영문) · 생일",
    img: "/brand/labels/e.jpg",
  },
  {
    value: "F",
    hint: "웨딩 답례품 · 신랑/신부 성함",
    img: "/brand/labels/f.jpg",
  },
];

interface ColorOption {
  value: string;
  hex: string | null;
}

const TOWEL_NONE = "미포함 (타올 구매 안 함)";

const TOWEL_COLORS: ColorOption[] = [
  { value: TOWEL_NONE, hex: null },
  { value: "화이트", hex: "#FFFFFF" },
  { value: "아이보리", hex: "#F2E8D5" },
];

const EMBROIDERY_COLORS: ColorOption[] = [
  { value: "버건디", hex: "#7B1E3A" },
  { value: "올리브그린", hex: "#6F7B45" },
  { value: "핑크", hex: "#EFA8BE" },
  { value: "스카이블루", hex: "#8FC6E0" },
];

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

function ColorDot({ hex }: { hex: string | null }) {
  if (!hex) {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-dashed border-muted text-[8px] leading-none text-muted">
        ✕
      </span>
    );
  }
  return (
    <span
      className="h-4 w-4 shrink-0 rounded-full border border-black/15"
      style={{ backgroundColor: hex }}
    />
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function ColorSwatchField({
  options,
  value,
  onChange,
}: {
  options: ColorOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={`flex items-center gap-2 rounded-full border-2 px-3 py-2 text-sm transition-all ${
              selected
                ? "border-brand bg-brand/10 font-semibold text-brand-dark shadow-sm"
                : "border-border text-foreground hover:border-brand/50"
            }`}
          >
            <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
              {opt.hex ? (
                <span
                  className={`h-5 w-5 rounded-full border ${
                    selected ? "border-black/25" : "border-black/15"
                  }`}
                  style={{ backgroundColor: opt.hex }}
                />
              ) : (
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border border-dashed text-[10px] leading-none ${
                    selected ? "border-black/40 text-foreground" : "border-black/25 text-muted"
                  }`}
                >
                  ✕
                </span>
              )}
              {selected && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-brand ring-2 ring-white">
                  <svg viewBox="0 0 20 20" fill="none" className="h-2 w-2">
                    <path
                      d="M4 10.2l3.6 3.6L16 5"
                      stroke="#ffffff"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </span>
            {opt.value}
          </button>
        );
      })}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors";
const labelClass = "text-sm font-medium text-foreground";
const errorClass = "text-xs text-red-600 mt-1";
const sectionClass = "space-y-4 rounded-2xl border border-border bg-surface p-5";

function ReviewStep({
  data,
  submitting,
  submitError,
  onEdit,
  onConfirm,
}: {
  data: OrderFormValues;
  submitting: boolean;
  submitError: string | null;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  const req = getFieldRequirements(data.label_design);
  const labelOption = LABEL_OPTIONS.find((o) => o.value === data.label_design);
  const towelOption = TOWEL_COLORS.find((c) => c.value === data.towel_color);
  const embroideryOption = EMBROIDERY_COLORS.find(
    (c) => c.value === data.embroidery_color
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-brand/40 bg-brand/5 p-4 text-sm text-brand-dark">
        <strong>아직 제출되지 않았어요.</strong> 아래 내용이 정확한지 한 번
        더 확인해주세요. 특히 이름, 생일, 연락처, 배송지는 틀리면 답례품이
        엉뚱하게 나가거나 배송이 안 될 수 있어요.
      </div>

      <div className={sectionClass}>
        <h2 className="font-semibold">라벨 디자인</h2>
        <div className="flex items-center gap-4">
          {labelOption && (
            <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
              <Image
                src={labelOption.img}
                alt={`라벨 디자인 ${data.label_design}`}
                fill
                sizes="80px"
                className="object-cover object-top"
              />
            </div>
          )}
          <div>
            <div className="text-lg font-semibold">{data.label_design}</div>
            <div className="text-xs text-muted">{labelOption?.hint}</div>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className="font-semibold">주문 정보</h2>
        <div>
          <ReviewRow label="행사일" value={data.event_date} />
          {req.showBirthday && (
            <ReviewRow label="아기 첫 생일(돌)" value={data.birthday_date} />
          )}
          {!req.isWedding && (
            <>
              <ReviewRow label="아기 이름(한글)" value={data.baby_name_kr} />
              {req.showBabyNameEn && (
                <ReviewRow label="아기 이름(영문)" value={data.baby_name_en} />
              )}
              {req.showParentNames && (
                <>
                  <ReviewRow label="아빠 성함" value={data.father_name} />
                  <ReviewRow label="엄마 성함" value={data.mother_name} />
                </>
              )}
            </>
          )}
          {req.isWedding && (
            <>
              <ReviewRow label="신랑 성함(한글)" value={data.groom_name_kr} />
              <ReviewRow label="신랑 성함(영문)" value={data.groom_name_en} />
              <ReviewRow label="신부 성함(한글)" value={data.bride_name_kr} />
              <ReviewRow label="신부 성함(영문)" value={data.bride_name_en} />
            </>
          )}
          <div className="flex justify-between gap-4 border-b border-border py-2 text-sm">
            <span className="text-muted">타올 색상</span>
            <span className="flex items-center gap-2 font-medium">
              {towelOption && <ColorDot hex={towelOption.hex} />}
              {data.towel_color}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
            <span className="text-muted">자수 색상</span>
            <span className="flex items-center gap-2 font-medium">
              {embroideryOption && <ColorDot hex={embroideryOption.hex} />}
              {data.embroidery_color}
            </span>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className="font-semibold">답례품 배송 정보</h2>
        <div>
          <ReviewRow label="받는분 성함" value={data.recipient_name} />
          <ReviewRow label="받는분 연락처" value={data.recipient_phone} />
          <ReviewRow
            label="배송지 주소"
            value={`(${data.recipient_zipcode}) ${data.recipient_address1} ${
              data.recipient_address2 ?? ""
            }`}
          />
        </div>
      </div>

      {submitError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {submitError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onEdit}
          disabled={submitting}
          className="flex-1 rounded-full border border-border py-3.5 text-sm font-medium transition-colors hover:border-brand disabled:opacity-60"
        >
          수정하기
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="flex-1 rounded-full bg-brand py-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {submitting ? "제출 중..." : "이대로 제출하기"}
        </button>
      </div>
    </div>
  );
}

export default function OrderForm() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPostcode, setShowPostcode] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "review">("edit");
  const [reviewData, setReviewData] = useState<OrderFormValues | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      label_design: "A",
      recipient_zipcode: "",
      recipient_address1: "",
      recipient_phone: "",
      towel_color: "",
      embroidery_color: "",
    },
  });

  const labelDesign = watch("label_design");
  const req = getFieldRequirements(labelDesign);

  // 라벨 디자인을 바꾸면 더 이상 해당하지 않는 항목의 값은 비워서,
  // 화면에는 안 보이지만 실제로는 제출되는 이전 입력값이 남지 않게 한다.
  useEffect(() => {
    const r = getFieldRequirements(labelDesign);
    if (r.isWedding) {
      setValue("baby_name_kr", "");
      setValue("baby_name_en", "");
      setValue("father_name", "");
      setValue("mother_name", "");
      setValue("birthday_date", "");
    } else {
      setValue("groom_name_kr", "");
      setValue("groom_name_en", "");
      setValue("bride_name_kr", "");
      setValue("bride_name_en", "");
      if (!r.showBabyNameEn) setValue("baby_name_en", "");
      if (!r.showParentNames) {
        setValue("father_name", "");
        setValue("mother_name", "");
      }
      if (!r.showBirthday) setValue("birthday_date", "");
    }
  }, [labelDesign, setValue]);

  const openPostcode = () => setShowPostcode(true);
  const closePostcode = () => setShowPostcode(false);

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

  // 1단계: 유효성 검사를 통과하면 바로 제출하지 않고 확인 화면을 보여준다.
  const handleReview = (values: OrderFormValues) => {
    setSubmitError(null);
    setReviewData(values);
    setMode("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditAgain = () => {
    setMode("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 2단계: 확인 화면에서 "이대로 제출하기"를 눌러야 실제로 서버에 저장된다.
  const handleConfirm = async () => {
    if (!reviewData) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await createOrderAction(reviewData);
      if (result && !result.ok) {
        setSubmitError(result.message);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            setError(field as keyof OrderFormValues, { message });
          }
        }
        setMode("edit");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
      />
      <form onSubmit={handleSubmit(handleReview)} className="space-y-6">
        {mode === "edit" && (
          <>
        {/* 라벨 디자인 선택 */}
        <div className={sectionClass}>
          <h2 className="font-semibold">라벨 디자인 선택</h2>
          <p className="text-xs text-muted">
            이미지를 눌러 크게 보실 수 있어요.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {LABEL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer overflow-hidden rounded-xl border-2 text-center transition-colors ${
                  labelDesign === opt.value
                    ? "border-brand bg-brand/5"
                    : "border-border hover:border-brand/50"
                }`}
              >
                <input
                  type="radio"
                  value={opt.value}
                  {...register("label_design")}
                  className="sr-only"
                />
                <div className="relative aspect-[4/5] w-full bg-white">
                  <Image
                    src={opt.img}
                    alt={`라벨 디자인 ${opt.value}`}
                    fill
                    sizes="(min-width: 640px) 200px, 45vw"
                    className="object-cover object-top"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPreviewImg(opt.img);
                    }}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs shadow hover:bg-white"
                    aria-label={`${opt.value} 디자인 크게 보기`}
                  >
                    🔍
                  </button>
                  {labelDesign === opt.value && (
                    <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white shadow">
                      <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
                        <path
                          d="M4 10.2l3.6 3.6L16 5"
                          stroke="#ffffff"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="px-2 py-2">
                  <div className="font-semibold">{opt.value}</div>
                  <div className="mt-0.5 text-[11px] leading-tight text-muted">
                    {opt.hint}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 주문 정보 */}
        <div className={sectionClass}>
          <h2 className="font-semibold">주문 정보</h2>

          <div>
            <label className={labelClass}>행사일</label>
            <input type="date" className={inputClass} {...register("event_date")} />
            {errors.event_date && (
              <p className={errorClass}>{errors.event_date.message}</p>
            )}
          </div>

          {req.showBirthday && (
            <div>
              <label className={labelClass}>아기 첫 생일(돌) 날짜</label>
              <input
                type="date"
                className={inputClass}
                {...register("birthday_date")}
              />
              {errors.birthday_date && (
                <p className={errorClass}>{errors.birthday_date.message}</p>
              )}
            </div>
          )}

          {!req.isWedding && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>아기 이름 (한글)</label>
                  <input className={inputClass} {...register("baby_name_kr")} />
                  {errors.baby_name_kr && (
                    <p className={errorClass}>{errors.baby_name_kr.message}</p>
                  )}
                </div>
                {req.showBabyNameEn && (
                  <div>
                    <label className={labelClass}>아기 이름 (영문)</label>
                    <input className={inputClass} {...register("baby_name_en")} />
                    {errors.baby_name_en && (
                      <p className={errorClass}>{errors.baby_name_en.message}</p>
                    )}
                  </div>
                )}
              </div>

              {req.showParentNames && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>아빠 성함</label>
                    <input className={inputClass} {...register("father_name")} />
                    {errors.father_name && (
                      <p className={errorClass}>{errors.father_name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>엄마 성함</label>
                    <input className={inputClass} {...register("mother_name")} />
                    {errors.mother_name && (
                      <p className={errorClass}>{errors.mother_name.message}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {req.isWedding && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>신랑 성함 (한글)</label>
                <input className={inputClass} {...register("groom_name_kr")} />
                {errors.groom_name_kr && (
                  <p className={errorClass}>{errors.groom_name_kr.message}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>신랑 성함 (영문)</label>
                <input className={inputClass} {...register("groom_name_en")} />
              </div>
              <div>
                <label className={labelClass}>신부 성함 (한글)</label>
                <input className={inputClass} {...register("bride_name_kr")} />
                {errors.bride_name_kr && (
                  <p className={errorClass}>{errors.bride_name_kr.message}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>신부 성함 (영문)</label>
                <input className={inputClass} {...register("bride_name_en")} />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <label className={labelClass}>
              타올 색상{" "}
              <span className="font-normal text-amber-700">
                (타올 포함 구성 구매 고객만 선택)
              </span>
            </label>
            <p className="mt-1 text-xs text-amber-700">
              타올 구성품을 구매하지 않으셨다면 &ldquo;미포함&rdquo;을
              선택해주세요.
            </p>
            <Controller
              control={control}
              name="towel_color"
              render={({ field }) => (
                <ColorSwatchField
                  options={TOWEL_COLORS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.towel_color && (
              <p className={errorClass}>{errors.towel_color.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>자수 색상</label>
            <Controller
              control={control}
              name="embroidery_color"
              render={({ field }) => (
                <ColorSwatchField
                  options={EMBROIDERY_COLORS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.embroidery_color && (
              <p className={errorClass}>{errors.embroidery_color.message}</p>
            )}
          </div>
        </div>

        {/* 배송 정보 */}
        <div className={sectionClass}>
          <h2 className="font-semibold">답례품 배송 정보</h2>

          <div>
            <label className={labelClass}>받는분 성함</label>
            <input className={inputClass} {...register("recipient_name")} />
            {errors.recipient_name && (
              <p className={errorClass}>{errors.recipient_name.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>받는분 연락처</label>
            <Controller
              control={control}
              name="recipient_phone"
              render={({ field }) => (
                <input
                  className={inputClass}
                  placeholder="010-1234-5678"
                  inputMode="numeric"
                  maxLength={13}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(formatPhoneInput(e.target.value))
                  }
                  onBlur={field.onBlur}
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
                    readOnly
                    placeholder="우편번호"
                    className={`${inputClass} w-28 bg-background`}
                  />
                )}
              />
              <button
                type="button"
                onClick={openPostcode}
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
        </div>

        {submitError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-full bg-brand py-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          제출 전 내용 확인하기
        </button>
          </>
        )}

        {mode === "review" && reviewData && (
          <ReviewStep
            data={reviewData}
            submitting={submitting}
            submitError={submitError}
            onEdit={handleEditAgain}
            onConfirm={handleConfirm}
          />
        )}
      </form>

      {showPostcode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closePostcode}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={closePostcode}
                className="text-sm text-muted"
              >
                닫기
              </button>
            </div>
            <div ref={embedPostcode} style={{ height: 450 }} />
          </div>
        </div>
      )}

      {previewImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
          onClick={() => setPreviewImg(null)}
        >
          <div
            className="relative max-h-full max-w-sm overflow-auto rounded-2xl bg-white p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm shadow hover:bg-white"
              aria-label="닫기"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- 임의 비율 이미지를 그대로 크게 보여주기 위해 next/image 대신 사용 */}
            <img
              src={previewImg}
              alt="라벨 디자인 미리보기"
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
