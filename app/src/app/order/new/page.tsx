import SiteHeader from "@/components/SiteHeader";
import OrderForm from "@/components/OrderForm";

export default function NewOrderPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-5 py-10">
          <h1 className="text-xl font-semibold">답례품 주문서 작성</h1>
          <p className="mt-2 text-sm text-muted">
            아래 정보를 입력해주시면 확인 후 정성껏 준비해드립니다.
          </p>
          <div className="mt-8">
            <OrderForm />
          </div>
        </div>
      </main>
    </>
  );
}
