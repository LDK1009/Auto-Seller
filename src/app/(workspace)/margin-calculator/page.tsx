//////////////////////////////////////// 라우트 진입점: /margin-calculator ////////////////////////////////////////

import MarginCalculatorView from '@/views/margin-calculator/MarginCalculatorView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '마진 계산기 — 순이익과 목표 마진 판매가 역산',
  description: '원가·수수료·배송비를 넣으면 순이익을 계산하고 목표 마진에 맞는 최소 판매가를 역산합니다. 무료, 가입 없음.',
  alternates: { canonical: '/margin-calculator' },
};

export default function Page() {
  return <MarginCalculatorView />;
}
