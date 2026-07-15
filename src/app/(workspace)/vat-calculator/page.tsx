//////////////////////////////////////// 라우트 진입점: /vat-calculator ////////////////////////////////////////

import VatCalculatorView from '@/views/vat-calculator/VatCalculatorView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '부가세 계산기 — 간이·일반 과세',
  description: '과세 유형별 부가세 납부 예상액을 계산합니다. 무료, 가입 없음.',
  alternates: { canonical: '/vat-calculator' },
};

export default function Page() {
  return <VatCalculatorView />;
}
