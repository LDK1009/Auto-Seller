//////////////////////////////////////// 라우트 진입점: /watermark ////////////////////////////////////////

import WatermarkView from '@/views/watermark/WatermarkView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '워터마크 — 텍스트·로고 일괄 합성',
  description: '이미지 도용 방지 워터마크를 여러 상품 이미지에 한 번에 합성합니다. 무료, 가입 없음, 서버 업로드 없음.',
  alternates: { canonical: '/watermark' },
};

export default function Page() {
  return <WatermarkView />;
}
