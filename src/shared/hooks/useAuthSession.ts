'use client';

//////////////////////////////////////// 인증 세션 훅 ////////////////////////////////////////
// 로그인 상태 + 액세스 토큰 노출. 로그인/로그아웃 액션은 authService 경유.

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getCurrentSession, subscribeAuthState } from '@/shared/services/authService';

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCurrentSession()
      .then((currentSession) => {
        if (isMounted) setSession(currentSession);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (isMounted) setIsSessionLoading(false);
      });

    const unsubscribe = subscribeAuthState((nextSession) => {
      if (isMounted) setSession(nextSession);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { session, isSessionLoading, accessToken: session?.access_token ?? null };
}
