//////////////////////////////////////// 연관 키워드 상품 수 일괄 조회 ////////////////////////////////////////
// 연관 키워드 표에 경쟁강도를 보여주기 위한 경량 프록시 — 키워드당 shop.json 1콜 (total만).
// 검색수는 클라이언트가 연관 풀에서 이미 갖고 있으므로 상품 수만 반환한다.
// 24시간 캐시 + 5개 병렬 청크 (오픈API 일 25,000회 한도 대비 여유).

import { NextResponse } from 'next/server';

const SHOP_API_URL = 'https://openapi.naver.com/v1/search/shop.json';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const CACHE_MAX_ENTRIES = 5000;
const MAX_KEYWORDS_PER_REQUEST = 30;
const CHUNK_SIZE = 5;
const FETCH_TIMEOUT_MS = 10_000;

const cache = new Map<string, { count: number | null; expiresAt: number }>();

export async function GET(request: Request) {
  const clientId = process.env.NAVER_OPENAPI_CLIENT_ID;
  const clientSecret = process.env.NAVER_OPENAPI_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ configured: false, counts: {} });
  }

  const { searchParams } = new URL(request.url);
  const keywords = Array.from(
    new Set(
      (searchParams.get('keywords') ?? '')
        .split(',')
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length > 0),
    ),
  ).slice(0, MAX_KEYWORDS_PER_REQUEST);

  if (keywords.length === 0) {
    return NextResponse.json({ error: '키워드(keywords)가 필요합니다.' }, { status: 400 });
  }

  const now = Date.now();
  const counts: Record<string, number | null> = {};
  const missing: string[] = [];
  for (const keyword of keywords) {
    const cached = cache.get(keyword);
    if (cached && cached.expiresAt > now) counts[keyword] = cached.count;
    else missing.push(keyword);
  }

  ////////// 미캐시분 5개씩 병렬 조회 (개별 실패는 null — 전체를 죽이지 않음)
  for (let index = 0; index < missing.length; index += CHUNK_SIZE) {
    const chunk = missing.slice(index, index + CHUNK_SIZE);
    const results = await Promise.all(chunk.map((keyword) => fetchShopTotal(keyword, clientId, clientSecret)));
    chunk.forEach((keyword, chunkIndex) => {
      const count = results[chunkIndex];
      counts[keyword] = count;
      if (cache.size >= CACHE_MAX_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
      }
      // 실패(null)는 짧게 캐시 — 복구 즉시 재조회
      cache.set(keyword, { count, expiresAt: now + (count === null ? 1000 * 60 * 10 : CACHE_TTL_MS) });
    });
  }

  return NextResponse.json({ configured: true, counts }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
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
    return null;
  }
}
