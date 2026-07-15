//////////////////////////////////////// 라우트 진입점: /domeggook-import ////////////////////////////////////////
// Suspense: 뷰가 useSearchParams(?input= 자동 조회)를 쓰므로 정적 렌더 경계 필요.

import { Suspense } from 'react';
import DomeggookImportView from '@/views/domeggook-import/DomeggookImportView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '원링크 — 도매꾹 링크 하나로 스마트스토어 등록 준비',
  description: '도매꾹 링크를 붙여넣으면 이미지 편집(누끼·워터마크)부터 카테고리·상품명·판매가·태그까지 스마트스토어 등록 정보를 한 번에 준비합니다. 무료, 가입 없음.',
  alternates: { canonical: '/domeggook-import' },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DomeggookImportView />
    </Suspense>
  );
}
