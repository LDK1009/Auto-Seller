//////////////////////////////////////// 빌링키 발급 + 첫 결제 ////////////////////////////////////////
// 카드 등록 successUrl의 authKey를 빌링키로 교환 → 구독 upsert → 첫 결제 승인.
// 인증: Bearer 액세스 토큰 (keyword-verdict 패턴). 쓰기는 service role (RLS 우회 — 이 라우트가 유일한 쓰기 경로 중 하나).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/shared/services/supabaseServer';
import { issueBillingKey, chargeBillingKey, isTossConfigured } from '@/shared/services/tossServer';
import {
  SUBSCRIPTION_PLAN,
  BILLING_PERIOD_MONTHS,
  isBillingEnabled,
  BILLING_DISABLED_MESSAGE,
} from '@/shared/constants/billing';

////////// 다음 결제일 (개월 단위)
function nextPeriodEnd(from: Date): string {
  const next = new Date(from);
  next.setMonth(next.getMonth() + BILLING_PERIOD_MONTHS);
  return next.toISOString();
}

export async function POST(request: Request) {
  ////////// 🚨 결제 킬스위치 (2026-07-27) — 유료 기능 0개인 동안 신규 구독 차단
  // 빌링키 발급 = 첫 결제 승인까지 이어지므로 가장 앞에서 막는다.
  // 해제: Vercel 환경변수 BILLING_ENABLED=true (constants/billing.ts 주석의 선결 3개 확인 후)
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: BILLING_DISABLED_MESSAGE }, { status: 503 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serverClient = getSupabaseServerClient();
  if (!supabaseUrl || !supabaseAnonKey || !serverClient || !isTossConfigured()) {
    return NextResponse.json({ error: '결제 기능이 아직 준비되지 않았어요.' }, { status: 503 });
  }

  ////////// 1) 로그인 검증
  const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!accessToken) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ error: '로그인이 만료됐어요. 다시 로그인해주세요.' }, { status: 401 });
  }
  const userId = userData.user.id;

  ////////// 2) 요청 검증
  const body = (await request.json().catch(() => null)) as { authKey?: string; customerKey?: string } | null;
  if (!body?.authKey || !body?.customerKey) {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 });
  }

  try {
    ////////// 3) 빌링키 발급 (토스)
    const billing = await issueBillingKey(body.authKey, body.customerKey);

    ////////// 4) 구독 upsert (유저당 1행)
    const { data: subscription, error: upsertError } = await serverClient
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan: SUBSCRIPTION_PLAN.id,
          status: 'active',
          customer_key: body.customerKey,
          billing_key: billing.billingKey,
        },
        { onConflict: 'user_id' },
      )
      .select('id')
      .single();
    if (upsertError || !subscription) {
      console.error(upsertError);
      throw new Error('구독 정보를 저장하지 못했어요.');
    }

    ////////// 5) 첫 결제 승인 + 이력 기록
    const orderId = `sub_${crypto.randomUUID()}`;
    const payment = await chargeBillingKey({
      billingKey: billing.billingKey,
      customerKey: body.customerKey,
      amount: SUBSCRIPTION_PLAN.monthlyPrice,
      orderId,
      orderName: SUBSCRIPTION_PLAN.name,
    });

    const periodEnd = nextPeriodEnd(new Date());
    await serverClient.from('payments').insert({
      user_id: userId,
      subscription_id: subscription.id,
      order_id: orderId,
      payment_key: payment.paymentKey,
      amount: SUBSCRIPTION_PLAN.monthlyPrice,
      status: 'done',
      approved_at: payment.approvedAt ?? new Date().toISOString(),
      raw: payment,
    });
    await serverClient
      .from('subscriptions')
      .update({ current_period_end: periodEnd, status: 'active' })
      .eq('id', subscription.id);

    return NextResponse.json({ ok: true, periodEnd });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '결제 처리에 실패했어요.' },
      { status: 502 },
    );
  }
}
