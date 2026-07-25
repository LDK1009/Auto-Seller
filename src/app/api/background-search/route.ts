//////////////////////////////////////// 배경 이미지 검색 프록시 ////////////////////////////////////////
// Pixabay API를 서버에서 호출해 키를 은닉한다. 같은 검색어·페이지는 24시간 캐시(fetch revalidate).
// 응답: { items: { id, thumbUrl, imageUrl }[], totalHits }

import { NextResponse } from 'next/server';

const PIXABAY_ENDPOINT = 'https://pixabay.com/api/';
const PER_PAGE = 10;
const CACHE_SECONDS = 60 * 60 * 24; // Pixabay 규정상 검색 결과 24시간 캐시 권장

type PixabayHit = {
  id: number;
  previewURL: string; // 150px 썸네일
  largeImageURL: string; // 1280px — 합성용
};

type PixabayResponse = {
  totalHits: number;
  hits: PixabayHit[];
};

export async function GET(request: Request) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'PIXABAY_API_KEY가 설정되지 않았어요.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const page = Number(searchParams.get('page') ?? '1');
  if (!query) {
    return NextResponse.json({ error: '검색어(query)가 필요해요.' }, { status: 400 });
  }

  const upstreamParams = new URLSearchParams({
    key: apiKey,
    q: query,
    image_type: 'photo',
    category: 'backgrounds', // 배경으로 분류된 이미지만 (인물·사물 사진 제외)
    per_page: String(PER_PAGE),
    page: String(Number.isFinite(page) && page > 0 ? page : 1),
    safesearch: 'true',
    lang: 'ko',
  });

  try {
    const upstream = await fetch(`${PIXABAY_ENDPOINT}?${upstreamParams}`, {
      next: { revalidate: CACHE_SECONDS },
    });

    // Pixabay는 페이지 범위 초과 시 400 + 텍스트를 반환 → 빈 결과로 정규화
    if (!upstream.ok) {
      const body = await upstream.text();
      if (body.includes('out of valid range')) {
        return NextResponse.json({ items: [], totalHits: 0 });
      }
      console.error('Pixabay 응답 오류:', upstream.status, body);
      return NextResponse.json({ error: '이미지 검색에 실패했어요.' }, { status: 502 });
    }

    const data = (await upstream.json()) as PixabayResponse;
    const items = data.hits.map((hit) => ({
      id: hit.id,
      thumbUrl: hit.previewURL,
      imageUrl: hit.largeImageURL,
    }));

    return NextResponse.json({ items, totalHits: data.totalHits });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '이미지 검색에 실패했어요.' }, { status: 502 });
  }
}
