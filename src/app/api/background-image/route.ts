//////////////////////////////////////// 배경 이미지 프록시 ////////////////////////////////////////
// Pixabay CDN 이미지를 서버 경유로 전달한다.
// 이유: 1) canvas 합성 시 CORS 오염 방지(같은 출처로 제공) 2) Pixabay 핫링크 제한 준수.
// Pixabay 도메인 외 URL은 차단한다(오픈 프록시 방지).

import { NextResponse } from 'next/server';

const ALLOWED_HOST_SUFFIX = 'pixabay.com';
const CACHE_SECONDS = 60 * 60 * 24;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: '이미지 URL(url)이 필요해요.' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: '올바르지 않은 URL이에요.' }, { status: 400 });
  }
  const isAllowedHost =
    parsed.hostname === ALLOWED_HOST_SUFFIX || parsed.hostname.endsWith(`.${ALLOWED_HOST_SUFFIX}`);
  if (parsed.protocol !== 'https:' || !isAllowedHost) {
    return NextResponse.json({ error: '허용되지 않은 이미지 출처예요.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString(), { next: { revalidate: CACHE_SECONDS } });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: '이미지를 불러오지 못했어요.' }, { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '이미지를 불러오지 못했어요.' }, { status: 502 });
  }
}
