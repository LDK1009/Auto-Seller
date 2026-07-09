//////////////////////////////////////// 시작 키워드 워밍 (크론 전용 트리거) ////////////////////////////////////////
// pg_cron이 매일 새벽 호출 → 전 카테고리(전체+대분류 10) 파이프라인 계산 → starter_keywords_cache upsert.
// 클라이언트는 이 라우트를 쓰지 않는다 (테이블을 직접 SELECT — 읽기 공개 RLS).
// 보호: WARM_TOKEN 헤더 — 지키는 건 데이터가 아니라 네이버 API 예산 (1회 실행 ≈ 수백 콜).
// 데이터랩 절감: 키워드 시즌성 판정을 keyword_seasonality에 30일 캐시 (일 ~130콜 → ~20콜).

import { createHmac } from 'crypto';
import { NextResponse, after } from 'next/server';
import { getSupabaseServerClient } from '@/shared/services/supabaseServer';
import type { KeywordStat } from '@/shared/types/keywordStats';
import { NAVER_TOP_CATEGORIES, type NaverTopCategory } from '@/shared/constants/naverCategories';

export const maxDuration = 300; // 전 카테고리 워밍 최악 케이스 수 분 (202 응답 후 after()로 계속)

const FETCH_TIMEOUT_MS = 10_000;
const CANDIDATE_LIMIT = 120; // 심화 탐색 상한 (시즌 키워드는 검색량 상위에 드물어 깊이 파야 함)
const DEEPEN_BATCH_SIZE = 20; // 20개 단위로 검증·판정하며 두 표가 차면 조기 종료
const TABLE_SIZE = 10;
const MIN_PRODUCT_COUNT = 1000; // 상품 키워드 판별 하한 (정보성 키워드는 등록 상품이 거의 없음)
const SEASONALITY_CACHE_DAYS = 30; // 시즌성은 월 단위로도 거의 안 변함

// 비상품(정보·서비스·행사) 키워드 배제 — 광고 키워드 풀의 노이즈 (실측: 계산기·피부과·베이비페어 등)
const NON_PRODUCT_PATTERN =
  /근처|피부과|병원|의원|클리닉|한의원|약국|학원|시세|환율|날씨|계산기|사주|운세|로또|번역|주가|증권|채용|알바|시간표|고객센터|전화번호|홈페이지|사이트|다운로드|페어|박람회|전시회|맛집|호텔|펜션|리조트|영화|드라마|웹툰|게임/;

// 네이버쇼핑 공식 대분류 → 대표 상품군 시드 (시드는 안정적 — 결과 키워드는 API가 매일 갱신)
const SEED_GROUPS: Record<NaverTopCategory, string[]> = {
  '패션의류': ['여성 원피스'],
  '패션잡화': ['가방', '양말'],
  '화장품/미용': ['스킨케어'],
  '디지털/가전': ['휴대폰 액세서리'],
  '가구/인테리어': ['인테리어 소품', '수납장'],
  '출산/육아': ['유아용품'],
  '식품': ['간편식'],
  '스포츠/레저': ['캠핑용품', '홈트레이닝'],
  '생활/건강': ['주방용품', '반려동물용품', '욕실용품'],
  '여가/생활편의': ['차량용품', '문구'],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: Request) {
  ////////// 토큰 검증 (API 예산 보호 — pg_cron·운영자만 트리거 가능)
  const warmToken = process.env.WARM_TOKEN;
  const authorization = request.headers.get('authorization') ?? '';
  if (!warmToken || authorization !== `Bearer ${warmToken}`) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const adApiKey = process.env.NAVER_SEARCHAD_API_KEY;
  const adSecret = process.env.NAVER_SEARCHAD_SECRET_KEY;
  const adCustomer = process.env.NAVER_SEARCHAD_CUSTOMER_ID;
  const clientId = process.env.NAVER_OPENAPI_CLIENT_ID;
  const clientSecret = process.env.NAVER_OPENAPI_CLIENT_SECRET;
  const supabase = getSupabaseServerClient();
  if (!adApiKey || !adSecret || !adCustomer || !clientId || !clientSecret || !supabase) {
    return NextResponse.json({ error: '서버 키 미설정 (네이버 5종 + SUPABASE_SECRET_KEY 필요)' }, { status: 503 });
  }

  // pg_net 타임아웃(수 초)보다 워밍(수 분)이 길다 — 즉시 202 응답 후 백그라운드에서 계속
  after(async () => {
    try {
      await warmAllCategories({
        adAuth: { apiKey: adApiKey, secretKey: adSecret, customerId: adCustomer },
        openApiHeaders: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
          'Content-Type': 'application/json',
        },
        clientId,
        clientSecret,
      });
    } catch (error) {
      console.error('시작 키워드 워밍 실패:', error);
    }
  });

  return NextResponse.json({ started: true }, { status: 202 });
}

