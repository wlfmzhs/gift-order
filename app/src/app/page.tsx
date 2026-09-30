import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-3xl gap-10 px-5 py-14 sm:grid-cols-2 sm:items-center">
          <div>
            <p className="text-sm tracking-wide text-muted">
              everycare 답례품 공동구매
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-snug sm:text-3xl">
              구매를 완료하셨다면,
              <br />
              답례품 주문서를 작성해주세요.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              라벨 디자인, 이름, 색상, 배송지 정보를 입력해주시면
              정성껏 준비해 보내드립니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/order/new"
                className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
              >
                주문서 작성하기
              </Link>
              <Link
                href="/lookup"
                className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-brand"
              >
                내 주문 조회
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-surface">
            <Image
              src="/brand/concept.jpg"
              alt="everycare 답례품"
              width={600}
              height={980}
              className="h-full w-full object-cover"
              priority
            />
          </div>
        </section>
      </main>
      <footer className="border-t border-border px-5 py-6 text-center text-xs text-muted">
        © everycare ·{" "}
        <Link href="/admin" className="hover:text-brand hover:underline">
          관리자
        </Link>
      </footer>
    </>
  );
}
