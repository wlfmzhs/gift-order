// "패키지 수량 선택: 11. [2종] 핸드솝+주방세제_50~99개" + 수량 60
//   → "[2종]핸드솝+주방세제_60개"
// 수량이 옵션의 구매 구간(50~99개 등)을 벗어나면 optionNote에 설명을 돌려준다.
// (타올 수량 검사는 품목명만 있으면 되므로 towelQuantityNotes에서 따로 한다.)
const TRIAL_PREFIX = "[체험]";

// "패키지 수량 선택: 24. " 같은 앞부분 제거
function stripOptionPrefix(raw: string): string {
  return raw
    .replace(/^[^:\[]*:\s*/, "") // "패키지 수량 선택: "
    .replace(/^\d+\.\s*/, "") // "24. "
    .trim();
}

/**
 * 이미 주문서에 저장돼 있는 품목명을 정리한다.
 * "패키지 수량 선택: 24. [체험] 2종 핸드솝+주방세제" → "[체험] 2종 핸드솝+주방세제"
 * 앞부분이 "OOO: 숫자. " 형태가 아니면 그대로 둔다.
 * stillRaw: 구매 구간(_50~99개)이 남아 있어 수량을 알 수 없어 정리하지 못한 값.
 */
export function cleanSavedItemName(value: string): { name: string; stillRaw: boolean } {
  let name = value.trim();
  if (/^[^:\[]*:\s*\d+\.\s*/.test(name)) name = stripOptionPrefix(name);
  if (name.startsWith(TRIAL_PREFIX)) name = name.replace(/\s+/g, " ");
  const stillRaw = /_\d+\s*~\s*\d+\s*개|_\d+\s*개\s*이상/.test(name);
  return { name, stillRaw };
}

export function formatItemName(
  rawOption: string,
  rawQuantity: string
): { name: string; optionNote: string } {
  let name = stripOptionPrefix(rawOption);

  // 체험 패키지는 수량 없이 "[체험] 2종 핸드솝+주방세제" 형태로 둔다.
  if (name.startsWith(TRIAL_PREFIX)) {
    return { name: name.replace(/\s+/g, " "), optionNote: "" };
  }

  let min: number | null = null;
  let max: number | null = null;
  const range = name.match(/_(\d+)\s*~\s*(\d+)\s*개$/);
  const atLeast = name.match(/_(\d+)\s*개\s*이상$/);
  if (range) {
    min = Number(range[1]);
    max = Number(range[2]);
    name = name.slice(0, range.index);
  } else if (atLeast) {
    min = Number(atLeast[1]);
    name = name.slice(0, atLeast.index);
  }
  name = name.replace(/\s+/g, "");
  // "-"처럼 상품명이 없는 행은 손대지 않는다.
  if (!/[가-힣A-Za-z]/.test(name)) {
    return { name: rawOption.trim(), optionNote: "" };
  }

  const qty = parseInt(String(rawQuantity).replace(/\D/g, ""), 10);
  if (!Number.isFinite(qty)) {
    return { name: rawOption.trim(), optionNote: "수량 정보 없음" };
  }

  let optionNote = "";
  if (min !== null && (qty < min || (max !== null && qty > max))) {
    const rangeText = max !== null ? `${min}~${max}개` : `${min}개 이상`;
    optionNote = `옵션 수량 X (${rangeText} 옵션/${qty}개 구매)`;
  }

  return { name: `${name}_${qty}개`, optionNote };
}

/**
 * 품목명("[2종]핸드솝+타올_25개 + 샴푸_30개")에서 타올이 들어간 상품의 수량을 검사한다.
 * 타올은 20개 이상, 10개 단위로만 제작 가능하다.
 */
export function towelQuantityNotes(itemName: string): string[] {
  const notes: string[] = [];
  for (const part of itemName.split(" + ")) {
    if (!part.includes("타올")) continue;
    const m = part.match(/_(\d+)개$/);
    if (!m) continue;
    const qty = Number(m[1]);
    if (qty < 20) notes.push(`타올 20개 미만 (${qty}개)`);
    if (qty % 10 !== 0) notes.push(`타올 10단위 X (${qty}개)`);
  }
  return Array.from(new Set(notes));
}

/** 품목명에서 타올 상품의 수량을 읽는다. ("[3종]핸드솝+타올_30개" → 30) 없으면 null */
export function towelQuantityFromItem(itemName: string): number | null {
  for (const part of itemName.split(" + ")) {
    if (!part.includes("타올")) continue;
    const m = part.match(/_(\d+)개$/);
    if (m) return Number(m[1]);
  }
  return null;
}
