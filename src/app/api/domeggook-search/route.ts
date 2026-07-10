//////////////////////////////////////// 도매꾹 상품 검색 프록시 ////////////////////////////////////////
// getItemList(ver 4.1 — 4.6 미지원 실측). 검색조건 없으면 ev=all 전체 검색(실측), 정렬 so=ha 인기순 기본.
// ca 대분류는 kw와 조합될 때만 필터됨 (단독은 API 거부 — 클라이언트에서 차단).
// 성인전용(adultOnly) 상품은 서버단 제외. 1시간 캐시 (조건 조합 키).

import { NextResponse } from 'next/server';
import type { DomeggookSearchItem, DomeggookSearchResponse } from '@/shared/types/domeggookSearch';

const API_BASE = 'https://domeggook.com/ssl/api/';
const CACHE_TTL_MS = 1000 * 60 * 60;
const CACHE_MAX_ENTRIES = 500;
const PAGE_SIZE = 40;
const FETCH_TIMEOUT_MS = 10_000;
const SORT_KEYS = new Set(['ha', 'rd', 'aa', 'da', 'ad']);

const cache = new Map<string, { response: DomeggookSearchResponse; expiresAt: number }>();

export async function GET(request: Request) {
  const apiKey = process.env.DOMEGGOOK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      totalItems: 0,
      totalPages: 0,
      page: 1,
      items: [],
    } satisfies DomeggookSearchResponse);
  }

  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get('kw') ?? '').trim();
  const category = (searchParams.get('ca') ?? '').trim();
  // 조건 전무 = 전체 인기 탐색 — ev=all이 전체 상품을 반환 (실측, 문서 미기재 동작)
  const searchAll = keyword.length === 0 && category.length === 0;

  const sort = SORT_KEYS.has(searchParams.get('so') ?? '') ? (searchParams.get('so') as string) : 'ha';
  // 상한 200 = API 스펙 최대 (기본 40, 전체 탐색 BEST TOP 100은 sz=100)
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('sz') ?? PAGE_SIZE) || PAGE_SIZE));
  const page = Math.max(1, Number(searchParams.get('pg') ?? '1') || 1);
  const minPrice = Number(searchParams.get('mnp')) || 0;
  const maxPrice = Number(searchParams.get('mxp')) || 0;
  const singleUnit = searchParams.get('single') === '1';
  const freeShipping = searchParams.get('free') === '1';
  const lowestPriceOnly = searchParams.get('lwp') === '1';
  const fastShipping = searchParams.get('fdl') === '1';
  const excludeOversea = searchParams.get('nooversea') === '1';

  ////////// 도매꾹 요청 조립
  const upstream = new URL(API_BASE);
  upstream.searchParams.set('ver', '4.1');
  upstream.searchParams.set('mode', 'getItemList');
  upstream.searchParams.set('aid', apiKey);
  upstream.searchParams.set('market', 'dome');
  upstream.searchParams.set('om', 'json');
  upstream.searchParams.set('sz', String(pageSize));
  upstream.searchParams.set('pg', String(page));
  upstream.searchParams.set('so', sort);
  if (keyword) upstream.searchParams.set('kw', keyword);
  if (category) upstream.searchParams.set('ca', category);
  if (searchAll) upstream.searchParams.set('ev', 'all');
  if (minPrice > 0) upstream.searchParams.set('mnp', String(minPrice));
  if (maxPrice > 0) upstream.searchParams.set('mxp', String(maxPrice));
  if (singleUnit) upstream.searchParams.set('mxq', '1');
  if (freeShipping) upstream.searchParams.set('who', 'S');
  if (lowestPriceOnly) upstream.searchParams.set('lwp', 'true');
  if (fastShipping) upstream.searchParams.set('fdl', 'true');
  if (excludeOversea) upstream.searchParams.set('dfos', 'false');

  const cacheKey = upstream.search;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.response, { headers: { 'Cache-Control': 'public, max-age=600' } });
  }

  try {
    const upstreamResponse = await fetch(upstream.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    });
    const body = await upstreamResponse.json();
    if (body?.errors) {
      // 검색 조건 오류 등 — 사용자 문구로 변환
      console.error('도매꾹 검색 오류:', body.errors);
      return NextResponse.json({ error: '검색에 실패했습니다. 조건을 바꿔 다시 시도해주세요.' }, { status: 502 });
    }

    const header = body?.domeggook?.header ?? {};
    let rawItems = body?.domeggook?.list?.item ?? [];
    if (!Array.isArray(rawItems)) rawItems = [rawItems]; // 결과 1개면 객체로 옴

    const items: DomeggookSearchItem[] = rawItems
      .filter((item: any) => String(item?.adultOnly) !== 'true' && Number(item?.adultOnly) !== 1) // 성인전용 제외
      .map((item: any) => ({
        no: Number(item.no),
        title: String(item.title ?? ''),
        price: Number(item.price) || 0,
        thumb: String(item.thumb ?? ''),
        unitQty: Number(item.unitQty) || 1,
        isLowestPrice: String(item.lwp) === 'true' || Number(item.lwp) === 1,
        isBusinessOnly: String(item.comOnly) === 'true' || Number(item.comOnly) === 1,
        url: String(item.url ?? ''),
        shipping: {
          isFree: String(item?.deli?.who ?? '') === 'S',
          fee: Number(item?.deli?.fee) > 0 ? Number(item.deli.fee) : null,
        },
        isOverseaShipping: String(item?.deli?.fromOversea) === 'true',
      }));

    const response: DomeggookSearchResponse = {
      configured: true,
      totalItems: Number(header.numberOfItems) || 0,
      totalPages: Number(header.numberOfPages) || 0,
      page: Number(header.currentPage) || page,
      items,
    };

    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(cacheKey, { response, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(response, { headers: { 'Cache-Control': 'public, max-age=600' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '검색에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }
}
