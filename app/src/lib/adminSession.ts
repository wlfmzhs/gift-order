import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "./auth";

export async function isAdminSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function requireAdmin(): Promise<void> {
  const ok = await isAdminSession();
  if (!ok) {
    throw new Error("관리자 인증이 필요합니다.");
  }
}
