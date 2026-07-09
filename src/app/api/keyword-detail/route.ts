//////////////////////////////////////// 키워드 상세 분석 프록시 (종합차트) ////////////////////////////////////////
// 온디맨드 로드 전용 — 행 클릭 시에만 호출. 키워드당 API 비용: 데이터랩 2 + 검색광고 1 + 쇼핑 2 + 블로그/카페 2.
// 7일 캐시 (추이·분포는 천천히 변함 — 데이터랩 일 1,000회 예산 보호의 핵심).

import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import type { KeywordDetail, TrendPoint } from '@/shared/types/keywordDetail';

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const CACHE_MAX_ENTRIES = 1000;
const FETCH_TIMEOUT_MS = 10_000;
const PRICE_SAMPLE = 40; // 가격대·브랜드 표본

const cache = new Map<string, { detail: KeywordDetail; expiresAt: number }>();

export async function GET(request: Request) {
  const clientId = process.env.NAVER_OPENAPI_CLIENT_ID;
  const clientSecret = process.env.NAVER_OPENAPI_CLIENT_SECRET;
  const adApiKey = process.env.NAVER_SEARCHAD_API_KEY;
  const adSecret = process.env.NAVER_SEARCHAD_SECRET_KEY;
  const adCustomer = process.env.NAVER_SEARCHAD_CUSTOMER_ID;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ configured: false } as Partial<KeywordDetail>);
  }

  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get('keyword') ?? '').trim().replace(/\s+/g, '');
  if (keyword.length === 0) {
    return NextResponse.json({ error: '키워드(keyword)가 필요합니다.' }, { status: 400 });
  }

  const cached = cache.get(keyword);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.detail);
  }

  try {
    const openApiHeaders = {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
      'Content-Type': 'application/json',
    };

    // 병렬 수집 — 개별 실패는 해당 블록만 null (부분 가동 원칙)
    const [trendSeries, dailySeries, deviceRatio, shopSample, strictCount, blogCount, cafeCount] =
      await Promise.all([
        fetchTrendMonthly(keyword, openApiHeaders).catch(() => null),
        fetchTrendDaily(keyword, openApiHeaders).catch(() => null),
        adApiKey && adSecret && adCustomer
          ? fetchDeviceRatio(keyword, { apiKey: adApiKey, secretKey: adSecret, customerId: adCustomer }).catch(() => null)
          : Promise.resolve(null),
        fetchShopSample(keyword, clientId, clientSecret).catch(() => null),
        fetchSearchTotal(`https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(keyword)}&display=1&exclude=used:rental:cbshop`, clientId, clientSecret).catch(() => null),
        fetchSearchTotal(`https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=1`, clientId, clientSecret).catch(() => null),
        fetchSearchTotal(`https://openapi.naver.com/v1/search/cafearticle.json?query=${encodeURIComponent(keyword)}&display=1`, clientId, clientSecret).catch(() => null),
      ]);

    ////////// 2차: 쇼핑인사이트 (카테고리 cid 확보 후 — ④⑤⑪⑫)
    const categoryName = shopSample?.topCategory ?? null;
    const cid = categoryName ? (TOP_CATEGORY_CIDS[categoryName] ?? null) : null;
    let genderRatio: KeywordDetail['genderRatio'] = null;
    let ageRatio: KeywordDetail['ageRatio'] = null;
    let categorySeason: string | null = null;
    let shoppingClickTrend: TrendPoint[] = [];
    if (cid) {
      const [genderGroups, ageGroups, seasonLabel, clickTrend] = await Promise.all([
        fetchInsightGroups('gender', cid, keyword, openApiHeaders).catch(() => null),
        fetchInsightGroups('age', cid, keyword, openApiHeaders).catch(() => null),
        fetchCategorySeason(cid, openApiHeaders).catch(() => null),
        fetchShoppingClickTrend(cid, keyword, openApiHeaders).catch(() => [] as TrendPoint[]),
      ]);
      if (genderGroups && genderGroups.size > 0) {
        const male = genderGroups.get('m') ?? 0;
        const female = genderGroups.get('f') ?? 0;
        const total = male + female;
        if (total > 0) {
          genderRatio = { male: Math.round((male / total) * 100), female: Math.round((female / total) * 100) };
        }
      }
      if (ageGroups && ageGroups.size > 0) {
        const totalAge = Array.from(ageGroups.values()).reduce((sum, value) => sum + value, 0);
        if (totalAge > 0) {
          ageRatio = Array.from(ageGroups.entries())
            .map(([group, value]) => ({ label: group + '대', percent: Math.round((value / totalAge) * 100) }))
            .sort((a, b) => b.percent - a.percent);
        }
      }
      categorySeason = seasonLabel;
      shoppingClickTrend = clickTrend ?? [];
    }

    const detail: KeywordDetail = {
      configured: true,
      keyword,
      trend: trendSeries ?? [],
      trendDirection: trendSeries ? judgeTrendDirection(trendSeries) : null,
      seasonality: trendSeries ? judgeSeasonality(trendSeries) : { isSeasonal: false, peakMonths: [], label: null, isInSeason: false },
      deviceRatio,
      genderRatio,
      ageRatio,
      weekdayRatio: dailySeries ? aggregateWeekday(dailySeries) : null,
      priceBand: shopSample?.priceBand ?? null,
      brandShare: shopSample?.brandShare ?? null,
      strictProductCount: strictCount,
      blogCount,
      cafeCount,
      categoryName,
      categorySeason,
      shoppingClickTrend,
    };

    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(keyword, { detail, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(detail, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '상세 분석 조회에 실패했습니다.' }, { status: 502 });
  }
}

