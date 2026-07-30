//////////////////////////////////////// 인증 서비스 (Supabase Auth — 카카오 OAuth) ////////////////////////////////////////
// 컴포넌트·훅은 supabase 클라이언트를 직접 만지지 않고 이 서비스만 경유한다.
// Supabase 키 미설정 시: 세션 null·구독 no-op·로그인 시 안내 에러 (기능 강등, 크래시 금지).

import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

////////// 인증 인프라 준비 여부 (UI가 "준비 중" 분기에 사용)
export const isAuthConfigured = isSupabaseConfigured;

////////// 카카오 로그인 (현재 페이지로 복귀 — ?keyword= 등 상태 유지)
// 복귀는 항상 /auth/callback을 거친다 (2026-07-30 픽스):
//   현재 주소를 그대로 넘기면 랜딩(= origin + '/')에서 로그인할 때 Supabase 허용목록의
//   `도메인/**` 패턴에 매칭되지 않아(경로 세그먼트 0개) Site URL로 강제 착지한다 = 로컬에서 프로덕션으로 튐.
//   경로가 있는 고정 콜백으로 보내면 로컬·프로덕션·프리뷰 어디서든 origin 기준으로 정확히 돌아온다.
export async function signInWithKakao(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('로그인 기능 준비 중이에요.');
  }
  const nextPath = `${window.location.pathname}${window.location.search}`;
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo },
  });
  if (error) {
    console.error(error);
    throw new Error('카카오 로그인에 실패했어요. 잠시 후 다시 시도해주세요.');
  }
}

////////// 로그아웃
export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error(error);
    throw new Error('로그아웃에 실패했어요.');
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
