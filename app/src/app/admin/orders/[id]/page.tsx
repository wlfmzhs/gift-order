import { notFound } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import AdminOrderEditForm from "@/components/AdminOrderEditForm";
import { db } from "@/lib/db";
import { getFieldRequirements } from "@/lib/orderRules";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await db.getById(id);
  if (!order) notFound();

  const req = getFieldRequirements(order.label_design);

  return (
    <>
      <AdminHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-8">
          <p className="text-xs text-muted">주문번호 {order.order_code}</p>
          <h1 className="mt-1 text-lg font-semibold">주문 상세</h1>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-semibold">제출된 주문 정보</h2>
              <div className="mt-1 divide-y divide-border">
                <Row label="라벨 디자인" value={order.label_design} />
                <Row label="행사일" value={order.event_date} />
                {req.showBirthday && (
                  <Row label="아기 첫 생일(돌)" value={order.birthday_date} />
                )}
                {!req.isWedding && (
                  <>
                    <Row label="아기 이름(한글)" value={order.baby_name_kr} />
                    <Row label="아기 이름(영문)" value={order.baby_name_en} />
                    <Row label="아빠 성함" value={order.father_name} />
                    <Row label="엄마 성함" value={order.mother_name} />
                  </>
                )}
                {req.isWedding && (
                  <>
                    <Row label="신랑 성함(한글)" value={order.groom_name_kr} />
                    <Row label="신랑 성함(영문)" value={order.groom_name_en} />
                    <Row label="신부 성함(한글)" value={order.bride_name_kr} />
                    <Row label="신부 성함(영문)" value={order.bride_name_en} />
                  </>
                )}
                <Row label="타올 색상" value={order.towel_color} />
                <Row label="자수 색상" value={order.embroidery_color?.startsWith("해당없음") ? null : order.embroidery_color} />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-semibold">배송지</h2>
              <div className="mt-1 divide-y divide-border">
                <Row label="받는분" value={order.recipient_name} />
                <Row label="연락처" value={order.recipient_phone} />
                <Row label="우편번호" value={order.recipient_zipcode} />
                <Row label="주소" value={order.recipient_address1} />
                <Row label="상세주소" value={order.recipient_address2} />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <AdminOrderEditForm order={order} />
          </div>
        </div>
      </main>
    </>
  );
}
