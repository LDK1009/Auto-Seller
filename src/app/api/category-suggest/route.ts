//////////////////////////////////////// 스마트스토어 카테고리 후보 추천 프록시 ////////////////////////////////////////
// 상품명으로 네이버쇼핑을 검색해 상위 상품들의 카테고리 경로(category1~4) 최빈값을 후보로 돌려준다.
// leafCategoryId(등록용 코드)까지는 못 주지만, "등록 화면에서 어느 경로를 고를지"의 답은 충분히 된다.
// + titleTokens: 상위 상품 제목에서 자주 쓰는 토큰 (스마트스토어 기준 키워드 추천 재료 — 같은 응답 재활용, 추가 콜 없음)
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

export type TitleToken = {
  token: string;
  count: number; // 표본 제목 중 사용 상품 수
};

type CategorySuggestResponse = {
  configured: boolean;
  candidates: CategoryCandidate[];
  titleTokens: TitleToken[];
};

const MAX_TITLE_TOKENS = 12;

const cache = new Map<string, { candidates: CategoryCandidate[]; titleTokens: TitleToken[]; expiresAt: number }>();

export async function GET(request: Request) {
  const clientId = process.env.NAVER_OPENAPI_CLIENT_ID;
  const clientSecret = process.env.NAVER_OPENAPI_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ configured: false, candidates: [], titleTokens: [] } satisfies CategorySuggestResponse);
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim().slice(0, 100);
  if (query.length === 0) {
    return NextResponse.json({ error: '검색어(q)가 필요합니다.' }, { status: 400 });
  }

  ////////// 캐시
  const cached = cache.get(query);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      configured: true,
      candidates: cached.candidates,
      titleTokens: cached.titleTokens,
    } satisfies CategorySuggestResponse);
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

    ////////// 제목 토큰 빈도 — 경쟁 상품들이 실제 쓰는 단어 (상품당 1회 카운트)
    const tokenCounts = new Map<string, number>();
    for (const item of items) {
      const plainTitle = String(item.title ?? '')
        .replace(/<[^>]+>/g, '') // <b> 강조 태그 제거
        .replace(/&amp;/g, '&')
        .replace(/&quot;|&#39;|&lt;|&gt;/g, ' ');
      const tokens = new Set(
        plainTitle
          .split(/\s+/)
          .map((raw) => raw.replace(/[^가-힣a-zA-Z0-9]/g, ''))
          .filter((token) => token.length >= 2 && !/^\d+$/.test(token)),
      );
      for (const token of tokens) {
        tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
      }
    }
    const titleTokens: TitleToken[] = Array.from(tokenCounts.entries())
      .filter(([, count]) => count >= 2) // 한 상품만 쓴 단어 제외
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TITLE_TOKENS)
      .map(([token, count]) => ({ token, count }));

    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(query, { candidates, titleTokens, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json({ configured: true, candidates, titleTokens } satisfies CategorySuggestResponse, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '카테고리 후보 조회에 실패했습니다.' }, { status: 502 });
  }
}
