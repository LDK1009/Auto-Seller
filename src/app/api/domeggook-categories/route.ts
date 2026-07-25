//////////////////////////////////////// 도매꾹 카테고리 트리 프록시 ////////////////////////////////////////
// getCat(ver 2.0) — 카테고리별 상품수. 대분류(depth1) > 중분류(depth2) 2단으로 가공.
// getItemList의 ca 검색은 중분류부터 유효(실측)라 셀렉트도 2단까지만. 24시간 캐시.

import { NextResponse } from 'next/server';
import type { DomeggookCategoriesResponse, DomeggookCategory } from '@/shared/types/domeggookSearch';

const API_BASE = 'https://domeggook.com/ssl/api/';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const FETCH_TIMEOUT_MS = 10_000;

let cache: { response: DomeggookCategoriesResponse; expiresAt: number } | null = null;

export async function GET() {
  const apiKey = process.env.DOMEGGOOK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ configured: false, categories: [] } satisfies DomeggookCategoriesResponse);
  }
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.response, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  }

  try {
    const upstreamResponse = await fetch(
      `${API_BASE}?ver=2.0&mode=getCat&aid=${apiKey}&market=dome&om=json`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: 'no-store' },
    );
    const body = await upstreamResponse.json();
    if (body?.errors) {
      console.error('도매꾹 카테고리 오류:', body.errors);
      return NextResponse.json({ error: '카테고리 조회에 실패했어요.' }, { status: 502 });
    }

    // 응답 형태: items.item = { "0": "패션잡화", "@0": {no,id,depth,itemCnt}, "1": ... } 평탄 나열 (실측)
    const flat = body?.domeggook?.items?.item ?? {};
    const categories: DomeggookCategory[] = [];
    let current: DomeggookCategory | null = null;

    for (let index = 0; String(index) in flat; index += 1) {
      const name = String(flat[String(index)] ?? '').trim();
      const meta = flat[`@${index}`] ?? {};
      const depth = Number(meta.depth) || 0;
      const code = String(meta.id ?? '');
      const itemCount = Number(meta.itemCnt) || 0;
      if (!name || !code) continue;

      if (depth === 1) {
        current = { code, name, itemCount, children: [] };
        categories.push(current);
      } else if (depth === 2 && current) {
        current.children.push({ code, name, itemCount });
      }
      // depth 3+ 은 셀렉트 2단 정책상 미사용
    }

    const response: DomeggookCategoriesResponse = { configured: true, categories };
    cache = { response, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '카테고리 조회에 실패했어요.' }, { status: 502 });
  }
}
