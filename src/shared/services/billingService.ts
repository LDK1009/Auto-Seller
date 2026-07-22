//////////////////////////////////////// 구독·결제 서비스 (클라이언트) ////////////////////////////////////////
// 카드 등록(토스 SDK)·빌링키 발급·해지·내 구독 조회. 컴포넌트는 훅 경유로만 사용.

import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { getSupabaseClient } from './supabase';
import type { Subscription } from '@/shared/types/billing';

export const isBillingConfigured = Boolean(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);

////////// 내 구독 조회 (RLS — 본인 행만, billing_key 컬럼은 서버 전용이라 미조회)
export async function fetchMySubscription(): Promise<Subscription | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan, status, customer_key, current_period_end, created_at, updated_at')
    .maybeSingle();
  if (error) {
    console.error(error);
    throw new Error('구독 정보를 불러오지 못했습니다.');
  }
  return data as Subscription | null;
}

////////// 카드 등록 시작 — 토스 카드 등록창 → successUrl로 authKey 복귀
export async function startCardRegistration(customerKey: string): Promise<void> {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) throw new Error('결제 기능이 아직 준비되지 않았습니다.');

  const tossPayments = await loadTossPayments(clientKey);
  const payment = tossPayments.payment({ customerKey });
  await payment.requestBillingAuth({
    method: 'CARD',
    successUrl: `${window.location.origin}/pricing?result=success`,
    failUrl: `${window.location.origin}/pricing?result=fail`,
  });
}

////////// 빌링키 발급 + 첫 결제 (successUrl 복귀 후 호출)
export async function issueBillingKey(params: {
  accessToken: string;
  authKey: string;
  customerKey: string;
}): Promise<void> {
  const response = await fetch('/api/billing/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({ authKey: params.authKey, customerKey: params.customerKey }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? '결제 처리에 실패했습니다.');
}

////////// 구독 해지
export async function cancelSubscription(accessToken: string): Promise<void> {
  const response = await fetch('/api/billing/cancel', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? '해지 처리에 실패했습니다.');
}
