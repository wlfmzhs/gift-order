import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 홈페이지 주문 엑셀 업로드(Server Action)용. 기본 1MB는 주문이 쌓이면 모자랄 수 있다.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
