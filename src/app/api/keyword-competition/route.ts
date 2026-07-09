//////////////////////////////////////// 연관 키워드 상품 수 일괄 조회 ////////////////////////////////////////
// 연관 키워드 표에 경쟁강도를 보여주기 위한 경량 프록시 — 키워드당 shop.json 1콜 (total만).
// 검색수는 클라이언트가 연관 풀에서 이미 갖고 있으므로 상품 수만 반환한다.
// ⚠️ 오픈API 속도 제한(대략 10콜/초, errorCode 012) 실측 확인 — 3콜 청크 + 간격 + 429 재시도로 방어.
//    클라이언트(keywordStatsService)도 10개씩 나눠 순차 요청한다 (서버리스 타임아웃 회피 + 점진 표시).

import { NextResponse } from 'next/server';

const SHOP_API_URL = 'https://openapi.naver.com/v1/search/shop.json';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const FAIL_CACHE_TTL_MS = 1000 * 60 * 10; // 비정상 응답(429 제외)은 짧게
const CACHE_MAX_ENTRIES = 5000;
const MAX_KEYWORDS_PER_REQUEST = 10;
const CHUNK_SIZE = 3; // 속도 제한 안전 구간
const CHUNK_DELAY_MS = 320;
const RETRY_DELAY_MS = 900;
const MAX_PASSES = 2; // 1차 + 429 재시도 1차
const FETCH_TIMEOUT_MS = 10_000;

const cache = new Map<string, { count: number | null; expiresAt: number }>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  let pending: string[] = [];
  for (const keyword of keywords) {
    const cached = cache.get(keyword);
    if (cached && cached.expiresAt > now) counts[keyword] = cached.count;
    else pending.push(keyword);
  }

  ////////// 미캐시분: 3콜 청크 + 간격, 429는 다음 패스에서 재시도
  for (let pass = 0; pass < MAX_PASSES && pending.length > 0; pass++) {
    if (pass > 0) await sleep(RETRY_DELAY_MS); // 제한 해제 대기 후 재시도
    const rateLimited: string[] = [];

    for (let index = 0; index < pending.length; index += CHUNK_SIZE) {
      const chunk = pending.slice(index, index + CHUNK_SIZE);
      const results = await Promise.all(chunk.map((keyword) => fetchShopTotal(keyword, clientId, clientSecret)));
      chunk.forEach((keyword, chunkIndex) => {
        const result = results[chunkIndex];
        if (result.isRateLimited) {
          rateLimited.push(keyword); // 캐시하지 않음 — 재시도 대상
          return;
        }
        counts[keyword] = result.total;
        setCache(keyword, result.total, result.total === null ? FAIL_CACHE_TTL_MS : CACHE_TTL_MS);
      });
      if (index + CHUNK_SIZE < pending.length) await sleep(CHUNK_DELAY_MS);
    }
    pending = rateLimited;
  }

  // 재시도까지 실패한 429 잔여분: null 반환하되 캐시 안 함 (다음 요청에서 자연 재시도)
  for (const keyword of pending) counts[keyword] = null;

  return NextResponse.json({ configured: true, counts }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}

////////// 캐시 기록 (오래된 항목 밀어내기)
function setCache(keyword: string, count: number | null, ttlMs: number) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(keyword, { count, expiresAt: Date.now() + ttlMs });
}

////////// 쇼핑 검색 — 등록 상품 수 (total). 429는 재시도 대상으로 구분
async function fetchShopTotal(
  keyword: string,
  clientId: string,
  clientSecret: string,
): Promise<{ total: number | null; isRateLimited: boolean }> {
  try {
    const response = await fetch(`${SHOP_API_URL}?query=${encodeURIComponent(keyword)}&display=1`, {
      headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (response.status === 429) return { total: null, isRateLimited: true };
    if (!response.ok) return { total: null, isRateLimited: false };
    const body = await response.json();
    const total = Number(body?.total);
    return { total: Number.isFinite(total) ? total : null, isRateLimited: false };
  } catch {
    return { total: null, isRateLimited: false };
  }
}
