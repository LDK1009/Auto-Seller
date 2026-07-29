//////////////////////////////////////// 품절 감시 목록 (조회·추가·삭제) ////////////////////////////////////////
// 감시는 구독자 전용 기능. 50개 상한(가격정책 §5 원가 방어선)은 여기서 강제한다.

import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/shared/services/supabaseServer';
import { SUBSCRIPTION_PLAN } from '@/shared/constants/billing';

type AuthContext = { client: SupabaseClient; userId: string };

////////// 공통: 로그인 검증 + 서버 클라이언트
async function authenticate(request: Request): Promise<AuthContext | NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serverClient = getSupabaseServerClient();
  if (!supabaseUrl || !supabaseAnonKey || !serverClient) {
    return NextResponse.json({ error: '준비되지 않았어요.' }, { status: 503 });
  }
  const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!accessToken) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return NextResponse.json({ error: '로그인이 만료됐어요. 다시 로그인해주세요.' }, { status: 401 });
  }
  return { client: serverClient, userId: data.user.id };
}

////////// 구독 상태 확인 (감시는 구독자 전용)
async function hasActiveSubscription(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await client
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return false;
  // 해지했어도 이용 기간이 남아 있으면 유효
  const periodValid = data.current_period_end ? new Date(data.current_period_end) > new Date() : false;
  return data.status === 'active' || (data.status === 'canceled' && periodValid);
}

//////////////////// 목록 조회 ////////////////////
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const subscribed = await hasActiveSubscription(auth.client, auth.userId);
  const { data, error } = await auth.client
    .from('watch_products')
    .select('id, product_no, title, thumb_url, last_status, last_checked_at, notified_at, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return NextResponse.json({ error: '감시 목록을 불러오지 못했어요.' }, { status: 500 });
  }
  return NextResponse.json({
    subscribed,
    limit: SUBSCRIPTION_PLAN.watchLimit,
    items: data ?? [],
  });
}

//////////////////// 감시 추가 ////////////////////
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  if (!(await hasActiveSubscription(auth.client, auth.userId))) {
    return NextResponse.json(
      { error: '품절 자동감시는 구독 기능이에요.', needsSubscription: true },
      { status: 402 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    productNo?: string;
    title?: string;
    thumbUrl?: string;
  } | null;
  if (!body?.productNo || !body?.title) {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 });
  }

  ////////// 50개 상한 (알림톡 원가 방어)
  const { count } = await auth.client
    .from('watch_products')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId);
  if ((count ?? 0) >= SUBSCRIPTION_PLAN.watchLimit) {
    return NextResponse.json(
      { error: `감시는 최대 ${SUBSCRIPTION_PLAN.watchLimit}개까지 가능해요. 목록에서 안 쓰는 상품을 정리해주세요.` },
      { status: 409 },
    );
  }

  const { error } = await auth.client.from('watch_products').upsert(
    {
      user_id: auth.userId,
      product_no: body.productNo,
      title: body.title,
      thumb_url: body.thumbUrl ?? null,
    },
    { onConflict: 'user_id,product_no' },
  );
  if (error) {
    console.error(error);
    return NextResponse.json({ error: '감시 추가에 실패했어요.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

//////////////////// 감시 해제 ////////////////////
export async function DELETE(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const productNo = searchParams.get('productNo');
  if (!productNo) return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 });

  const { error } = await auth.client
    .from('watch_products')
    .delete()
    .eq('user_id', auth.userId)
    .eq('product_no', productNo);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: '감시 해제에 실패했어요.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
