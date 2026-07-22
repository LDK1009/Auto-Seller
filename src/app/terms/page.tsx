//////////////////////////////////////// 라우트 진입점: /terms ////////////////////////////////////////

import type { Metadata } from 'next';
import TermsView from '@/views/terms/TermsView';

export const metadata: Metadata = {
  title: '이용약관',
  description: '오토셀러 서비스 이용약관입니다.',
  alternates: { canonical: '/terms' },
};

export default function Page() {
  return <TermsView />;
}
