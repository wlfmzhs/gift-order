import AdminHeader from "@/components/AdminHeader";
import ExportGrid from "@/components/ExportGrid";
import { db } from "@/lib/db";
import type { OrderStatus } from "@/lib/types";

const STATUS_OPTIONS: OrderStatus[] = ["접수완료", "발송완료"];

// 체험 패키지 여부는 엑셀 매칭으로 들어온 품목명("[체험]...")으로 판단한다.
const TRIAL_KEYWORD = "[체험]";

export default async function AdminExportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; package?: string }>;
}) {
  const { status, package: pkg } = await searchParams;
  const allOrders = await db.list({ status: status as OrderStatus | undefined });
  const orders =
    pkg === "trial"
      ? allOrders.filter((o) => o.export_item_name.includes(TRIAL_KEYWORD))
      : pkg === "regular"
        ? allOrders.filter((o) => !o.export_item_name.includes(TRIAL_KEYWORD))
        : allOrders;

  return (
    <>
      <AdminHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <h1 className="text-lg font-semibold">시트 내보내기</h1>
          <p className="mt-1 text-sm text-muted">
            셀을 직접 수정할 수 있어요. 다 확인하셨으면 표를 복사해서
            스프레드시트에 붙여넣으세요.
          </p>

          <form className="mt-4 flex flex-wrap gap-2" method="get">
            <select
              name="status"
              defaultValue={status ?? ""}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="">전체 상태</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              name="package"
              defaultValue={pkg ?? ""}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="">전체 상품</option>
              <option value="trial">체험 패키지만</option>
              <option value="regular">체험 패키지 제외</option>
            </select>
            <button
              type="submit"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-brand"
            >
              필터 적용
            </button>
          </form>

          <p className="mt-2 text-xs text-muted">
            {orders.length}건 표시 중
            {pkg && " · 체험 패키지 여부는 엑셀 매칭으로 들어온 품목명 기준이에요 (품목명이 비어 있으면 체험 아님으로 분류)"}
          </p>

          <div className="mt-4">
            <ExportGrid orders={orders} />
          </div>
        </div>
      </main>
    </>
  );
}
