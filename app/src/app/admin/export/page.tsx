import { createHash } from "crypto";
import Link from "next/link";
import AdminHeader from "@/components/AdminHeader";
import ExportGrid from "@/components/ExportGrid";
import ExportedPaste from "@/components/ExportedPaste";
import ExportUpload from "@/components/ExportUpload";
import NormalizeButton from "@/components/NormalizeButton";
import { db, paymentsDb } from "@/lib/db";
import { buildExportRows, isAcked, rowState, type ExportRow, type RowState } from "@/lib/exportRows";
import { reconcilePayments } from "@/lib/reconcile";
import type { OrderStatus, PaymentRecord } from "@/lib/types";

const STATUS_OPTIONS: OrderStatus[] = ["접수완료", "발송완료"];

const MATCH_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "전체 매칭 상태" },
  { value: "problem", label: "확인 필요 전체 (정상 제외)" },
  { value: "ok", label: "정상 매칭만" },
  { value: "check", label: "매칭됐지만 확인 필요" },
  { value: "unpaid", label: "결제X 주문서O" },
  { value: "no-order", label: "결제O 주문서X" },
];

export default async function AdminExportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; package?: string; match?: string; tab?: string }>;
}) {
  const { status, package: pkg, match, tab } = await searchParams;
  const isDone = tab === "done";

  let orders = await db.list();

  // 결제 내역 테이블이 아직 없으면(Supabase에 SQL 미실행) 주문서만이라도 보여준다.
  let payments: PaymentRecord[] = [];
  let paymentsError: string | null = null;
  try {
    payments = (await paymentsDb.list()).filter((p) => !p.ignored);
    const reconciled = await reconcilePayments(orders, payments);
    orders = reconciled.orders;
    payments = reconciled.payments;
  } catch (err) {
    paymentsError = err instanceof Error ? err.message : String(err);
    payments = [];
  }

  // 송장이 등록된 주문은 이미 발송 처리된 것이므로 목록에서 뺀다.
  // (결제도 함께 빼야 "결제O 주문서X"로 잘못 나타나지 않는다. 연결은 위에서 전체 주문 기준으로 끝난 상태.)
  const shippedIds = new Set(
    orders.filter((o) => (o.tracking_no ?? "").trim() !== "").map((o) => o.id)
  );
  const everyRow = buildExportRows(
    orders.filter((o) => !shippedIds.has(o.id)),
    payments.filter((p) => !p.order_id || !shippedIds.has(p.order_id))
  );
  const pendingCount = everyRow.filter((r) => !r.exported).length;
  const doneCount = everyRow.length - pendingCount;
  const allRows = everyRow.filter((r) => r.exported === isDone);

  const stateOf = (r: ExportRow) =>
    rowState(r.pairing, r.notes, r.kind === "order" && isAcked(r.notesAck, r.notes));
  const counts: Record<RowState, number> = { ok: 0, check: 0, unpaid: 0, "no-order": 0 };
  for (const r of allRows) counts[stateOf(r)]++;

  const rows = allRows.filter((r) => {
    // 결제만 있는 행은 아직 접수 전이므로 "접수완료" 필터에는 포함하고 "발송완료"에는 뺀다.
    if (status && (r.orderStatus ?? "접수완료") !== status) return false;
    if (pkg === "trial" && !r.isTrial) return false;
    if (pkg === "regular" && r.isTrial) return false;
    const state = stateOf(r);
    if (match === "problem" && state === "ok") return false;
    if (match && match !== "problem" && state !== match) return false;
    return true;
  });

  // 화면을 새로고침해 내용이 바뀌면(엑셀 반영, 주문서 연결 등) 표를 새로 그리기 위한 키
  const gridKey = createHash("sha1")
    .update(JSON.stringify(rows))
    .digest("hex")
    .slice(0, 16);

  return (
    <>
      <AdminHeader />
      <main className="flex-1">
        <div className="px-4 py-5">
          <h1 className="text-lg font-semibold">시트 내보내기 · 엑셀 매칭</h1>
          <p className="mt-1 text-sm text-muted">
            결제 엑셀을 올리면 연락처로 주문서와 자동 매칭돼요. 발송일이 빠른 순서(체험 패키지는
            항상 맨 위)로 정렬되어 있고, 셀을 직접 고칠 수 있어요. 다 확인하셨으면 내보낼 행을 선택해서
            복사한 뒤 스프레드시트에 붙여넣으세요. 복사한 행은 &apos;내보내기 완료&apos; 탭으로 옮겨져요.
          </p>

          {paymentsError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              결제 내역을 불러오지 못했어요 ({paymentsError}). Supabase를 쓰고 있다면
              supabase/schema.sql 맨 아래의 payments 테이블 SQL을 한 번 실행해주세요. 그 전까지는
              엑셀 올리기가 동작하지 않고, 주문서에 이미 입력된 품목명/금액 기준으로만 표시돼요.
            </p>
          )}

          <div className="mt-4 flex gap-2 border-b border-border">
            {[
              { id: "pending", label: "내보내기 전", count: pendingCount, href: "/admin/export" },
              { id: "done", label: "내보내기 완료", count: doneCount, href: "/admin/export?tab=done" },
            ].map((t) => {
              const active = (t.id === "done") === isDone;
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
                    active ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {t.label} {t.count}
                </Link>
              );
            })}
          </div>

          {!isDone && (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <ExportUpload />
              <NormalizeButton />
              <ExportedPaste />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-700">
              정상 {counts.ok}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
              확인 필요 {counts.check}
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">
              결제X 주문서O {counts.unpaid}
            </span>
            <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700">
              결제O 주문서X {counts["no-order"]}
            </span>
            <span className="text-muted">
              총 {allRows.length}행
              {shippedIds.size > 0 && ` · 송장 등록된 주문 ${shippedIds.size}건은 제외`}
            </span>
          </div>

          <form className="mt-3 flex flex-wrap gap-2" method="get">
            {isDone && <input type="hidden" name="tab" value="done" />}
            <select
              name="status"
              defaultValue={status ?? ""}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
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
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            >
              <option value="">전체 상품</option>
              <option value="trial">체험 패키지만</option>
              <option value="regular">체험 패키지 제외</option>
            </select>
            <select
              name="match"
              defaultValue={match ?? ""}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            >
              {MATCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium hover:border-brand"
            >
              필터 적용
            </button>
          </form>

          <p className="mt-2 text-xs text-muted">
            {rows.length}건 표시 중
            {pkg && " · 체험 패키지 여부는 품목명에 [체험]이 들어 있는지로 판단해요 (주문서에 품목명이 아직 없으면 체험 아님으로 분류)"}
          </p>

          <div className="mt-3">
            <ExportGrid key={`${gridKey}:${isDone}`} rows={rows} done={isDone} />
          </div>
        </div>
      </main>
    </>
  );
}
