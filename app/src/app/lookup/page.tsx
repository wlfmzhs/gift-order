"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { lookupOrderAction } from "@/lib/actions/lookup";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors";

export default function LookupPage() {
  const router = useRouter();
  const [recipientName, setRecipientName] = useState("");
  const [phoneTail, setPhoneTail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await lookupOrderAction(recipientName, phoneTail);
      if (!result.ok || !result.orderCode) {
        setError(result.message ?? "조회에 실패했습니다.");
        return;
      }
      router.push(`/order/${result.orderCode}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-md px-5 py-14">
          <h1 className="text-xl font-semibold">내 주문 조회</h1>
          <p className="mt-2 text-sm text-muted">
            받는분 성함과 연락처 뒤 4자리를 입력하시면 제출하신 주문 내용과
            배송현황을 확인하실 수 있어요.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium">받는분 성함</label>
              <input
                className={inputClass}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">받는분 연락처 뒤 4자리</label>
              <input
                className={inputClass}
                inputMode="numeric"
                maxLength={4}
                value={phoneTail}
                onChange={(e) => setPhoneTail(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand py-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? "조회 중..." : "조회하기"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
