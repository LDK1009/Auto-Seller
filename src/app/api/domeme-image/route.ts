//////////////////////////////////////// 도매꾹 이미지 중계 프록시 ////////////////////////////////////////
// 공급사 호스팅 이미지를 서버 경유로 전달한다 (canvas 가공을 위한 CORS 해소).
// 상세 이미지는 호스팅 도메인이 제각각이라 허용 목록 대신 HMAC 서명으로 통제:
// domeme-item이 발급한 서명된 URL만 통과 → 오픈 프록시 악용 차단.

import { NextResponse } from 'next/server';
import { signDomemeImageUrl } from '@/shared/utils/domemeImageSignature';

const CACHE_SECONDS = 60 * 60 * 24;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 20 * 1024 * 1024; // 20MB 초과 이미지는 중계하지 않음

// 확장자 → Content-Type (업스트림이 octet-stream 등으로 주는 경우 보정 — 도구들의 image/* 검증 통과용)
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

////////// 신뢰 호스트 (도매꾹 CDN·ESM 이미지호스팅 — 특정 서비스 CDN 한정이라 오픈 프록시 아님)
// P-2 엑셀 이미지 URL용. views/excel-import/_utils/parseExcelImages.ts의 목록과 동기화할 것.
const TRUSTED_HOST_SUFFIXES = ['domeggook.com', 'esmplus.com'];

function isTrustedHost(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return (
      protocol === 'https:' &&
      TRUSTED_HOST_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))
    );
  } catch {
    return false;
  }
}

function resolveImageContentType(upstreamType: string | null, url: string): string {
  if (upstreamType?.startsWith('image/')) return upstreamType;
  const extension = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_CONTENT_TYPES[extension] ?? 'image/jpeg';
}

export async function GET(request: Request) {
  const apiKey = process.env.DOMEGGOOK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: '서버에 도매꾹 API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const signature = searchParams.get('sig');
  if (!url) {
    return NextResponse.json({ error: '이미지 URL(url)이 필요합니다.' }, { status: 400 });
  }

  // 통과 조건: ① 도매꾹 CDN 호스트(P-2 엑셀 URL — 서명 불필요) 또는 ② domeme-item이 발급한 HMAC 서명
  if (!isTrustedHost(url)) {
    if (!signature || signDomemeImageUrl(url, apiKey) !== signature) {
      return NextResponse.json({ error: '허용되지 않은 이미지 요청입니다.' }, { status: 403 });
    }
  }

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: '이미지를 불러오지 못했습니다.' }, { status: 502 });
    }

    const contentLength = Number(upstream.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BYTES) {
      return NextResponse.json({ error: '이미지가 너무 큽니다 (20MB 초과).' }, { status: 413 });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': resolveImageContentType(upstream.headers.get('content-type'), url),
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '이미지를 불러오지 못했습니다.' }, { status: 502 });
  }
}