//////////////////// 데이터랩: 월별 12개월 ////////////////////
async function fetchTrendMonthly(keyword: string, headers: Record<string, string>): Promise<TrendPoint[]> {
  const end = new Date();
  end.setDate(1);
  end.setDate(end.getDate() - 1); // 지난달 말일 (이번 달은 미완성 데이터라 제외)
  const start = new Date(end);
  start.setMonth(start.getMonth() - 11);
  start.setDate(1);

  const body = JSON.stringify({
    startDate: formatDate(start),
    endDate: formatDate(end),
    timeUnit: 'month',
    keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
  });
  const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`데이터랩 오류 (HTTP ${response.status})`);
  const data = await response.json();
  return (data?.results?.[0]?.data ?? []).map((point: any) => ({
    period: String(point.period),
    ratio: Number(point.ratio) || 0,
  }));
}

//////////////////// 데이터랩: 일별 91일 (요일 집계용) ////////////////////
async function fetchTrendDaily(keyword: string, headers: Record<string, string>): Promise<TrendPoint[]> {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 90);

  const body = JSON.stringify({
    startDate: formatDate(start),
    endDate: formatDate(end),
    timeUnit: 'date',
    keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
  });
  const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`데이터랩 오류 (HTTP ${response.status})`);
  const data = await response.json();
  return (data?.results?.[0]?.data ?? []).map((point: any) => ({
    period: String(point.period),
    ratio: Number(point.ratio) || 0,
  }));
}

