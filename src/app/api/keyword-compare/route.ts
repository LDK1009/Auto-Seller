//////////////////////////////////////// 키워드 비교 프록시 ////////////////////////////////////////
// 현재 키워드 + 체크 키워드(합계 2~5개)를 한 번에 비교한다.
// 핵심 제약: 데이터랩 상대지수는 "요청 간" 비교 불가 → 트렌드는 반드시 단일 요청 다중 그룹(≤5)으로 수집.
// API 비용(신규 5개 기준): 검색광고 1 + 쇼핑 5 + 데이터랩 1 + 쇼핑인사이트 ≤10 — 24시간 캐시로 방어.

import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import type { CompareEntry, KeywordCompareResponse } from '@/shared/types/keywordCompare';
import type { TrendPoint } from '@/shared/types/keywordDetail';

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const CACHE_MAX_ENTRIES = 500;
const MAX_COMPARE_KEYWORDS = 5; // 데이터랩 keywordGroups 상한 = 5
const FETCH_TIMEOUT_MS = 10_000;
const CATEGORY_SAMPLE = 20; // cid 판별용 쇼핑 표본

const cache = new Map<string, { response: KeywordCompareResponse; expiresAt: number }>();

// 네이버쇼핑 대분류 cid 정적 매핑 (쇼핑인사이트 category 파라미터용 — keyword-detail과 동일 기준)
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

