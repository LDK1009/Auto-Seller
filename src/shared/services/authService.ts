//////////////////////////////////////// 인증 서비스 (Supabase Auth — 카카오 OAuth) ////////////////////////////////////////
// 컴포넌트·훅은 supabase 클라이언트를 직접 만지지 않고 이 서비스만 경유한다.

import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

////////// 카카오 로그인 (현재 페이지로 복귀 — ?keyword= 상태 유지)
export async function signInWithKakao(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: window.location.href },
  });
  if (error) {
    console.error(error);
    throw new Error('카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}

////////// 로그아웃
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error(error);
    throw new Error('로그아웃에 실패했습니다.');
  }
}

////////// 현재 세션 1회 조회
export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

////////// 세션 변경 구독 (구독 해제 함수 반환)
export function subscribeAuthState(onChange: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session);
  });
  return () => data.subscription.unsubscribe();
}
