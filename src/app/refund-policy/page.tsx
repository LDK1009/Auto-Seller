//////////////////////////////////////// 라우트 진입점: /refund-policy ////////////////////////////////////////

import type { Metadata } from 'next';
import RefundPolicyView from '@/views/refund-policy/RefundPolicyView';

export const metadata: Metadata = {
  title: '환불 규정',
  description: '오토셀러 유료 구독 서비스 환불 규정입니다.',
  alternates: { canonical: '/refund-policy' },
};

export default function Page() {
  return <RefundPolicyView />;
}
