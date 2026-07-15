//////////////////////////////////////// 라우트 진입점: /keyword-stats ////////////////////////////////////////
// 뷰가 useSearchParams를 쓰므로 Suspense 경계 필요 (정적 프리렌더 요건)

import { Suspense } from 'react';
import KeywordStatsView from '@/views/keyword-stats/KeywordStatsView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '키워드 분석 — 검색수·경쟁 강도로 틈새 찾기',
  description: '네이버 월간 검색수와 등록 상품 수를 비교해 틈새 키워드를 판정합니다. 무료, 가입 없음.',
  alternates: { canonical: '/keyword-stats' },
};

export default function Page() {
  return (
    <Suspense>
      <KeywordStatsView />
    </Suspense>
  );
}