//////////////////// 전 카테고리 워밍 ////////////////////
type WarmContext = {
  adAuth: { apiKey: string; secretKey: string; customerId: string };
  openApiHeaders: Record<string, string>;
  clientId: string;
  clientSecret: string;
};

async function warmAllCategories(context: WarmContext) {
  const targets: ('all' | NaverTopCategory)[] = ['all', ...NAVER_TOP_CATEGORIES];
  for (const category of targets) {
    const startedAt = Date.now();
    try {
      const result = await computeCategory(category, context);
      const supabase = getSupabaseServerClient();
      if (!supabase) return;
      const { error } = await supabase.from('starter_keywords_cache').upsert(
        {
          category,
          payload: { seasonal: result.seasonal, steady: result.steady },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'category' },
      );
      if (error) console.error(`[warm] ${category} upsert 실패:`, error);
      else
        console.log(
          `[warm] ${category}: 시즌 ${result.seasonal.length} · 꾸준 ${result.steady.length} (${Math.round((Date.now() - startedAt) / 1000)}s)`,
        );
    } catch (error) {
      console.error(`[warm] ${category} 계산 실패:`, error);
    }
  }
}

//////////////////// 카테고리 1개 파이프라인 (시드→풀→랭킹→검증→시즌성→분리) ////////////////////
async function computeCategory(
  category: 'all' | NaverTopCategory,
  context: WarmContext,
): Promise<{ seasonal: KeywordStat[]; steady: KeywordStat[] }> {
  const seedKeywords = category === 'all' ? Object.values(SEED_GROUPS).flat() : SEED_GROUPS[category];

  ////////// 1) 시드 → 연관 키워드 풀 (검색량 절대치)
  const pool = new Map<string, number>();
  const seedSet = new Set(seedKeywords.map((seed) => seed.replace(/\s+/g, '')));
  for (let index = 0; index < seedKeywords.length; index += 5) {
    const batch = seedKeywords.slice(index, index + 5);
    const rows = await fetchKeywordTool(batch, context.adAuth).catch(() => []);
    for (const row of rows) {
      const keyword = String(row.relKeyword ?? '').replace(/\s+/g, '');
      if (keyword.length === 0 || seedSet.has(keyword)) continue;
      if (NON_PRODUCT_PATTERN.test(keyword)) continue;
      const monthly = parseCount(row.monthlyPcQcCnt).value + parseCount(row.monthlyMobileQcCnt).value;
      if (monthly < 1000) continue;
      pool.set(keyword, Math.max(pool.get(keyword) ?? 0, monthly));
    }
  }

  ////////// 2) 검색량 내림차순 랭킹
  const rankedCandidates = Array.from(pool.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, CANDIDATE_LIMIT)
    .map(([keyword, monthly]) => ({ keyword, monthly }));

  ////////// 3~5) 심화 탐색: 20개씩 [상품 검증 → 시즌성 판정 → 분류], 두 표가 차면 조기 종료
  const shopMetaByKeyword = new Map<string, { total: number | null; category: string | null }>();
  const seasonal: { keyword: string; monthly: number }[] = [];
  const steady: { keyword: string; monthly: number }[] = [];

  for (
    let batchStart = 0;
    batchStart < rankedCandidates.length && (seasonal.length < TABLE_SIZE || steady.length < TABLE_SIZE);
    batchStart += DEEPEN_BATCH_SIZE
  ) {
    const batch = rankedCandidates.slice(batchStart, batchStart + DEEPEN_BATCH_SIZE);

    // (a) shop 메타 — 상품 키워드 검증 겸용 (3콜 병렬 청크 + 간격, 429 방어)
    for (let index = 0; index < batch.length; index += 3) {
      const chunk = batch.slice(index, index + 3).map((entry) => entry.keyword);
      const results = await Promise.all(
        chunk.map((keyword) => fetchShopMeta(keyword, context.clientId, context.clientSecret)),
      );
      chunk.forEach((keyword, chunkIndex) => shopMetaByKeyword.set(keyword, results[chunkIndex]));
      if (index + 3 < batch.length) await sleep(320);
    }
    const validBatch = batch.filter((entry) => {
      const meta = shopMetaByKeyword.get(entry.keyword);
      if (meta?.total === null || meta?.total === undefined || meta.total < MIN_PRODUCT_COUNT) return false;
      if (category !== 'all' && meta.category?.split(' > ')[0] !== category) return false;
      return true;
    });

    // (b) 시즌성 판정 — DB 30일 캐시 우선, 미판정분만 데이터랩
    const seasonality = await judgeSeasonalityWithCache(
      validBatch.map((entry) => entry.keyword),
      context.openApiHeaders,
    );

    // (c) 분류 — 검색량 순서 유지, 찬 표는 건너뜀
    const currentMonth = new Date().getMonth() + 1;
    for (const entry of validBatch) {
      const judged = seasonality.get(entry.keyword);
      if (!judged) continue;
      const isInSeason = judged.isSeasonal && judged.peakMonths.includes(currentMonth);
      if (judged.isSeasonal && isInSeason && seasonal.length < TABLE_SIZE) seasonal.push(entry);
      else if (!judged.isSeasonal && steady.length < TABLE_SIZE) steady.push(entry);
    }
  }

  ////////// 조립 (KeywordStat 형태 — 표 컴포넌트 재사용)
  const toStat = (entry: { keyword: string; monthly: number }): KeywordStat => {
    const shopMeta = shopMetaByKeyword.get(entry.keyword) ?? { total: null, category: null };
    return {
      keyword: entry.keyword,
      monthlySearches: entry.monthly,
      isLowVolume: false,
      competition: null,
      monthlyClicks: null,
      avgCtr: null,
      productCount: shopMeta.total,
      category: shopMeta.category,
      ratio:
        entry.monthly > 0 && shopMeta.total !== null
          ? Math.round((shopMeta.total / entry.monthly) * 100) / 100
          : null,
    };
  };

  return { seasonal: seasonal.map(toStat), steady: steady.map(toStat) };
}

