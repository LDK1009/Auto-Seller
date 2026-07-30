//////////////////////////////////////// 라우트 진입점: /auth/callback ////////////////////////////////////////
// OAuth 복귀 착지 전용 — 색인 제외. useSearchParams 사용이라 Suspense 경계 필요.

import { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthCallbackView from '@/views/auth-callback/AuthCallbackView';

export const metadata: Metadata = {
  title: '로그인 중',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackView />
    </Suspense>
  );
}
