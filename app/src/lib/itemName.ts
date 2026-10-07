// "패키지 수량 선택: 11. [2종] 핸드솝+주방세제_50~99개" + 수량 60
//   → "[2종]핸드솝+주방세제_60개"
// 수량이 옵션의 구매 구간(50~99개 등)을 벗어나면 optionNote에 설명을 돌려준다.
// (타올 수량 검사는 품목명만 있으면 되므로 towelQuantityNotes에서 따로 한다.)
export function formatItemName(
  rawOption: string,
  rawQuantity: string
): { name: string; optionNote: string } {
  let name = rawOption
    .replace(/^[^:\[]*:\s*/, "") // "패키지 수량 선택: "
    .replace(/^\d+\.\s*/, "") // "11. "
    .trim();

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
