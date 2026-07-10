import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // 07-10 라우트 개명: domeme(도매매 연상) → domeggook — 구 URL 공유분 보존
      { source: "/domeme-import", destination: "/domeggook-import", permanent: true },
    ];
  },
};

export default nextConfig;
