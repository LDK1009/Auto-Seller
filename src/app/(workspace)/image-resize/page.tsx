//////////////////////////////////////// 라우트 진입점: /image-resize ////////////////////////////////////////

import ImageResizeView from '@/views/image-resize/ImageResizeView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '규격 맞추기 — 마켓 대표이미지 일괄 변환',
  description: '스마트스토어·쿠팡 등 마켓별 대표이미지 규격(1000×1000 등)에 맞춰 여러 장을 일괄 변환합니다. 무료, 가입 없음.',
  alternates: { canonical: '/image-resize' },
};

export default function Page() {
  return <ImageResizeView />;
}
