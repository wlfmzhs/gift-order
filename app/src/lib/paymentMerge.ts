import type { PaymentRecord } from "./types";

export interface MergedPayments {
  item: string;
  amount: string; // 숫자 문자열, 금액 정보가 하나도 없으면 ""
  message: string;
  optionNotes: string[];
}

export function parseAmount(value: string): number | null {
  const n = parseInt(String(value ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * 한 주문서에 연결된 결제 여러 줄(상품을 나눠 결제한 경우)을 하나로 합친다.
 * 품목명은 " + "로 잇고(중복 제거), 금액은 합산, 배송메모는 " / "로 잇는다.
 */
export function mergePayments(payments: PaymentRecord[]): MergedPayments {
  const sorted = [...payments].sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
  );
  const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

  let sum = 0;
  let hasAmount = false;
  for (const p of sorted) {
    const n = parseAmount(p.amount);
    if (n !== null) {
      sum += n;
      hasAmount = true;
    }
  }

  return {
    item: uniq(sorted.map((p) => p.item_name)).join(" + "),
    amount: hasAmount ? String(sum) : "",
    message: uniq(sorted.map((p) => p.delivery_message)).join(" / "),
    optionNotes: uniq(sorted.map((p) => p.option_note)),
  };
}

export const TRIAL_KEYWORD = "[체험]";

export function isTrialItem(itemName: string): boolean {
  return itemName.includes(TRIAL_KEYWORD);
}

/** 품목명이 전부 체험 패키지로만 이뤄져 있는가 (예전에 체험 결제만 반영해 둔 값 판별용) */
export function isTrialOnlyValue(item: string): boolean {
  const parts = item.split(" + ").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 && parts.every(isTrialItem);
}

/**
 * 체험 패키지와 답례품을 같이 결제한 고객은 시트에서 두 줄로 나눈다.
 * - split: 체험과 일반 결제가 둘 다 있음
 * - rep: 주문서 줄이 대표하는 결제 (일반 결제가 있으면 일반만, 없으면 체험)
 */
export function partitionPayments(list: PaymentRecord[]): {
  trial: PaymentRecord[];
  regular: PaymentRecord[];
  rep: PaymentRecord[];
  split: boolean;
} {
  const trial = list.filter((p) => isTrialItem(p.item_name));
  const regular = list.filter((p) => !isTrialItem(p.item_name));
  return {
    trial,
    regular,
    rep: regular.length > 0 ? regular : trial,
    split: trial.length > 0 && regular.length > 0,
  };
}