//////////////////// 시즌성 판정 (DB 30일 캐시 → 미판정분만 데이터랩) ////////////////////
type SeasonalityJudgment = { isSeasonal: boolean; peakMonths: number[] };

async function judgeSeasonalityWithCache(
  keywords: string[],
  openApiHeaders: Record<string, string>,
): Promise<Map<string, SeasonalityJudgment>> {
  const judgments = new Map<string, SeasonalityJudgment>();
  if (keywords.length === 0) return judgments;
  const supabase = getSupabaseServerClient();

  ////////// 1) DB 캐시 조회 (30일 이내 판정분)
  if (supabase) {
    const freshAfter = new Date(Date.now() - SEASONALITY_CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('keyword_seasonality')
      .select('keyword, is_seasonal, peak_months')
      .in('keyword', keywords)
      .gte('judged_at', freshAfter);
    if (error) console.error('[warm] 시즌성 캐시 조회 실패:', error);
    for (const row of data ?? []) {
      judgments.set(String(row.keyword), {
        isSeasonal: Boolean(row.is_seasonal),
        peakMonths: (row.peak_months ?? []).map(Number),
      });
    }
  }

  ////////// 2) 미판정분만 데이터랩 (5그룹 배치)
  const missing = keywords.filter((keyword) => !judgments.has(keyword));
  const newRows: { keyword: string; is_seasonal: boolean; peak_months: number[]; judged_at: string }[] = [];
  for (let index = 0; index < missing.length; index += 5) {
    const group = missing.slice(index, index + 5);
    const trends = await fetchTrendMulti(group, openApiHeaders).catch(() => new Map<string, TrendMonthPoint[]>());
    for (const [keyword, series] of trends) {
      const judged = judgeSeasonality(normalizeToOwnMax(series));
      judgments.set(keyword, judged);
      newRows.push({
        keyword,
        is_seasonal: judged.isSeasonal,
        peak_months: judged.peakMonths,
        judged_at: new Date().toISOString(),
      });
    }
    if (index + 5 < missing.length) await sleep(150);
  }

  ////////// 3) 새 판정 DB 저장
  if (supabase && newRows.length > 0) {
    const { error } = await supabase.from('keyword_seasonality').upsert(newRows, { onConflict: 'keyword' });
    if (error) console.error('[warm] 시즌성 캐시 저장 실패:', error);
  }

  return judgments;
}

//////////////////// 검색광고 keywordstool (힌트 최대 5개) ////////////////////
async function fetchKeywordTool(
  batch: string[],
  auth: { apiKey: string; secretKey: string; customerId: string },
): Promise<any[]> {
  const path = '/keywordstool';
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', auth.secretKey).update(`${timestamp}.GET.${path}`).digest('base64');
  const hint = batch.map((keyword) => keyword.replace(/\s+/g, '')).join(','); // 검색광고 API는 공백 미허용
  const response = await fetch(`https://api.searchad.naver.com${path}?hintKeywords=${encodeURIComponent(hint)}&showDetail=1`, {
    headers: {
      'X-Timestamp': timestamp,
      'X-API-KEY': auth.apiKey,
      'X-Customer': auth.customerId,
      'X-Signature': signature,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`검색광고 API 오류 (HTTP ${response.status})`);
  const body = await response.json();
  return Array.isArray(body?.keywordList) ? body.keywordList : [];
}

//////////////////// 데이터랩 12개월 다중 그룹 (시즌성 판정용 시계열) ////////////////////
type TrendMonthPoint = { month: number; ratio: number }; // month = 실제 달(1~12)

async function fetchTrendMulti(
  keywords: string[],
  headers: Record<string, string>,
): Promise<Map<string, TrendMonthPoint[]>> {
  const end = new Date();
  end.setDate(1);
  end.setDate(end.getDate() - 1); // 지난달 말일
  const start = new Date(end);
  start.setMonth(start.getMonth() - 11);
  start.setDate(1);

  const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      startDate: formatDate(start),
      endDate: formatDate(end),
      timeUnit: 'month',
      keywordGroups: keywords.map((keyword) => ({ groupName: keyword, keywords: [keyword] })),
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`데이터랩 오류 (HTTP ${response.status})`);
  const data = await response.json();

  const seriesByKeyword = new Map<string, TrendMonthPoint[]>();
  for (const result of data?.results ?? []) {
    const points: TrendMonthPoint[] = (result.data ?? []).map((point: any) => ({
      month: new Date(String(point.period)).getMonth() + 1,
      ratio: Number(point.ratio) || 0,
    }));
    seriesByKeyword.set(String(result.title ?? ''), points);
  }
  return seriesByKeyword;
}

//////////////////// 시즌성 판정 (keyword-detail과 동일 기준) ////////////////////
// 다중 그룹 응답은 요청 내 최대=100 공유 스케일 → 판정 전 자기 최대값 기준 재정규화 필수
function normalizeToOwnMax(series: TrendMonthPoint[]): TrendMonthPoint[] {
  const max = Math.max(...series.map((point) => point.ratio), 0);
  if (max <= 0) return series;
  return series.map((point) => ({ month: point.month, ratio: (point.ratio / max) * 100 }));
}

function judgeSeasonality(series: TrendMonthPoint[]): SeasonalityJudgment {
  if (series.length < 12) return { isSeasonal: false, peakMonths: [] };
  const sorted = series.map((point) => point.ratio).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const peakMonths = Array.from(new Set(series.filter((point) => point.ratio >= 75).map((point) => point.month)));
  const isSeasonal = peakMonths.length > 0 && peakMonths.length <= 4 && median < 55;
  return isSeasonal ? { isSeasonal: true, peakMonths } : { isSeasonal: false, peakMonths: [] };
}

//////////////////// 쇼핑 메타 (상품수 + 최빈 카테고리, 429 재시도 1회) ////////////////////
async function fetchShopMeta(
  keyword: string,
  clientId: string,
  clientSecret: string,
  isRetry = false,
): Promise<{ total: number | null; category: string | null }> {
  try {
    const response = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(keyword)}&display=10`,
      {
        headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cache: 'no-store',
      },
    );
    if (response.status === 429 && !isRetry) {
      await sleep(600);
      return fetchShopMeta(keyword, clientId, clientSecret, true);
    }
    if (!response.ok) return { total: null, category: null };
    const body = await response.json();
    const total = Number(body?.total);

    const categoryCounts = new Map<string, number>();
    for (const item of body?.items ?? []) {
      const path = [item.category1, item.category2]
        .map((part) => String(part ?? '').trim())
        .filter((part) => part.length > 0)
        .join(' > ');
      if (path) categoryCounts.set(path, (categoryCounts.get(path) ?? 0) + 1);
    }
    const topCategory = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return { total: Number.isFinite(total) ? total : null, category: topCategory };
  } catch {
    return { total: null, category: null };
  }
}

//////////////////// 헬퍼 ////////////////////
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseCount(raw: unknown): { value: number; isLow: boolean } {
  if (typeof raw === 'number') return { value: raw, isLow: false };
  const text = String(raw ?? '').trim();
  if (text.startsWith('<')) return { value: 9, isLow: true };
  const value = Number(text.replace(/,/g, ''));
  return Number.isFinite(value) ? { value, isLow: false } : { value: 0, isLow: true };
}
