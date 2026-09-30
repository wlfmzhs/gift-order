import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/logo.png"
            alt="everycare"
            width={140}
            height={19}
            priority
            className="h-5 w-auto"
          />
        </Link>
        <Link
          href="/lookup"
          className="text-sm text-muted hover:text-brand transition-colors"
        >
          주문 조회
        </Link>
      </div>
    </header>
  );
}
