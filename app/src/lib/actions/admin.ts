"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminSession";
import {
  ADMIN_COOKIE_NAME,
  checkAdminPassword,
  createSessionToken,
} from "@/lib/auth";
import { db } from "@/lib/db";
import type { OrderRecord } from "@/lib/types";

export interface AdminLoginResult {
  ok: false;
  message: string;
}

export async function adminLoginAction(
  password: string
): Promise<AdminLoginResult> {
  let valid: boolean;
  try {
    valid = checkAdminPassword(password);
  } catch {
    return {
      ok: false,
      message: "서버에 ADMIN_PASSWORD 환경변수가 설정되어 있지 않습니다.",
    };
  }

  if (!valid) {
    return { ok: false, message: "비밀번호가 올바르지 않습니다." };
  }

  let sessionToken: string;
  try {
    sessionToken = createSessionToken();
  } catch {
    return {
      ok: false,
      message: "서버에 ADMIN_SESSION_SECRET 환경변수가 설정되어 있지 않습니다.",
    };
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/admin");
}

export async function adminLogoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

export type OrderPatch = Partial<
  Pick<
    OrderRecord,
    | "status"
    | "carrier"
    | "tracking_no"
    | "ship_date"
    | "recipient_name"
    | "recipient_phone"
    | "recipient_zipcode"
    | "recipient_address1"
    | "recipient_address2"
    | "export_recipient_display"
    | "export_item_name"
    | "export_amount"
    | "export_delivery_message"
    | "export_birthday"
    | "export_etc"
  >
>;

export async function updateOrderAction(
  id: string,
  patch: OrderPatch
): Promise<{ ok: boolean; message?: string }> {
  try {
    await requireAdmin();
    // 송장번호를 입력하면 발송완료로 자동 전환 (빈 값으로 지우는 경우는 제외)
    const finalPatch: OrderPatch =
      typeof patch.tracking_no === "string" && patch.tracking_no.trim() !== ""
        ? { ...patch, status: "발송완료" }
        : patch;
    await db.update(id, finalPatch);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.",
    };
  }
}

export async function deleteOrderAction(
  id: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    await requireAdmin();
    await db.delete(id);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.",
    };
  }
}
