//////////////////////////////////////// 라우트 진입점: /image-check ////////////////////////////////////////

import ImageCheckView from '@/views/image-check/ImageCheckView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '규정 검사 — 대표이미지 규격 즉시 확인',
  description: '대표이미지가 마켓 규정(해상도·비율·용량)에 맞는지 브라우저에서 즉시 검사합니다. 무료, 가입 없음.',
  alternates: { canonical: '/image-check' },
};

export default function Page() {
  return <ImageCheckView />;
}
