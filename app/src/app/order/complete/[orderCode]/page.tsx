import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { db } from "@/lib/db";

export default async function OrderCompletePage({
  params,
}: {
  params: Promise<{ orderCode: string }>;
}) {
  const { orderCode } = await params;
  const order = await db.getByCode(orderCode);
  if (!order) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-lg px-5 py-14 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-2xl">
            ✓
          </div>
          <h1 className="text-xl font-semibold">주문서 제출이 완료되었습니다</h1>
          <p className="mt-2 text-sm text-muted">
            나중에 주문 내용과 배송현황이 궁금하시면, 상단의 &ldquo;주문
            조회&rdquo;에서 받는분 성함과 연락처만 입력하면 언제든 다시
            확인하실 수 있어요.
          </p>

          <Link
            href={`/order/${order.order_code}`}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            지금 바로 확인하기
          </Link>
        </div>
      </main>
    </>
  );
}
