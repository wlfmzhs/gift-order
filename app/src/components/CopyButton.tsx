"use client";

import { useState } from "react";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 접근 실패 시 조용히 무시 (직접 드래그해서 복사 가능)
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted hover:border-brand hover:text-brand"
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}
