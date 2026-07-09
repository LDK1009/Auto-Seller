//////////////////////////////////////// AI 판단 프록시 (로그인 게이트 + 일일 무료 제한) ////////////////////////////////////////
// 흐름: JWT 검증(Supabase) → KST 기준 오늘 사용량 확인(ai_verdict_usage, RLS) → Claude API 호출 → 사용 기록.
// 클라이언트가 이미 로드한 stat·detail을 그대로 받아 프롬프트를 구성한다 (추가 네이버 API 비용 0).
// 비용 통제: 저비용 모델(Haiku) + 일일 5회 제한 — 유료 전환 검증용 무료 티어.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { AiVerdict, AiVerdictLevel, AiVerdictResponse } from '@/shared/types/keywordVerdict';
import { AI_VERDICT_DAILY_LIMIT } from '@/shared/types/keywordVerdict';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'; // 짧은 판정 생성엔 Haiku로 충분 (비용 통제)
const FETCH_TIMEOUT_MS = 30_000;
const USAGE_TABLE = 'ai_verdict_usage';

const SYSTEM_PROMPT = `너는 한국 위탁판매(도매꾹·도매매 → 스마트스토어) 초보 셀러의 냉철한 소싱 조언가다.
주어진 네이버 실측 지표만 근거로 "이 키워드로 진입해도 되는가"를 판단한다.
규칙:
- 근거 없는 추측 금지, 지표에 없는 내용 언급 금지. 수치를 직접 인용할 것.
- 위로·과장 금지. 애매하면 "보류"로 판정하고 무엇을 더 확인해야 하는지 말할 것.
- 반드시 아래 JSON만 출력 (다른 텍스트·코드펜스 금지):
{"verdict":"추천|보류|비추천","summary":"2~3문장 종합 판단","reasons":["근거1","근거2","근거3"]}`;

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicApiKey || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ configured: false } satisfies AiVerdictResponse);
  }

  ////////// 1) 로그인 검증 (사용자 토큰으로 Supabase 접근 — RLS가 본인 행만 허용)
  const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!accessToken) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ error: '로그인이 만료됐습니다. 다시 로그인해주세요.' }, { status: 401 });
  }

  ////////// 2) 요청 본문 (클라이언트가 로드한 분석 데이터)
  let body: { keyword?: string; stat?: unknown; detail?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  const keyword = String(body.keyword ?? '').trim();
  if (keyword.length === 0 || !body.stat) {
    return NextResponse.json({ error: '분석 데이터(keyword, stat)가 필요합니다.' }, { status: 400 });
  }

  try {
    ////////// 3) 일일 사용량 확인 (KST 자정 기준)
    const kstDayStartUtc = getKstDayStartUtcIso();
    const { count, error: countError } = await supabase
      .from(USAGE_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userData.user.id)
      .gte('created_at', kstDayStartUtc);
    if (countError) {
      console.error('사용량 조회 실패 (테이블 미생성 가능성 — docs/launch/ai-verdict-setup.md):', countError);
      return NextResponse.json({ error: 'AI 판단 준비 중입니다. 잠시 후 다시 시도해주세요.' }, { status: 503 });
    }
    const usedToday = count ?? 0;
    if (usedToday >= AI_VERDICT_DAILY_LIMIT) {
      return NextResponse.json(
        { error: `오늘 무료 횟수(${AI_VERDICT_DAILY_LIMIT}회)를 모두 사용했어요. 내일 다시 이용할 수 있습니다.` },
        { status: 429 },
      );
    }

    ////////// 4) Claude 호출
    const rawText = await callClaude(anthropicApiKey, keyword, body.stat, body.detail ?? null);
    const parsed = parseVerdict(rawText);

    ////////// 5) 사용 기록 (실패해도 판정은 반환 — 사용자 손해 금지)
    const { error: insertError } = await supabase
      .from(USAGE_TABLE)
      .insert({ user_id: userData.user.id, keyword });
    if (insertError) console.error('사용 기록 실패:', insertError);

    const verdict: AiVerdict = { ...parsed, remaining: AI_VERDICT_DAILY_LIMIT - usedToday - 1 };
    return NextResponse.json({ configured: true, verdict } satisfies AiVerdictResponse);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'AI 판단에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }
}

//////////////////// Claude API 호출 ////////////////////
async function callClaude(apiKey: string, keyword: string, stat: unknown, detail: unknown): Promise<string> {
  const model = process.env.ANTHROPIC_VERDICT_MODEL ?? DEFAULT_MODEL;
  const prompt = [
    `키워드: ${keyword}`,
    '',
    '[기본 지표] (월간 검색수·클릭·등록 상품 수·경쟁강도 = 상품수÷검색수, 낮을수록 틈새)',
    JSON.stringify(stat),
    '',
    '[상세 지표] (12개월 트렌드·시즌성·기기/성별/연령/요일·가격대·브랜드 장악·실경쟁·블로그/카페 — null은 데이터 없음)',
    JSON.stringify(detail),
  ].join('\n');

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Anthropic API 오류 (HTTP ${response.status}): ${errorBody.slice(0, 200)}`);
  }
  const data = await response.json();
  return String(data?.content?.[0]?.text ?? '');
}

//////////////////// 응답 파싱 (JSON 강제 + 방어적 폴백) ////////////////////
function parseVerdict(rawText: string): Omit<AiVerdict, 'remaining'> {
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    const verdict: AiVerdictLevel = ['추천', '보류', '비추천'].includes(parsed.verdict) ? parsed.verdict : '보류';
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.map(String).slice(0, 5) : [];
    return { verdict, summary: String(parsed.summary ?? ''), reasons };
  } catch {
    // JSON 파싱 실패 시 원문을 요약문으로 (판정은 보수적으로 보류)
    return { verdict: '보류', summary: cleaned.slice(0, 300), reasons: [] };
  }
}

//////////////////// KST 자정 → UTC ISO ////////////////////
function getKstDayStartUtcIso(): string {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  const kstMidnightUtcMs =
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - KST_OFFSET_MS;
  return new Date(kstMidnightUtcMs).toISOString();
}
