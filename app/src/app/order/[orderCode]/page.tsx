import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import KakaoChatButton from "@/components/KakaoChatButton";
import ShippingEditor from "@/components/ShippingEditor";
import StatusTimeline from "@/components/StatusTimeline";
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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderCode: string }>;
}) {
  const { orderCode } = await params;
  const order = await db.getByCode(orderCode);
  if (!order) notFound();

  const req = getFieldRequirements(order.label_design);
  const canEditShipping =
    order.status === "접수완료" || order.status === "확인중";
  const trackingUrl =
    order.tracking_no && order.carrier === "롯데택배"
      ? `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${order.tracking_no}`
      : null;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-lg px-5 py-10">
          <p className="text-xs text-muted">주문번호 {order.order_code}</p>
          <h1 className="mt-1 text-xl font-semibold">내 주문 상세</h1>

          <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
            <StatusTimeline status={order.status} />
          </div>

          {order.status === "발송완료" && (
            <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-semibold">배송 정보</h2>
              <Row label="택배사" value={order.carrier} />
              <Row label="송장번호" value={order.tracking_no} />
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-brand underline"
                >
                  배송조회 바로가기
                </a>
              )}
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-semibold">제출하신 주문 정보</h2>
            <div className="mt-1 divide-y divide-border">
              <Row label="라벨 디자인" value={order.label_design} />
              <Row label="행사일" value={order.event_date} />
              {req.showBirthday && (
                <Row label="아기 첫 생일(돌)" value={order.birthday_date} />
              )}
              {!req.isWedding && (
                <>
                  <Row label="아기 이름(한글)" value={order.baby_name_kr} />
                  {req.showBabyNameEn && (
                    <Row label="아기 이름(영문)" value={order.baby_name_en} />
                  )}
                  {req.showParentNames && (
                    <>
                      <Row label="아빠 성함" value={order.father_name} />
                      <Row label="엄마 성함" value={order.mother_name} />
                    </>
                  )}
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
              <Row label="자수 색상" value={order.embroidery_color} />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-semibold">배송지</h2>
            <div className="mt-1 divide-y divide-border">
              <Row label="받는분" value={order.recipient_name} />
              <Row label="연락처" value={order.recipient_phone} />
              <Row
                label="주소"
                value={`${order.recipient_zipcode ? `(${order.recipient_zipcode}) ` : ""}${
                  order.recipient_address1
                } ${order.recipient_address2 ?? ""}`}
              />
            </div>
            {canEditShipping ? (
              <ShippingEditor
                orderCode={order.order_code}
                defaultValues={{
                  recipient_name: order.recipient_name,
                  recipient_phone: order.recipient_phone,
                  recipient_zipcode: order.recipient_zipcode ?? "",
                  recipient_address1: order.recipient_address1,
                  recipient_address2: order.recipient_address2 ?? "",
                }}
              />
            ) : (
              <p className="mt-3 text-xs text-muted">
                발송 준비가 시작된 주문은 직접 변경이 어려워요. 배송지 변경이
                필요하시면 카카오톡으로 문의해주세요.
              </p>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="mb-3 text-sm text-muted">궁금한 점이 있으신가요?</p>
            <KakaoChatButton />
          </div>
        </div>
      </main>
    </>
  );
}
