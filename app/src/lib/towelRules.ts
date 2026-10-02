// 타올 제작 일정에 따른 행사일 제한.
// - TOWEL_MIN_EVENT_DATE 이전 행사일: 제작 기간이 맞지 않아 타올 선택 불가
// - TOWEL_ALL_COLORS_FROM 이전(최소일 이후) 행사일: 재고 때문에 화이트만 가능
// - TOWEL_ALL_COLORS_FROM 이후: 모든 색상 가능
export const TOWEL_MIN_EVENT_DATE = "2026-10-24";
export const TOWEL_ALL_COLORS_FROM = "2026-11-07";

export const EVENT_MIN_DATE = "2026-10-01";
export const EVENT_MAX_DATE = "2027-03-31";

export const TOWEL_NONE = "미포함 (타올 구매 안 함)";
export const TOWEL_WHITE = "화이트";

export const TOWEL_TOO_EARLY_MESSAGE =
  "타올은 제작 기간이 필요해서 10월 24일 이후 행사일만 주문하실 수 있어요. 행사일을 확인해주시거나, 타올 \"미포함\"을 선택해주세요.";
export const TOWEL_WHITE_ONLY_MESSAGE =
  "10월 24일~11월 6일 행사는 재고 사정으로 화이트 타올만 선택하실 수 있어요. 아이보리를 포함한 모든 타올은 11월 7일 행사부터 주문 가능해요.";

export type TowelCheck = { ok: true } | { ok: false; message: string };

export function checkTowelForEventDate(
  towelColor: string | undefined | null,
  eventDate: string | undefined | null
): TowelCheck {
  if (!towelColor || towelColor === TOWEL_NONE || !eventDate) return { ok: true };
  if (eventDate < TOWEL_MIN_EVENT_DATE) {
    return { ok: false, message: TOWEL_TOO_EARLY_MESSAGE };
  }
  if (eventDate < TOWEL_ALL_COLORS_FROM && towelColor !== TOWEL_WHITE) {
    return { ok: false, message: TOWEL_WHITE_ONLY_MESSAGE };
  }
  return { ok: true };
}
