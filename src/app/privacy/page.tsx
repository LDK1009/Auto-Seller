//////////////////////////////////////// 라우트 진입점: /privacy ////////////////////////////////////////

import type { Metadata } from 'next';
import PrivacyView from '@/views/privacy/PrivacyView';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '오토셀러 개인정보처리방침입니다.',
  alternates: { canonical: '/privacy' },
};

export default function Page() {
  return <PrivacyView />;
}
