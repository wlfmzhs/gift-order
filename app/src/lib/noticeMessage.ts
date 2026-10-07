import { NOTE_NO_ORDER, NOTE_UNPAID } from "./exportRows";

/**
 * 기타(확인사항)에 적힌 내용 중 고객에게 안내해야 하는 것만 골라 문자 문구를 만든다.
 * (엑셀 금액과 다름, 연락처 중복, 품목명 없음 같은 내부 확인용 항목은 문자에 넣지 않는다.)
 * 안내할 내용이 없으면 null.
 */
export function buildNoticeMessage(
  customerName: string,
  notes: string[],
  orderFormUrl: string
): string | null {
  const parts: string[] = [];

  if (notes.includes(NOTE_UNPAID)) {
    parts.push(
      "상세 주문서는 접수되었는데, 홈페이지에서 결제 내역이 확인되지 않아요. 결제를 완료하셨다면 결제하신 분의 성함과 연락처를 알려주세요."
    );
  }
  if (notes.includes(NOTE_NO_ORDER)) {
    parts.push(
      `결제는 확인되었는데 상세 주문서가 아직 접수되지 않았어요. 아래 링크에서 주문서를 작성해주세요.\n${orderFormUrl}`
    );
  }

  for (const note of notes) {
    const tenUnit = note.match(/^타올 10단위 X \((\d+)개\)/);
    if (tenUnit) {
      const qty = Number(tenUnit[1]);
      const down = Math.floor(qty / 10) * 10;
      const up = Math.ceil(qty / 10) * 10;
      const options = [down >= 20 ? `${down}개` : null, `${up}개`]
        .filter(Boolean)
        .join(" 또는 ");
      parts.push(
        `타올은 10개 단위로만 제작할 수 있어요. 현재 ${qty}개로 주문하셨는데, ${options}로 수량 조정이 필요해요. 원하시는 수량을 알려주세요.`
      );
    }
    const tooFew = note.match(/^타올 20개 미만 \((\d+)개\)/);
    if (tooFew) {
      parts.push(
        `타올은 20개부터 제작할 수 있어요. 현재 ${tooFew[1]}개로 주문하셨는데, 수량 조정이 필요해요. 원하시는 수량을 알려주세요.`
      );
    }
    const mismatch = note.match(/^타올 수량 불일치 \(주문서 (\d+)개 \/ 결제 (\d+)개\)/);
    if (mismatch) {
      parts.push(
        `주문서에 적어주신 타올 수량(${mismatch[1]}개)과 결제하신 수량(${mismatch[2]}개)이 달라요. 어느 쪽이 맞는지 알려주세요.`
      );
    }
    const option = note.match(/^옵션 수량 X \((.+) 옵션\/(\d+)개 구매\)/);
    if (option) {
      parts.push(
        `선택하신 옵션(${option[1]})과 구매하신 수량(${option[2]}개)이 맞지 않아요. 수량에 맞는 옵션으로 변경하거나 수량을 조정해야 해요. 어떻게 하실지 알려주세요.`
      );
    }
  }

  if (parts.length === 0) return null;

  const greeting = `안녕하세요${customerName ? ` ${customerName}님` : ""}, 에브리케어입니다.`;
  const numbered =
    parts.length === 1 ? parts[0] : parts.map((p, i) => `${i + 1}. ${p}`).join("\n");
  return `${greeting}\n주문 확인 중 안내드릴 내용이 있어 연락드려요.\n\n${numbered}\n\n확인 후 답장 부탁드립니다. 감사합니다.`;
}
