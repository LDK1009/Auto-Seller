//////////////////////////////////////// 키워드 통계 프록시 ////////////////////////////////////////
// 네이버 검색광고 API(월간 검색수·경쟁정도) + 쇼핑 오픈API(등록 상품 수)를 조합해 반환한다.
// - 키 미설정 시 configured:false (UI가 발급 안내로 전환 — 에러 아님)
// - 24시간 인메모리 캐시 (약관 리스크·쿼터 보호의 핵심 — docs/launch/naver-keys-guide.md)
// - 검색광고 keywordstool은 호출당 힌트 키워드 최대 5개

import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import type { KeywordStat, KeywordStatsResponse, RelatedKeyword } from '@/shared/types/keywordStats';

const SEARCHAD_BASE = 'https://api.searchad.naver.com';
const SHOP_API_URL = 'https://openapi.naver.com/v1/search/shop.json';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const CACHE_MAX_ENTRIES = 2000;
const MAX_KEYWORDS_PER_REQUEST = 10; // UI 요청 상한 (검색광고 5개 × 2회)
const FETCH_TIMEOUT_MS = 10_000;

const cache = new Map<string, { stat: KeywordStat; expiresAt: number }>();
// 연관 키워드 풀 캐시 (요청 키워드 집합 단위) — stat 캐시 히트 시에도 연관 목록이 비지 않도록
const relatedCache = new Map<string, { related: RelatedKeyword[]; expiresAt: number }>();

export async function GET(request: Request) {
  const apiKey = process.env.NAVER_SEARCHAD_API_KEY;
  const secretKey = process.env.NAVER_SEARCHAD_SECRET_KEY;
  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID;
  const clientId = process.env.NAVER_OPENAPI_CLIENT_ID;
  const clientSecret = process.env.NAVER_OPENAPI_CLIENT_SECRET;

  if (!apiKey || !secretKey || !customerId) {
    return NextResponse.json({ configured: false, stats: [], related: [] } satisfies KeywordStatsResponse);
  }

  const { searchParams } = new URL(request.url);
  const rawKeywords = searchParams.get('keywords') ?? '';
  const keywords = Array.from(
    new Set(
      rawKeywords
        .split(',')
        .map((keyword) => keyword.trim().replace(/\s+/g, '')) // 검색광고 API는 공백 미허용
        .filter((keyword) => keyword.length > 0),
    ),
  ).slice(0, MAX_KEYWORDS_PER_REQUEST);

  if (keywords.length === 0) {
    return NextResponse.json({ error: '키워드(keywords)가 필요합니다.' }, { status: 400 });
  }

  try {
    ////////// 캐시 분리: 캐시된 것과 새로 조회할 것
    const now = Date.now();
    const statsByKeyword = new Map<string, KeywordStat>();
    const relatedPool = new Map<string, RelatedKeyword>();
    const missing: string[] = [];
    for (const keyword of keywords) {
      const cached = cache.get(keyword);
      if (cached && cached.expiresAt > now) statsByKeyword.set(keyword, cached.stat);
      else missing.push(keyword);
    }

    if (missing.length > 0) {
      ////////// 1) 검색광고 keywordstool (5개씩 배치)
      // 검색광고 인증·장애 시에도 전체를 죽이지 않는다 — 상품 수(쇼핑API)만이라도 반환 (부분 가동)
      const searchVolumes = new Map<
        string,
        { monthly: number; isLow: boolean; comp: string | null; clicks: number | null; ctr: number | null }
      >();
      const wanted = new Set(missing.map((keyword) => keyword.toLowerCase()));
      try {
        for (let index = 0; index < missing.length; index += 5) {
          const batch = missing.slice(index, index + 5);
          const list = await fetchKeywordTool(batch, { apiKey, secretKey, customerId });
          for (const entry of list) {
            const relKeyword = String(entry.relKeyword ?? '').replace(/\s+/g, '');
            const pc = parseCount(entry.monthlyPcQcCnt);
            const mobile = parseCount(entry.monthlyMobileQcCnt);
            const record = {
              monthly: pc.value + mobile.value,
              isLow: pc.isLow && mobile.isLow,
              comp: entry.compIdx ? String(entry.compIdx) : null,
              clicks: toRoundedOrNull(Number(entry.monthlyAvePcClkCnt ?? NaN) + Number(entry.monthlyAveMobileClkCnt ?? NaN)),
              ctr: toRoundedOrNull((Number(entry.monthlyAvePcCtr ?? NaN) + Number(entry.monthlyAveMobileCtr ?? NaN)) / 2, 2),
            };
            if (wanted.has(relKeyword.toLowerCase())) {
              searchVolumes.set(relKeyword, record);
            } else if (!relatedPool.has(relKeyword)) {
              // 연관 키워드 풀 수집 (상품수 미조회 — 검색량만)
              relatedPool.set(relKeyword, {
                keyword: relKeyword,
                monthlySearches: record.monthly,
                isLowVolume: record.isLow,
                competition: record.comp,
              });
            }
          }
        }
      } catch (error) {
        console.error('검색광고 API 실패 — 상품 수만 반환:', error);
      }

      ////////// 2) 쇼핑 상품 수 + 최빈 카테고리 (키워드별 1회 — 오픈API 키 없으면 생략)
      for (const keyword of missing) {
        const volume = searchVolumes.get(keyword);
        const shopMeta =
          clientId && clientSecret
            ? await fetchShopMeta(keyword, clientId, clientSecret)
            : { total: null, category: null };
        const productCount = shopMeta.total;

        const monthly = volume?.monthly ?? null;
        const stat: KeywordStat = {
          keyword,
          monthlySearches: monthly,
          isLowVolume: volume?.isLow ?? false,
          competition: volume?.comp ?? null,
          monthlyClicks: volume?.clicks ?? null,
          avgCtr: volume?.ctr ?? null,
          productCount,
          category: shopMeta.category,
          ratio:
            monthly !== null && monthly > 0 && productCount !== null
              ? Math.round((productCount / monthly) * 100) / 100
              : null,
        };
        statsByKeyword.set(keyword, stat);
        if (cache.size >= CACHE_MAX_ENTRIES) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey) cache.delete(oldestKey);
        }
        // 검색수 미확보(검색광고 장애) 항목은 짧게 캐시 — 복구 즉시 재조회되도록
        const ttl = stat.monthlySearches === null ? 1000 * 60 * 10 : CACHE_TTL_MS;
        cache.set(keyword, { stat, expiresAt: now + ttl });
      }
    }

    const stats = keywords
      .map((keyword) => statsByKeyword.get(keyword))
      .filter((stat): stat is KeywordStat => Boolean(stat));

    ////////// 연관 목록: 새로 수집했으면 캐시에 저장, 전량 캐시 히트면 저장분 재사용
    const relatedKey = keywords.join(',');
    let related: RelatedKeyword[];
    if (missing.length > 0) {
      related = Array.from(relatedPool.values())
        .sort((a, b) => b.monthlySearches - a.monthlySearches)
        .slice(0, 30);
      if (relatedCache.size >= CACHE_MAX_ENTRIES) {
        const oldestKey = relatedCache.keys().next().value;
        if (oldestKey) relatedCache.delete(oldestKey);
      }
      if (related.length > 0) relatedCache.set(relatedKey, { related, expiresAt: now + CACHE_TTL_MS });
    } else {
      const cachedRelated = relatedCache.get(relatedKey);
      related = cachedRelated && cachedRelated.expiresAt > now ? cachedRelated.related : [];
    }
    return NextResponse.json({ configured: true, stats, related } satisfies KeywordStatsResponse, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '검색량 조회에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }
}

