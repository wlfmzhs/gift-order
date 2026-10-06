// "패키지 수량 선택: 11. [2종] 핸드솝+주방세제_50~99개" + 수량 60
//   → "[2종]핸드솝+주방세제_60개"
// 수량이 옵션의 구매 구간(50~99개 등)을 벗어나거나, 타올 포함 상품인데
// 20장 이상·10장 단위가 아니면 경고를 함께 돌려준다.
export function formatItemName(
  rawOption: string,
  rawQuantity: string
): { name: string; warnings: string[] } {
  const warnings: string[] = [];
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
    return { name: rawOption.trim(), warnings };
  }

  const qty = parseInt(String(rawQuantity).replace(/\D/g, ""), 10);
  if (!Number.isFinite(qty)) {
    warnings.push("수량 정보가 없어요");
    return { name: rawOption.trim(), warnings };
  }

  if (min !== null && (qty < min || (max !== null && qty > max))) {
    const rangeText = max !== null ? `${min}~${max}개` : `${min}개 이상`;
    warnings.push(`${rangeText} 옵션인데 ${qty}개 구매 (가격 구간 확인 필요)`);
  }
  if (name.includes("타올") && (qty < 20 || qty % 10 !== 0)) {
    warnings.push(`타올은 20장 이상 10장 단위만 가능한데 ${qty}개 구매`);
  }

  return { name: `${name}_${qty}개`, warnings };
}
