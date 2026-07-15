//////////////////////////////////////// 라우트 진입점: /roas-calculator ////////////////////////////////////////

import RoasCalculatorView from '@/views/roas-calculator/RoasCalculatorView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '광고 손익 계산기 — 손익분기 ROAS',
  description: '내 마진 기준 손익분기 ROAS와 광고 손익을 시뮬레이션합니다. 무료, 가입 없음.',
  alternates: { canonical: '/roas-calculator' },
};

export default function Page() {
  return <RoasCalculatorView />;
}
