//////////////////////////////////////// 크레딧 서버 서비스 ////////////////////////////////////////
// 잔액 변경은 전부 여기를 지난다 (서버 전용 — service role). 클라이언트는 잔액을 읽기만 한다.
// 원칙: 잔액과 이력을 항상 함께 기록한다 (balance_after 스냅샷으로 감사 가능).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CREDIT_COST,
  SIGNUP_BONUS_CREDITS,
  SUBSCRIPTION_PLAN,
  type CreditFeature,
} from '@/shared/constants/billing';

type TransactionKind = 'signup' | 'subscription' | 'purchase' | 'spend' | 'refund';

////////// 잔액 행 확보 (없으면 생성 + 가입 보너스 지급)
// 신규 유저가 크레딧 기능에 처음 닿는 순간 10크레딧을 지급한다 (signup_bonus_granted로 1회 보장).
export async function ensureBalance(
  client: SupabaseClient,
  userId: string,
): Promise<{ balance: number; signupBonusGranted: boolean }> {
  const { data: existing } = await client
    .from('credit_balances')
    .select('balance, signup_bonus_granted')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return { balance: existing.balance as number, signupBonusGranted: existing.signup_bonus_granted as boolean };
  }

  // 최초 진입 — 가입 보너스와 함께 생성
  const { error } = await client.from('credit_balances').insert({
    user_id: userId,
    balance: SIGNUP_BONUS_CREDITS,
    signup_bonus_granted: true,
  });
  if (error && error.code !== '23505') {
    // 23505 = 동시 요청으로 이미 생성됨 (무시하고 재조회)
    console.error(error);
    throw new Error('크레딧 정보를 불러오지 못했어요.');
  }
  if (!error) {
    await client.from('credit_transactions').insert({
      user_id: userId,
      amount: SIGNUP_BONUS_CREDITS,
      kind: 'signup',
      balance_after: SIGNUP_BONUS_CREDITS,
    });
    return { balance: SIGNUP_BONUS_CREDITS, signupBonusGranted: true };
  }

  const { data: retried } = await client
    .from('credit_balances')
    .select('balance, signup_bonus_granted')
    .eq('user_id', userId)
    .single();
  return { balance: retried?.balance ?? 0, signupBonusGranted: retried?.signup_bonus_granted ?? false };
}

////////// 지급 (구독 월 지급·충전·환불)
export async function grantCredits(
  client: SupabaseClient,
  params: { userId: string; amount: number; kind: TransactionKind; paymentId?: string },
): Promise<number> {
  const { balance } = await ensureBalance(client, params.userId);
  const nextBalance = balance + params.amount;

  const { error } = await client
    .from('credit_balances')
    .update({ balance: nextBalance })
    .eq('user_id', params.userId);
  if (error) {
    console.error(error);
    throw new Error('크레딧 지급에 실패했어요.');
  }

  await client.from('credit_transactions').insert({
    user_id: params.userId,
    amount: params.amount,
    kind: params.kind,
    balance_after: nextBalance,
    payment_id: params.paymentId ?? null,
  });
  return nextBalance;
}

////////// 구독 월 크레딧 지급 (같은 주기 중복 지급 방지)
export async function grantSubscriptionCredits(
  client: SupabaseClient,
  userId: string,
  period: string, // 'YYYY-MM'
): Promise<void> {
  await ensureBalance(client, userId);
  const { data } = await client
    .from('credit_balances')
    .select('subscription_grant_period')
    .eq('user_id', userId)
    .single();
  if (data?.subscription_grant_period === period) return; // 이미 지급함

  await grantCredits(client, {
    userId,
    amount: SUBSCRIPTION_PLAN.includedCredits,
    kind: 'subscription',
  });
  await client.from('credit_balances').update({ subscription_grant_period: period }).eq('user_id', userId);
}

////////// 소모 (AI 생성 실행 직전) — 잔액 부족 시 throw
export async function spendCredits(
  client: SupabaseClient,
  params: { userId: string; feature: CreditFeature },
): Promise<{ spent: number; balanceAfter: number }> {
  const cost = CREDIT_COST[params.feature];
  const { balance } = await ensureBalance(client, params.userId);
  if (balance < cost) {
    throw new Error(`크레딧이 부족해요. (필요 ${cost}개 · 보유 ${balance}개)`);
  }
  const nextBalance = balance - cost;

  // 낙관적 차감 — 현재 잔액이 그대로일 때만 갱신 (동시 요청 이중 차감 방지)
  const { data, error } = await client
    .from('credit_balances')
    .update({ balance: nextBalance })
    .eq('user_id', params.userId)
    .eq('balance', balance)
    .select('balance');
  if (error || !data || data.length === 0) {
    throw new Error('크레딧 처리 중 문제가 생겼어요. 다시 시도해주세요.');
  }

  await client.from('credit_transactions').insert({
    user_id: params.userId,
    amount: -cost,
    kind: 'spend',
    feature: params.feature,
    balance_after: nextBalance,
  });
  return { spent: cost, balanceAfter: nextBalance };
}

////////// 환불 (생성 실패 시 되돌림)
export async function refundCredits(
  client: SupabaseClient,
  params: { userId: string; amount: number },
): Promise<void> {
  await grantCredits(client, { userId: params.userId, amount: params.amount, kind: 'refund' });
}
