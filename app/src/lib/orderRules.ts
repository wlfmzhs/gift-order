import type { LabelDesign } from "./types";

export interface FieldRequirements {
  isWedding: boolean;
  showBabyNameEn: boolean;
  showParentNames: boolean;
  showBirthday: boolean;
}

/**
 * 라벨 디자인별로 주문서에서 어떤 항목이 필요한지 정의한다.
 * A: 부모이름/생일 필요, 아기 영문이름 불필요
 * B/C/D: 아기 영문이름 필요, 부모이름/생일 불필요
 * E: 아기 영문이름/생일 필요, 부모이름 불필요
 * F: 웨딩 답례품 — 아기 관련 항목 전체를 신랑/신부 항목으로 교체
 */
export function getFieldRequirements(label: LabelDesign): FieldRequirements {
  switch (label) {
    case "A":
      return {
        isWedding: false,
        showBabyNameEn: false,
        showParentNames: true,
        showBirthday: true,
      };
    case "B":
    case "C":
    case "D":
      return {
        isWedding: false,
        showBabyNameEn: true,
        showParentNames: false,
        showBirthday: false,
      };
    case "E":
      return {
        isWedding: false,
        showBabyNameEn: true,
        showParentNames: false,
        showBirthday: true,
      };
    case "F":
      return {
        isWedding: true,
        showBabyNameEn: false,
        showParentNames: false,
        showBirthday: false,
      };
  }
}

export const LABEL_DESIGNS: { value: LabelDesign; label: string }[] = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "E", label: "E" },
  { value: "F", label: "F (웨딩 답례품)" },
];
