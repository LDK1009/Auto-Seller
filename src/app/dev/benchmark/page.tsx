//////////////////////////////////////// 라우트 진입점: /dev/benchmark (개발용 — 네비 미노출) ////////////////////////////////////////

import BenchmarkView from '@/views/dev-benchmark/BenchmarkView';

import type { Metadata } from 'next';

// 내부 벤치마크 — 검색엔진 색인 제외
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BenchmarkView />;
}
