"use client";

import { usePathname } from "next/navigation";
import { KAKAO_CHAT_URL } from "@/lib/kakao";

export default function FloatingKakaoChat() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <a
      href={KAKAO_CHAT_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="카카오톡 상담하기"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#FEE500] px-4 py-3 text-sm font-medium text-[#191919] shadow-lg transition-opacity hover:opacity-90"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#191919"
          d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.87 5.33 4.69 6.74l-.96 3.5a.4.4 0 0 0 .6.44L10.4 19.1c.52.06 1.05.1 1.6.1 5.52 0 10-3.58 10-8.2S17.52 3 12 3z"
        />
      </svg>
      카톡 상담
    </a>
  );
}
