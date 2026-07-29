//////////////////////////////////////// AI 상세페이지 생성 (크레딧 5) ////////////////////////////////////////
// 섹션 여러 장을 순차 생성한다 (다중 이미지·긴 생성 = 크레딧 5, 가격정책 §4-5).
// 부분 실패 허용: 한 장이라도 성공하면 결과를 돌려주고, 전부 실패하면 크레딧을 환불한다.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/shared/services/supabaseServer';
import { spendCredits, refundCredits } from '@/shared/services/creditServer';
import {
  generateImage,
  buildDetailSectionPrompt,
  isImageGenerationConfigured,
} from '@/shared/services/imageGenerationServer';

export const maxDuration = 300; // 섹션 다중 생성

const MAX_SECTIONS = 5;

type SectionInput = { title: string; body: string };

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
    sections?: SectionInput[];
    image?: { base64: string; mimeType: string };
  } | null;
  const sections = (body?.sections ?? []).filter((section) => section?.title).slice(0, MAX_SECTIONS);
  if (!body?.productName || sections.length === 0 || !body?.image?.base64) {
    return NextResponse.json({ error: '상품명·섹션·참조 이미지가 필요해요.' }, { status: 400 });
  }

  ////////// 크레딧 선차감
  let spent = 0;
  try {
    const result = await spendCredits(serverClient, { userId, feature: 'detail_page' });
    spent = result.spent;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '크레딧이 부족해요.', needsCredits: true },
      { status: 402 },
    );
  }

  ////////// 섹션별 순차 생성 (동시 호출 시 rate limit — 순차가 안전)
  const images: { title: string; base64: string; mimeType: string }[] = [];
  for (const section of sections) {
    try {
      const generated = await generateImage({
        prompt: buildDetailSectionPrompt({
          productName: body.productName,
          sectionTitle: section.title,
          sectionBody: section.body ?? '',
        }),
        referenceImages: [body.image],
      });
      images.push({ title: section.title, base64: generated.base64, mimeType: generated.mimeType });
    } catch (error) {
      console.error('상세 섹션 생성 실패:', section.title, error);
    }
  }

  if (images.length === 0) {
    await refundCredits(serverClient, { userId, amount: spent });
    return NextResponse.json(
      { error: '상세페이지를 만들지 못했어요. 크레딧은 돌려드렸어요.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, images, creditsSpent: spent, requested: sections.length });
}