//////////////////// 검색광고: 기기 비율 (PC/모바일 검색수 — 절대치 기반이라 정확) ////////////////////
async function fetchDeviceRatio(
  keyword: string,
  auth: { apiKey: string; secretKey: string; customerId: string },
): Promise<{ pc: number; mobile: number } | null> {
  const path = '/keywordstool';
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', auth.secretKey).update(`${timestamp}.GET.${path}`).digest('base64');
  const response = await fetch(
    `https://api.searchad.naver.com${path}?hintKeywords=${encodeURIComponent(keyword)}&showDetail=1`,
    {
      headers: {
        'X-Timestamp': timestamp,
        'X-API-KEY': auth.apiKey,
        'X-Customer': auth.customerId,
        'X-Signature': signature,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    },
  );
  if (!response.ok) throw new Error(`검색광고 API 오류 (HTTP ${response.status})`);
  const data = await response.json();
  const entry = (data?.keywordList ?? []).find(
    (row: any) => String(row.relKeyword ?? '').replace(/\s+/g, '').toLowerCase() === keyword.toLowerCase(),
  );
  if (!entry) return null;

  const pc = parseCount(entry.monthlyPcQcCnt);
  const mobile = parseCount(entry.monthlyMobileQcCnt);
  const total = pc + mobile;
  if (total <= 0) return null;
  return { pc: Math.round((pc / total) * 100), mobile: Math.round((mobile / total) * 100) };
}

//////////////////// 쇼핑: 상위 표본 → 가격대·브랜드 장악도 ////////////////////
async function fetchShopSample(
  keyword: string,
  clientId: string,
  clientSecret: string,
): Promise<{ priceBand: KeywordDetail['priceBand']; brandShare: number | null; topCategory: string | null }> {
  const response = await fetch(
    `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(keyword)}&display=${PRICE_SAMPLE}`,
    {
      headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    },
  );
  if (!response.ok) throw new Error(`쇼핑 API 오류 (HTTP ${response.status})`);
  const data = await response.json();
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) return { priceBand: null, brandShare: null, topCategory: null };

  const prices = items
    .map((item) => Number(item.lprice))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);
  const priceBand =
    prices.length >= 5
      ? { min: prices[0], median: prices[Math.floor(prices.length / 2)], max: prices[prices.length - 1] }
      : null;

  const brandCount = items.filter((item) => String(item.brand ?? '').trim().length > 0).length;
  const brandShare = Math.round((brandCount / items.length) * 100);

  // 대분류 최빈값 (쇼핑인사이트 cid 매핑용)
  const categoryCounts = new Map<string, number>();
  for (const item of items) {
    const name = String(item.category1 ?? '').trim();
    if (name) categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
  }
  const sorted = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topCategory = sorted.length > 0 ? sorted[0][0] : null;

  return { priceBand, brandShare, topCategory };
}

