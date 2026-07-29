//////////////////////////////////////// 크레딧 충전 (단건 결제) ////////////////////////////////////////
// 구독의 빌링키를 재사용해 충전팩 금액을 즉시 승인한다 (카드 재등록 없이).
// 빌링키가 없으면(비구독자) 카드 등록부터 요구 — 프론트가 /pricing으로 유도한다.
// 금액은 서버 상수(CREDIT_PACKS)에서만 읽는다 — 클라이언트가 보낸 금액은 신뢰하지 않는다.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/shared/services/supabaseServer';
import { chargeBillingKey, isTossConfigured } from '@/shared/services/tossServer';
import { findCreditPack, isBillingEnabled, BILLING_DISABLED_MESSAGE } from '@/shared/constants/billing';
import { grantCredits } from '@/shared/services/creditServer';

export async function POST(request: Request) {
  ////////// 킬스위치
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: BILLING_DISABLED_MESSAGE }, { status: 503 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serverClient = getSupabaseServerClient();
  if (!supabaseUrl || !supabaseAnonKey || !serverClient || !isTossConfigured()) {
    return NextResponse.json({ error: '결제 기능이 아직 준비되지 않았어요.' }, { status: 503 });
  }

  ////////// 로그인 검증
  const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!accessToken) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ error: '로그인이 만료됐어요. 다시 로그인해주세요.' }, { status: 401 });
  }
  const userId = userData.user.id;

  ////////// 팩 검증 (금액은 서버 상수 기준)
  const body = (await request.json().catch(() => null)) as { packId?: string } | null;
  const pack = body?.packId ? findCreditPack(body.packId) : null;
  if (!pack) return NextResponse.json({ error: '잘못된 충전 상품이에요.' }, { status: 400 });

  ////////// 등록된 카드(빌링키) 확인
  const { data: subscription } = await serverClient
    .from('subscriptions')
    .select('id, customer_key, billing_key')
    .eq('user_id', userId)
    .maybeSingle();
  if (!subscription?.billing_key) {
    return NextResponse.json(
      { error: '결제 카드가 등록되어 있지 않아요. 구독 관리에서 카드를 먼저 등록해주세요.', needsCard: true },
      { status: 409 },
    );
  }

  const orderId = `crd_${crypto.randomUUID()}`;
  try {
    const payment = await chargeBillingKey({
      billingKey: subscription.billing_key as string,
      customerKey: subscription.customer_key as string,
      amount: pack.price,
      orderId,
      orderName: `오토셀러 크레딧 ${pack.credits}개`,
    });

    const { data: paymentRow } = await serverClient
      .from('payments')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        order_id: orderId,
        payment_key: payment.paymentKey,
        amount: pack.price,
        status: 'done',
        kind: 'credit_pack',
        approved_at: payment.approvedAt ?? new Date().toISOString(),
        raw: payment,
      })
      .select('id')
      .single();

    const balance = await grantCredits(serverClient, {
      userId,
      amount: pack.credits,
      kind: 'purchase',
      paymentId: paymentRow?.id,
    });

    return NextResponse.json({ ok: true, credits: pack.credits, balance });
  } catch (error) {
    console.error(error);
    await serverClient.from('payments').insert({
      user_id: userId,
      subscription_id: subscription.id,
      order_id: orderId,
      amount: pack.price,
      status: 'failed',
      kind: 'credit_pack',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '결제 처리에 실패했어요.' },
      { status: 502 },
    );
  }
}
