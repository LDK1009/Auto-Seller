//////////////////////////////////////// 내 크레딧 조회 ////////////////////////////////////////
// 잔액 + 최근 이력. 최초 호출 시 가입 보너스 10크레딧이 지급된다 (ensureBalance).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/shared/services/supabaseServer';
import { ensureBalance } from '@/shared/services/creditServer';

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serverClient = getSupabaseServerClient();
  if (!supabaseUrl || !supabaseAnonKey || !serverClient) {
    return NextResponse.json({ configured: false, balance: 0, transactions: [] });
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

  try {
    const { balance, signupBonusGranted } = await ensureBalance(serverClient, userData.user.id);
    const { data: transactions } = await serverClient
      .from('credit_transactions')
      .select('id, amount, kind, feature, balance_after, created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      configured: true,
      balance,
      signupBonusGranted,
      transactions: transactions ?? [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '크레딧 정보를 불러오지 못했어요.' }, { status: 500 });
  }
}
