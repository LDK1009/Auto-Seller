//////////////////////////////////////// 키워드 통계 프록시 ////////////////////////////////////////
// 네이버 검색광고 API(월간 검색수·경쟁정도) + 쇼핑 오픈API(등록 상품 수)를 조합해 반환한다.
// - 키 미설정 시 configured:false (UI가 발급 안내로 전환 — 에러 아님)
// - 24시간 인메모리 캐시 (약관 리스크·쿼터 보호의 핵심 — docs/launch/naver-keys-guide.md)
// - 검색광고 keywordstool은 호출당 힌트 키워드 최대 5개

import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import type { KeywordStat, KeywordStatsResponse } from '@/shared/types/keywordStats';

const SEARCHAD_BASE = 'https://api.searchad.naver.com';
const SHOP_API_URL = 'https://openapi.naver.com/v1/search/shop.json';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const CACHE_MAX_ENTRIES = 2000;
const MAX_KEYWORDS_PER_REQUEST = 10; // UI 요청 상한 (검색광고 5개 × 2회)
const FETCH_TIMEOUT_MS = 10_000;

const cache = new Map<string, { stat: KeywordStat; expiresAt: number }>();

export async function GET(request: Request) {
  const apiKey = process.env.NAVER_SEARCHAD_API_KEY;
  const secretKey = process.env.NAVER_SEARCHAD_SECRET_KEY;
  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID;
  const clientId = process.env.NAVER_OPENAPI_CLIENT_ID;
  const clientSecret = process.env.NAVER_OPENAPI_CLIENT_SECRET;

  if (!apiKey || !secretKey || !customerId) {
    return NextResponse.json({ configured: false, stats: [] } satisfies KeywordStatsResponse);
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
    const missing: string[] = [];
    for (const keyword of keywords) {
      const cached = cache.get(keyword);
      if (cached && cached.expiresAt > now) statsByKeyword.set(keyword, cached.stat);
      else missing.push(keyword);
    }

    if (missing.length > 0) {
      ////////// 1) 검색광고 keywordstool (5개씩 배치)
      const searchVolumes = new Map<string, { monthly: number; isLow: boolean; comp: string | null }>();
      for (let index = 0; index < missing.length; index += 5) {
        const batch = missing.slice(index, index + 5);
        const list = await fetchKeywordTool(batch, { apiKey, secretKey, customerId });
        for (const entry of list) {
          const pc = parseCount(entry.monthlyPcQcCnt);
          const mobile = parseCount(entry.monthlyMobileQcCnt);
          searchVolumes.set(String(entry.relKeyword), {
            monthly: pc.value + mobile.value,
            isLow: pc.isLow && mobile.isLow,
            comp: entry.compIdx ? String(entry.compIdx) : null,
          });
        }
      }

      ////////// 2) 쇼핑 상품 수 (키워드별 1회 — 오픈API 키 없으면 생략)
      for (const keyword of missing) {
        const volume = searchVolumes.get(keyword);
        const productCount =
          clientId && clientSecret ? await fetchShopTotal(keyword, clientId, clientSecret) : null;

        const monthly = volume?.monthly ?? null;
        const stat: KeywordStat = {
          keyword,
          monthlySearches: monthly,
          isLowVolume: volume?.isLow ?? false,
          competition: volume?.comp ?? null,
          productCount,
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
        cache.set(keyword, { stat, expiresAt: now + CACHE_TTL_MS });
      }
    }

    const stats = keywords
      .map((keyword) => statsByKeyword.get(keyword))
      .filter((stat): stat is KeywordStat => Boolean(stat));
    return NextResponse.json({ configured: true, stats } satisfies KeywordStatsResponse, {
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
  const list: any[] = Array.isArray(body?.keywordList) ? body.keywordList : [];
  // keywordstool은 연관키워드까지 돌려주므로, 요청한 키워드만 추린다 (공백 제거 대소문자 무시 비교)
  const wanted = new Set(batch.map((keyword) => keyword.toLowerCase()));
  return list.filter((entry) => wanted.has(String(entry.relKeyword ?? '').replace(/\s+/g, '').toLowerCase()));
}

////////// 쇼핑 검색 — 등록 상품 수 (total)
async function fetchShopTotal(keyword: string, clientId: string, clientSecret: string): Promise<number | null> {
  try {
    const response = await fetch(`${SHOP_API_URL}?query=${encodeURIComponent(keyword)}&display=1`, {
      headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const body = await response.json();
    const total = Number(body?.total);
    return Number.isFinite(total) ? total : null;
  } catch {
    return null; // 상품 수 실패는 검색량 표시를 막지 않음
  }
}

////////// "< 10" 형태 수치 파싱
function parseCount(raw: unknown): { value: number; isLow: boolean } {
  if (typeof raw === 'number') return { value: raw, isLow: false };
  const text = String(raw ?? '').trim();
  if (text.startsWith('<')) return { value: 9, isLow: true };
  const value = Number(text.replace(/,/g, ''));
  return Number.isFinite(value) ? { value, isLow: false } : { value: 0, isLow: true };
}
