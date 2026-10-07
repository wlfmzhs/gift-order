/**
 * 연락처 비교용 정규화: 숫자만 남기고, 엑셀에서 앞자리 0이 사라졌거나(1012345678)
 * 국가번호가 붙은(+82 10-...) 경우도 010... 형태로 맞춘다.
 */
export function normalizePhone(value: unknown): string {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 11) digits = `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith("10")) digits = `0${digits}`;
  return digits;
}