export async function GET(request: Request) {
  const clientId = process.env.NAVER_OPENAPI_CLIENT_ID;
  const clientSecret = process.env.NAVER_OPENAPI_CLIENT_SECRET;
  const adApiKey = process.env.NAVER_SEARCHAD_API_KEY;
  const adSecret = process.env.NAVER_SEARCHAD_SECRET_KEY;
  const adCustomer = process.env.NAVER_SEARCHAD_CUSTOMER_ID;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ configured: false, entries: [] } satisfies KeywordCompareResponse);
  }

  const { searchParams } = new URL(request.url);
  const keywords = Array.from(
    new Set(
      (searchParams.get('keywords') ?? '')
        .split(',')
        .map((keyword) => keyword.trim().replace(/\s+/g, '')) // 검색광고 API는 공백 미허용
        .filter((keyword) => keyword.length > 0),
    ),
  ).slice(0, MAX_COMPARE_KEYWORDS);

  if (keywords.length < 2) {
    return NextResponse.json({ error: '비교할 키워드가 2개 이상 필요해요.' }, { status: 400 });
  }

  // 캐시 키 = 정렬된 집합 (스케일이 집합에 종속되므로 순서 무관 동일 집합만 재사용)
  const cacheKey = [...keywords].sort().join(',');
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    // 요청 순서(첫 번째 = 기준)에 맞춰 재정렬해 반환
    const byKeyword = new Map(cached.response.entries.map((entry) => [entry.keyword, entry]));
    const entries = keywords.map((keyword) => byKeyword.get(keyword)).filter((entry): entry is CompareEntry => Boolean(entry));
    return NextResponse.json({ configured: true, entries } satisfies KeywordCompareResponse);
  }

  try {
    const openApiHeaders = {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
      'Content-Type': 'application/json',
    };

    ////////// 1) 병렬 1차: 검색광고(전체 1콜) + 트렌드(단일 요청 다중 그룹 1콜) + 쇼핑 표본(키워드별)
    const [adVolumes, trendByKeyword, shopSamples] = await Promise.all([
      adApiKey && adSecret && adCustomer
        ? fetchKeywordTool(keywords, { apiKey: adApiKey, secretKey: adSecret, customerId: adCustomer }).catch(() => new Map<string, AdVolume>())
        : Promise.resolve(new Map<string, AdVolume>()),
      fetchTrendMulti(keywords, openApiHeaders).catch(() => new Map<string, TrendPoint[]>()),
      Promise.all(keywords.map((keyword) => fetchShopSample(keyword, clientId, clientSecret).catch(() => null))),
    ]);

    ////////// 2) 병렬 2차: 쇼핑인사이트 성별·연령 (cid 확보 키워드만, 키워드당 2콜)
    const insights = await Promise.all(
      keywords.map(async (keyword, index) => {
        const topCategory = shopSamples[index]?.topCategory ?? null;
        const cid = topCategory ? (TOP_CATEGORY_CIDS[topCategory] ?? null) : null;
        if (!cid) return { genderRatio: null, ageTop: null };
        const [genderGroups, ageGroups] = await Promise.all([
          fetchInsightGroups('gender', cid, keyword, openApiHeaders).catch(() => null),
          fetchInsightGroups('age', cid, keyword, openApiHeaders).catch(() => null),
        ]);
        return { genderRatio: toGenderRatio(genderGroups), ageTop: toAgeTop(ageGroups) };
      }),
    );

    ////////// 3) 조립
    const entries: CompareEntry[] = keywords.map((keyword, index) => {
      const volume = adVolumes.get(keyword.toLowerCase()) ?? null;
      const productCount = shopSamples[index]?.total ?? null;
      const monthly = volume?.monthly ?? null;
      return {
        keyword,
        monthlySearches: monthly,
        isLowVolume: volume?.isLow ?? false,
        monthlyClicks: volume?.clicks ?? null,
        avgCtr: volume?.ctr ?? null,
        productCount,
        ratio:
          monthly !== null && monthly > 0 && productCount !== null
            ? Math.round((productCount / monthly) * 100) / 100
            : null,
        deviceRatio: volume?.deviceRatio ?? null,
        genderRatio: insights[index].genderRatio,
        ageTop: insights[index].ageTop,
        trend: trendByKeyword.get(keyword) ?? [],
      };
    });

    const response: KeywordCompareResponse = { configured: true, entries };
    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(cacheKey, { response, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(response, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '키워드 비교에 실패했어요. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }
}

//////////////////// 검색광고: 검색수·클릭·기기 (전체 키워드 1콜 — 힌트 최대 5개) ////////////////////
type AdVolume = {
  monthly: number;
  isLow: boolean;
  clicks: number | null;
  ctr: number | null;
  deviceRatio: { pc: number; mobile: number } | null;
};

async function fetchKeywordTool(
  keywords: string[],
  auth: { apiKey: string; secretKey: string; customerId: string },
): Promise<Map<string, AdVolume>> {
  const path = '/keywordstool';
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', auth.secretKey).update(`${timestamp}.GET.${path}`).digest('base64');
  const response = await fetch(
    `https://api.searchad.naver.com${path}?hintKeywords=${encodeURIComponent(keywords.join(','))}&showDetail=1`,
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
  const body = await response.json();

  const wanted = new Set(keywords.map((keyword) => keyword.toLowerCase()));
  const volumes = new Map<string, AdVolume>();
  for (const entry of body?.keywordList ?? []) {
    const relKeyword = String(entry.relKeyword ?? '').replace(/\s+/g, '').toLowerCase();
    if (!wanted.has(relKeyword) || volumes.has(relKeyword)) continue;
    const pc = parseCount(entry.monthlyPcQcCnt);
    const mobile = parseCount(entry.monthlyMobileQcCnt);
    const total = pc.value + mobile.value;
    volumes.set(relKeyword, {
      monthly: total,
      isLow: pc.isLow && mobile.isLow,
      clicks: toRoundedOrNull(Number(entry.monthlyAvePcClkCnt ?? NaN) + Number(entry.monthlyAveMobileClkCnt ?? NaN)),
      ctr: toRoundedOrNull((Number(entry.monthlyAvePcCtr ?? NaN) + Number(entry.monthlyAveMobileCtr ?? NaN)) / 2, 2),
      deviceRatio:
        total > 0
          ? { pc: Math.round((pc.value / total) * 100), mobile: Math.round((mobile.value / total) * 100) }
          : null,
    });
  }
  return volumes;
}

//////////////////// 데이터랩: 12개월 다중 그룹 (단일 요청 = 동일 스케일 — 비교 유효의 핵심) ////////////////////
async function fetchTrendMulti(
  keywords: string[],
  headers: Record<string, string>,
): Promise<Map<string, TrendPoint[]>> {
  const end = new Date();
  end.setDate(1);
  end.setDate(end.getDate() - 1); // 지난달 말일 (이번 달은 미완성 데이터라 제외)
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

  const trendByKeyword = new Map<string, TrendPoint[]>();
  for (const result of data?.results ?? []) {
    trendByKeyword.set(
      String(result.title ?? ''),
      (result.data ?? []).map((point: any) => ({ period: String(point.period), ratio: Number(point.ratio) || 0 })),
    );
  }
  return trendByKeyword;
}

//////////////////// 쇼핑: 상품 수(total) + 대분류 최빈값 (cid 판별) — 1콜 겸용 ////////////////////
async function fetchShopSample(
  keyword: string,
  clientId: string,
  clientSecret: string,
): Promise<{ total: number | null; topCategory: string | null }> {
  const response = await fetch(
    `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(keyword)}&display=${CATEGORY_SAMPLE}`,
    {
      headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    },
  );
  if (!response.ok) throw new Error(`쇼핑 API 오류 (HTTP ${response.status})`);
  const data = await response.json();

  const total = Number.isFinite(Number(data?.total)) ? Number(data.total) : null;
  const categoryCounts = new Map<string, number>();
  for (const item of data?.items ?? []) {
    const name = String(item.category1 ?? '').trim();
    if (name) categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
  }
  const sorted = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);
  return { total, topCategory: sorted.length > 0 ? sorted[0][0] : null };
}

//////////////////// 쇼핑인사이트: 성별/연령 그룹 (단일 요청 내 동일 스케일) ////////////////////
async function fetchInsightGroups(
  endpoint: 'gender' | 'age',
  cid: string,
  keyword: string,
  headers: Record<string, string>,
): Promise<Map<string, number>> {
  const end = new Date();
  end.setDate(1);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setMonth(start.getMonth() - 2);
  start.setDate(1);

  const response = await fetch(`https://openapi.naver.com/v1/datalab/shopping/category/keyword/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      startDate: formatDate(start),
      endDate: formatDate(end),
      timeUnit: 'month',
      category: cid,
      keyword,
    }),
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

////////// 성별 그룹 합 → 비율 %
function toGenderRatio(groups: Map<string, number> | null): { male: number; female: number } | null {
  if (!groups || groups.size === 0) return null;
  const male = groups.get('m') ?? 0;
  const female = groups.get('f') ?? 0;
  const total = male + female;
  if (total <= 0) return null;
  return { male: Math.round((male / total) * 100), female: Math.round((female / total) * 100) };
}

////////// 연령 그룹 합 → 1위 라벨 (예: "40대 54%")
function toAgeTop(groups: Map<string, number> | null): string | null {
  if (!groups || groups.size === 0) return null;
  const total = Array.from(groups.values()).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return null;
  const sorted = Array.from(groups.entries()).sort((a, b) => b[1] - a[1]);
  const [topGroup, topValue] = sorted[0];
  return `${topGroup}대 ${Math.round((topValue / total) * 100)}%`;
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

function toRoundedOrNull(value: number, digits = 0): number | null {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