////////// 검색광고 keywordstool 호출 (HMAC 서명 인증)
async function fetchKeywordTool(
  batch: string[],
  auth: { apiKey: string; secretKey: string; customerId: string },
): Promise<any[]> {
  const path = '/keywordstool';
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', auth.secretKey).update(`${timestamp}.GET.${path}`).digest('base64');

  const url = `${SEARCHAD_BASE}${path}?hintKeywords=${encodeURIComponent(batch.join(','))}&showDetail=1`;
  const response = await fetch(url, {
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
  // keywordstool은 요청 키워드 + 연관키워드 수백 개를 함께 돌려준다 — 호출부에서 분리
  return Array.isArray(body?.keywordList) ? body.keywordList : [];
}

////////// 쇼핑 검색 — 등록 상품 수(total) + 최빈 카테고리 (상위 10개 표본, 호출 수는 동일 1회)
async function fetchShopMeta(
  keyword: string,
  clientId: string,
  clientSecret: string,
): Promise<{ total: number | null; category: string | null }> {
  try {
    const response = await fetch(`${SHOP_API_URL}?query=${encodeURIComponent(keyword)}&display=10`, {
      headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) return { total: null, category: null };
    const body = await response.json();
    const total = Number(body?.total);

    // "대분류 > 중분류" 최빈값
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
    return { total: null, category: null }; // 상품 수 실패는 검색량 표시를 막지 않음
  }
}

////////// 숫자 반올림 (NaN이면 null)
function toRoundedOrNull(value: number, digits = 0): number | null {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

////////// "< 10" 형태 수치 파싱
function parseCount(raw: unknown): { value: number; isLow: boolean } {
  if (typeof raw === 'number') return { value: raw, isLow: false };
  const text = String(raw ?? '').trim();
  if (text.startsWith('<')) return { value: 9, isLow: true };
  const value = Number(text.replace(/,/g, ''));
  return Number.isFinite(value) ? { value, isLow: false } : { value: 0, isLow: true };
}
