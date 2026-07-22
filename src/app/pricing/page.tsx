//////////////////////////////////////// 라우트 진입점: /pricing ////////////////////////////////////////
// Suspense: 뷰가 useSearchParams(카드 등록 복귀 쿼리)를 쓰므로 정적 렌더 경계 필요.
// 판매 비노출 — noindex, sitemap 제외.

import { Suspense } from 'react';
import type { Metadata } from 'next';
import PricingView from '@/views/pricing/PricingView';

export const metadata: Metadata = {
  title: '구독 관리',
  robots: { index: false, follow: false }, // 판매 개시 전 비노출
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PricingView />
    </Suspense>
  );
}
