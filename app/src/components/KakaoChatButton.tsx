import { KAKAO_CHAT_URL } from "@/lib/kakao";

export default function KakaoChatButton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <a
      href={KAKAO_CHAT_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#FEE500] px-6 py-3 text-sm font-medium text-[#191919] transition-opacity hover:opacity-90 ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#191919"
          d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.87 5.33 4.69 6.74l-.96 3.5a.4.4 0 0 0 .6.44L10.4 19.1c.52.06 1.05.1 1.6.1 5.52 0 10-3.58 10-8.2S17.52 3 12 3z"
        />
      </svg>
      카카오톡 상담하기
    </a>
  );
}
