//////////////////////////////////////// 구독 해지 ////////////////////////////////////////
// 해지 = status 'canceled' — 다음 크론부터 결제 제외, 이미 결제한 기간(current_period_end까지)은 이용 유지.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/shared/services/supabaseServer';

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serverClient = getSupabaseServerClient();
  if (!supabaseUrl || !supabaseAnonKey || !serverClient) {
    return NextResponse.json({ error: '준비되지 않았어요.' }, { status: 503 });
  }

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

  const { error: updateError } = await serverClient
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('user_id', userData.user.id);
  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ error: '해지 처리에 실패했어요.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
