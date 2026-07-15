//////////////////////////////////////// 라우트 진입점: /background-removal ////////////////////////////////////////

import BackgroundRemovalView from '@/views/background-removal/BackgroundRemovalView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '누끼 (배경 제거) — 여러 장 한 번에',
  description: '상품 이미지 배경을 브라우저에서 한 번에 제거하고 단색·패턴·그라데이션 배경으로 교체합니다. 무료, 가입 없음, 서버 업로드 없음.',
  alternates: { canonical: '/background-removal' },
};

export default function Page() {
  return <BackgroundRemovalView />;
}
