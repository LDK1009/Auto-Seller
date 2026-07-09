//////////////////////////////////////// 스마트스토어 카테고리 후보 추천 프록시 ////////////////////////////////////////
// 상품명으로 네이버쇼핑을 검색해 상위 상품들의 카테고리 경로(category1~4) 최빈값을 후보로 돌려준다.
// leafCategoryId(등록용 코드)까지는 못 주지만, "등록 화면에서 어느 경로를 고를지"의 답은 충분히 된다.
// 24시간 캐시 · 키 미설정 시 configured:false.

import { NextResponse } from 'next/server';

const SHOP_API_URL = 'https://openapi.naver.com/v1/search/shop.json';
const SAMPLE_SIZE = 20; // 상위 상품 표본 수
const MAX_CANDIDATES = 3;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const CACHE_MAX_ENTRIES = 1000;
const FETCH_TIMEOUT_MS = 10_000;

export type CategoryCandidate = {
  path: string; // "디지털/가전 > 생활가전 > 조명" 형태
  count: number; // 표본 중 이 경로에 속한 상품 수
  sampleSize: number;
};

type CategorySuggestResponse = {
  configured: boolean;
  candidates: CategoryCandidate[];
};

const cache = new Map<string, { candidates: CategoryCandidate[]; expiresAt: number }>();

export async function GET(request: Request) {
  const clientId = process.env.NAVER_OPENAPI_CLIENT_ID;
  const clientSecret = process.env.NAVER_OPENAPI_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ configured: false, candidates: [] } satisfies CategorySuggestResponse);
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim().slice(0, 100);
  if (query.length === 0) {
    return NextResponse.json({ error: '검색어(q)가 필요합니다.' }, { status: 400 });
  }

  ////////// 캐시
  const cached = cache.get(query);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ configured: true, candidates: cached.candidates } satisfies CategorySuggestResponse);
  }

  try {
    const response = await fetch(`${SHOP_API_URL}?query=${encodeURIComponent(query)}&display=${SAMPLE_SIZE}`, {
      headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) {
      return NextResponse.json({ error: '카테고리 후보 조회에 실패했습니다.' }, { status: 502 });
    }
    const body = await response.json();
    const items: any[] = Array.isArray(body?.items) ? body.items : [];

    ////////// 카테고리 경로 최빈값 집계
    const pathCounts = new Map<string, number>();
    for (const item of items) {
      const path = [item.category1, item.category2, item.category3, item.category4]
        .map((segment) => String(segment ?? '').trim())
        .filter((segment) => segment.length > 0)
        .join(' > ');
      if (path.length === 0) continue;
      pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
    }

    const candidates: CategoryCandidate[] = Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CANDIDATES)
      .map(([path, count]) => ({ path, count, sampleSize: items.length }));

    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(query, { candidates, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json({ configured: true, candidates } satisfies CategorySuggestResponse, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '카테고리 후보 조회에 실패했습니다.' }, { status: 502 });
  }
}
