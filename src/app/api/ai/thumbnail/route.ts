//////////////////////////////////////// AI 썸네일 생성 (크레딧 1) ////////////////////////////////////////
// 순서: 로그인 검증 → 크레딧 선차감 → 생성 → 실패 시 환불.
// 선차감 이유: 생성이 성공했는데 차감 실패로 무료 사용되는 구멍을 막는다 (돈이 나가는 쪽을 먼저 잠근다).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/shared/services/supabaseServer';
import { spendCredits, refundCredits } from '@/shared/services/creditServer';
import {
  generateImage,
  buildThumbnailPrompt,
  isImageGenerationConfigured,
} from '@/shared/services/imageGenerationServer';

export const maxDuration = 120; // 이미지 생성은 수 초~수십 초

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serverClient = getSupabaseServerClient();
  if (!supabaseUrl || !supabaseAnonKey || !serverClient || !isImageGenerationConfigured()) {
    return NextResponse.json({ configured: false, error: 'AI 생성 기능을 준비하고 있어요.' }, { status: 503 });
  }

  ////////// 로그인
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

  ////////// 입력
  const body = (await request.json().catch(() => null)) as {
    productName?: string;
    style?: string;
    headline?: string;
    image?: { base64: string; mimeType: string };
  } | null;
  if (!body?.productName || !body?.image?.base64) {
    return NextResponse.json({ error: '상품명과 참조 이미지가 필요해요.' }, { status: 400 });
  }

  ////////// 크레딧 선차감
  let spent = 0;
  try {
    const result = await spendCredits(serverClient, { userId, feature: 'thumbnail' });
    spent = result.spent;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '크레딧이 부족해요.', needsCredits: true },
      { status: 402 },
    );
  }

  ////////// 생성
  try {
    const generated = await generateImage({
      prompt: buildThumbnailPrompt({
        productName: body.productName,
        style: body.style ?? '깔끔한 흰 배경, 밝고 선명한 조명',
        headline: body.headline,
      }),
      referenceImages: [body.image],
    });
    return NextResponse.json({ ok: true, image: generated, creditsSpent: spent });
  } catch (error) {
    console.error(error);
    await refundCredits(serverClient, { userId, amount: spent }); // 실패했으니 되돌린다
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '이미지 생성에 실패했어요. 크레딧은 돌려드렸어요.' },
      { status: 502 },
    );
  }
}
