import AdminHeader from "@/components/AdminHeader";
import AdminOrderRow from "@/components/AdminOrderRow";
import { db } from "@/lib/db";
import type { OrderStatus } from "@/lib/types";

const STATUS_OPTIONS: OrderStatus[] = ["접수완료", "발송완료"];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const orders = await db.list({
    status: status as OrderStatus | undefined,
    search: q,
  });

  return (
    <>
      <AdminHeader />
      <main className="flex-1">
        <div className="px-4 py-5">
          <h1 className="text-lg font-semibold">주문 목록 ({orders.length}건)</h1>

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
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="이름/연락처/주문번호 검색"
              className="min-w-[200px] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-brand"
            >
              검색
            </button>
          </form>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3">주문번호</th>
                  <th className="px-4 py-3">접수일</th>
                  <th className="px-4 py-3">라벨</th>
                  <th className="px-4 py-3">받는분</th>
                  <th className="px-4 py-3">행사일</th>
                  <th className="px-4 py-3">발송일</th>
                  <th className="px-2 py-3">상태</th>
                  <th className="px-2 py-3">송장번호</th>
                  <th className="px-2 py-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <AdminOrderRow key={o.id} order={o} />
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted">
                      주문이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
