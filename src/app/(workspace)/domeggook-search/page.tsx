//////////////////////////////////////// 라우트 진입점: /domeggook-search ////////////////////////////////////////
// 뷰가 useSearchParams를 쓰므로 Suspense 경계 필요 (정적 프리렌더 요건)

import { Suspense } from 'react';
import DomeggookSearchView from '@/views/domeggook-search/DomeggookSearchView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '도매꾹 검색 — 링크 없이 상품 소싱',
  description: '키워드로 도매꾹 상품을 검색해 인기순·가격·낱개 구매 필터로 위탁판매 후보를 발굴합니다. 무료, 가입 없음.',
  alternates: { canonical: '/domeggook-search' },
};

export default function Page() {
  return (
    <Suspense>
      <DomeggookSearchView />
    </Suspense>
  );
}
