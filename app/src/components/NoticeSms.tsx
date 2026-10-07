"use client";

import { useState } from "react";
import { buildNoticeMessage } from "@/lib/noticeMessage";

// 확인사항이 있는 행에서 안내 문자를 만들어 문자 앱으로 보내거나 복사한다.
export default function NoticeSms({
  customerName,
  phone,
  notes,
}: {
  customerName: string;
  phone: string;
  notes: string[];
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const generated = buildNoticeMessage(
    customerName,
    notes,
    typeof window !== "undefined" ? `${window.location.origin}/order/new` : ""
  );
  if (!generated) return null;

  const toggle = () => {
    if (!open) setText(generated); // 열 때마다 최신 확인사항으로 문구를 새로 만든다
    setOpen(!open);
  };

  const digits = phone.replace(/[^\d+]/g, "");
  // iOS는 번호와 본문 사이를 &로, 안드로이드는 ?로 이어야 본문이 채워진다.
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const smsHref = `sms:${digits}${isIOS ? "&" : "?"}body=${encodeURIComponent(text)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 무시: 직접 드래그해서 복사할 수 있음
    }
  };

  return (
    <div className="mt-1">
      <button
        onClick={toggle}
        className="rounded-full border border-brand px-2.5 py-0.5 text-[11px] font-medium text-brand hover:bg-brand hover:text-white"
      >
        {open ? "문자 닫기" : "안내 문자"}
      </button>
      {open && (
        <div className="mt-1 w-[18rem] rounded-lg border border-border bg-surface p-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            className="w-full resize-y rounded border border-border bg-background p-1.5 text-xs"
          />
          <div className="mt-1 flex gap-1">
            <a
              href={smsHref}
              className="rounded-full bg-brand px-3 py-1 text-[11px] font-medium text-white hover:bg-brand-dark"
            >
              문자 앱 열기 ({phone})
            </a>
            <button
              onClick={handleCopy}
              className="rounded-full border border-border px-3 py-1 text-[11px] font-medium hover:border-brand"
            >
              {copied ? "복사됨!" : "문구 복사"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
