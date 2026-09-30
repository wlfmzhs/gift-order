import { customAlphabet } from "nanoid";

// 사람이 읽기 쉽도록 혼동되는 문자(0/O, 1/I/L)를 제외한 알파벳
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const generate = customAlphabet(ALPHABET, 8);

export function generateOrderCode(): string {
  const code = generate();
  return `EC-${code.slice(0, 4)}-${code.slice(4)}`;
}
