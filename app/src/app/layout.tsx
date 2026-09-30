import type { Metadata } from "next";
import FloatingKakaoChat from "@/components/FloatingKakaoChat";
import "./globals.css";

export const metadata: Metadata = {
  title: "에브리케어 답례품 주문",
  description: "에브리케어 답례품 공동구매 주문서 및 배송 조회",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <FloatingKakaoChat />
      </body>
    </html>
  );
}
