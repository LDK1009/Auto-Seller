//////////////////////////////////////// 정기결제 승인 (크론) ////////////////////////////////////////
// pg_cron이 매일 호출 (starter-keywords/warm 패턴) — 결제일 도래한 active 구독을 일괄 승인.
// 보호: x-billing-token 헤더 = BILLING_CRON_TOKEN.
// 실패 시 past_due 전환 (재시도는 다음 크론 — past_due도 결제일 지난 것으로 취급해 재시도).

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/shared/services/supabaseServer';
import { chargeBillingKey, isTossConfigured } from '@/shared/services/tossServer';
import {
  SUBSCRIPTION_PLAN,
  BILLING_PERIOD_MONTHS,
  isBillingEnabled,
  BILLING_DISABLED_MESSAGE,
} from '@/shared/constants/billing';
import { grantSubscriptionCredits } from '@/shared/services/creditServer';

function nextPeriodEnd(from: Date): string {
  const next = new Date(from);
  next.setMonth(next.getMonth() + BILLING_PERIOD_MONTHS);
  return next.toISOString();
}

type DueSubscription = {
  id: string;
  user_id: string;
  status: string;
  customer_key: string;
  billing_key: string | null;
  current_period_end: string | null;
};

export async function POST(request: Request) {
  const cronToken = process.env.BILLING_CRON_TOKEN;
  if (!cronToken || request.headers.get('x-billing-token') !== cronToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  ////////// 🚨 결제 킬스위치 (2026-07-27) — 유료 기능 0개인 동안 실청구 차단
  // 크론이 계속 호출되더라도 여기서 멈춘다. 구독 상태는 건드리지 않는다(past_due 오염 방지).
  if (!isBillingEnabled()) {
    return NextResponse.json({ ok: true, skipped: 'billing_disabled', message: BILLING_DISABLED_MESSAGE });
  }

  const serverClient = getSupabaseServerClient();
  if (!serverClient || !isTossConfigured()) {
    return NextResponse.json({ error: '결제 기능이 아직 준비되지 않았어요.' }, { status: 503 });
  }

  ////////// 결제일 도래 구독 조회 (active + 재시도 대상 past_due)
  const { data: dueList, error: dueError } = await serverClient
    .from('subscriptions')
    .select('id, user_id, status, customer_key, billing_key, current_period_end')
    .in('status', ['active', 'past_due'])
    .not('billing_key', 'is', null)
    .lte('current_period_end', new Date().toISOString());
  if (dueError) {
    console.error(dueError);
    return NextResponse.json({ error: '구독 조회 실패' }, { status: 500 });
  }

  let charged = 0;
  let failed = 0;

  for (const subscription of (dueList ?? []) as DueSubscription[]) {
    const orderId = `sub_${crypto.randomUUID()}`;
    try {
      const payment = await chargeBillingKey({
        billingKey: subscription.billing_key as string,
        customerKey: subscription.customer_key,
        amount: SUBSCRIPTION_PLAN.monthlyPrice,
        orderId,
        orderName: SUBSCRIPTION_PLAN.name,
      });
      await serverClient.from('payments').insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        order_id: orderId,
        payment_key: payment.paymentKey,
        amount: SUBSCRIPTION_PLAN.monthlyPrice,
        status: 'done',
        kind: 'subscription',
        approved_at: payment.approvedAt ?? new Date().toISOString(),
        raw: payment,
      });
      await serverClient
        .from('subscriptions')
        .update({ status: 'active', current_period_end: nextPeriodEnd(new Date()) })
        .eq('id', subscription.id);
      // 갱신 결제 성공 = 이번 달 포함 크레딧 지급
      try {
        await grantSubscriptionCredits(serverClient, subscription.user_id, new Date().toISOString().slice(0, 7));
      } catch (creditError) {
        console.error('구독 크레딧 지급 실패:', subscription.user_id, creditError);
      }
      charged += 1;
    } catch (error) {
      console.error('정기결제 실패:', subscription.id, error);
      await serverClient.from('payments').insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        order_id: orderId,
        amount: SUBSCRIPTION_PLAN.monthlyPrice,
        status: 'failed',
        kind: 'subscription',
      });
      await serverClient.from('subscriptions').update({ status: 'past_due' }).eq('id', subscription.id);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, due: dueList?.length ?? 0, charged, failed });
}
