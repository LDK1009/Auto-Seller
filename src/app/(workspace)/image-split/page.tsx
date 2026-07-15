//////////////////////////////////////// 라우트 진입점: /image-split ////////////////////////////////////////

import ImageSplitView from '@/views/image-split/ImageSplitView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '상세 분할 — 긴 상세페이지 자동 분할',
  description: '긴 상세 이미지를 마켓 높이 제한에 맞춰 순서대로 자동 분할합니다. 무료, 가입 없음.',
  alternates: { canonical: '/image-split' },
};

export default function Page() {
  return <ImageSplitView />;
}