//////////////////// 검색 계열 total 공용 (실경쟁·블로그·카페) ////////////////////
async function fetchSearchTotal(url: string, clientId: string, clientSecret: string): Promise<number | null> {
  const response = await fetch(url, {
    headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = await response.json();
  const total = Number(data?.total);
  return Number.isFinite(total) ? total : null;
}

//////////////////// 쇼핑인사이트 (④⑤⑪⑫) ////////////////////
// 네이버쇼핑 대분류 cid 정적 매핑 (쇼핑인사이트 category 파라미터용)
const TOP_CATEGORY_CIDS: Record<string, string> = {
  '패션의류': '50000000',
  '패션잡화': '50000001',
  '화장품/미용': '50000002',
  '디지털/가전': '50000003',
  '가구/인테리어': '50000004',
  '출산/육아': '50000005',
  '식품': '50000006',
  '스포츠/레저': '50000007',
  '생활/건강': '50000008',
  '여가/생활편의': '50000009',
};

// 인사이트 공용 기간 (최근 N개월, 지난달 말 기준)
function insightRange(months: number): { start: string; end: string } {
  const end = new Date();
  end.setDate(1);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  return { start: formatDate(start), end: formatDate(end) };
}

// 그룹 반환형 인사이트 호출 (성별/연령 — 단일 요청 내 동일 스케일이라 비교 유효)
async function fetchInsightGroups(
  endpoint: 'gender' | 'age',
  cid: string,
  keyword: string,
  headers: Record<string, string>,
): Promise<Map<string, number>> {
  const range = insightRange(3);
  const response = await fetch(`https://openapi.naver.com/v1/datalab/shopping/category/keyword/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ startDate: range.start, endDate: range.end, timeUnit: 'month', category: cid, keyword }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`쇼핑인사이트 오류 (HTTP ${response.status})`);
  const data = await response.json();
  const sums = new Map<string, number>();
  for (const point of data?.results?.[0]?.data ?? []) {
    const group = String(point.group ?? '');
    sums.set(group, (sums.get(group) ?? 0) + (Number(point.ratio) || 0));
  }
  return sums;
}

// 카테고리 12개월 수요 추이 → 성수기 라벨 (⑪)
async function fetchCategorySeason(cid: string, headers: Record<string, string>): Promise<string | null> {
  const range = insightRange(12);
  const response = await fetch('https://openapi.naver.com/v1/datalab/shopping/categories', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      startDate: range.start,
      endDate: range.end,
      timeUnit: 'month',
      category: [{ name: 'cat', param: [cid] }],
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = await response.json();
  const series: TrendPoint[] = (data?.results?.[0]?.data ?? []).map((point: any) => ({
    period: String(point.period),
    ratio: Number(point.ratio) || 0,
  }));
  const season = judgeSeasonality(series);
  if (!season.isSeasonal || !season.label) return null;
  return season.label.replace('집중', '성수기');
}

// 카테고리 내 키워드 쇼핑 클릭 추이 (⑫ — 검색 트렌드 보조선)
async function fetchShoppingClickTrend(
  cid: string,
  keyword: string,
  headers: Record<string, string>,
): Promise<TrendPoint[]> {
  const range = insightRange(12);
  const response = await fetch('https://openapi.naver.com/v1/datalab/shopping/category/keywords', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      startDate: range.start,
      endDate: range.end,
      timeUnit: 'month',
      category: cid,
      keyword: [{ name: keyword, param: [keyword] }],
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (data?.results?.[0]?.data ?? []).map((point: any) => ({
    period: String(point.period),
    ratio: Number(point.ratio) || 0,
  }));
}

//////////////////// 판정 로직 ////////////////////

// 최근 3개월 평균 vs 이전 3개월 평균 (±15% 기준)
function judgeTrendDirection(series: TrendPoint[]): 'up' | 'flat' | 'down' | null {
  if (series.length < 6) return null;
  const recent = series.slice(-3).reduce((sum, point) => sum + point.ratio, 0) / 3;
  const previous = series.slice(-6, -3).reduce((sum, point) => sum + point.ratio, 0) / 3;
  if (previous <= 0) return null;
  const change = (recent - previous) / previous;
  if (change > 0.15) return 'up';
  if (change < -0.15) return 'down';
  return 'flat';
}

// 피크(지수 75+) 월이 4개 이하로 몰려 있고 중앙값과 낙차가 크면 시즌성
function judgeSeasonality(series: TrendPoint[]): KeywordDetail['seasonality'] {
  if (series.length < 12) return { isSeasonal: false, peakMonths: [], label: null, isInSeason: false };

  const ratios = [...series.map((point) => point.ratio)].sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)];
  const peakMonths = series
    .filter((point) => point.ratio >= 75)
    .map((point) => new Date(point.period).getMonth() + 1);
  const uniquePeaks = Array.from(new Set(peakMonths)).sort((a, b) => a - b);

  const isSeasonal = uniquePeaks.length > 0 && uniquePeaks.length <= 4 && median < 55;
  if (!isSeasonal) return { isSeasonal: false, peakMonths: [], label: null, isInSeason: false };

  const currentMonth = new Date().getMonth() + 1;
  const label =
    uniquePeaks.length === 1
      ? `매년 ${uniquePeaks[0]}월 집중`
      : `매년 ${uniquePeaks[0]}~${uniquePeaks[uniquePeaks.length - 1]}월 집중`;
  return { isSeasonal: true, peakMonths: uniquePeaks, label, isInSeason: uniquePeaks.includes(currentMonth) };
}

// 일별 시계열 → 요일별 평균 → 합 100% 정규화 (월~일)
function aggregateWeekday(series: TrendPoint[]): number[] | null {
  if (series.length < 28) return null;
  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (const point of series) {
    const weekday = (new Date(point.period).getDay() + 6) % 7; // 월=0 … 일=6
    sums[weekday] += point.ratio;
    counts[weekday] += 1;
  }
  const averages = sums.map((sum, index) => (counts[index] > 0 ? sum / counts[index] : 0));
  const total = averages.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return null;
  return averages.map((value) => Math.round((value / total) * 100));
}

//////////////////// 헬퍼 ////////////////////
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseCount(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  const text = String(raw ?? '').trim();
  if (text.startsWith('<')) return 9;
  const value = Number(text.replace(/,/g, ''));
  return Number.isFinite(value) ? value : 0;
}
