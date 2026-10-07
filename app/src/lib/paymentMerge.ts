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
