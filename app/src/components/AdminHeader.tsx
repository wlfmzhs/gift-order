import Image from "next/image";
import Link from "next/link";
import { adminLogoutAction } from "@/lib/actions/admin";

export default function AdminHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Image
            src="/brand/logo.png"
            alt="everycare"
            width={120}
            height={16}
            className="h-4 w-auto"
          />
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="hover:text-brand">
              주문 목록
            </Link>
            <Link href="/admin/export" className="hover:text-brand">
              시트 내보내기 · 엑셀 매칭
            </Link>
          </nav>
        </div>
        <form action={adminLogoutAction}>
          <button type="submit" className="text-sm text-muted hover:text-brand">
            로그아웃
          </button>
        </form>
      </div>
    </header>
  );
}
