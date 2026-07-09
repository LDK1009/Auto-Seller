//////////////////////////////////////// 인증 서비스 (Supabase Auth — 카카오 OAuth) ////////////////////////////////////////
// 컴포넌트·훅은 supabase 클라이언트를 직접 만지지 않고 이 서비스만 경유한다.
// Supabase 키 미설정 시: 세션 null·구독 no-op·로그인 시 안내 에러 (기능 강등, 크래시 금지).

import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

////////// 인증 인프라 준비 여부 (UI가 "준비 중" 분기에 사용)
export const isAuthConfigured = isSupabaseConfigured;

////////// 카카오 로그인 (현재 페이지로 복귀 — ?keyword= 상태 유지)
export async function signInWithKakao(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('로그인 기능 준비 중입니다.');
  }
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
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error(error);
    throw new Error('로그아웃에 실패했습니다.');
  }
}

////////// 현재 세션 1회 조회
export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

////////// 세션 변경 구독 (구독 해제 함수 반환)
export function subscribeAuthState(onChange: (session: Session | null) => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session);
  });
  return () => data.subscription.unsubscribe();
}
