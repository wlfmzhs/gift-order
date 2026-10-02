// 영문 이름 표기: 각 단어의 첫 글자만 대문자 (예: "park in chan" -> "Park In Chan")
export function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)([a-z])/g, (_, sp: string, ch: string) => sp + ch.toUpperCase());
}
