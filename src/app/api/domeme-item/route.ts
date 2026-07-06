//////////////////////////////////////// 도매매 상품 조회 프록시 ////////////////////////////////////////
// 상품번호 → 도매꾹 오픈API getItemView 호출(키 은닉) → 화면에 필요한 정보만 정제해 반환.
// - 24시간 인메모리 캐시 (동일 상품 재조회 시 API 호출 없음 — 쿼터 보호)
// - 일시 오류 1회 재시도
// - 상세 이미지 URL에는 HMAC 서명을 붙여 이미지 프록시(domeme-image)의 오픈 프록시 악용을 차단

import { NextResponse } from 'next/server';
import { signDomemeImageUrl } from '@/shared/utils/domemeImageSignature';
import type { DomemeItem, DomemeItemImage } from '@/shared/types/domeme';

const API_BASE = 'https://domeggook.com/ssl/api/';
const API_VERSION = '4.6';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const CACHE_MAX_ENTRIES = 500;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_DETAIL_IMAGES = 60;

// 인메모리 캐시 (서버리스 인스턴스별 — 완전하진 않지만 쿼터 보호에 충분)
const cache = new Map<string, { data: DomemeItem; expiresAt: number }>();

////////// 상세설명 HTML에서 <img> src 추출
function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const pattern = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const src = match[1].trim();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      urls.push(src);
    }
  }
  return Array.from(new Set(urls)).slice(0, MAX_DETAIL_IMAGES);
}

////////// 도매꾹 API 호출 (1회 재시도)
async function fetchItemView(no: string, apiKey: string): Promise<Record<string, unknown>> {
  const url = `${API_BASE}?ver=${API_VERSION}&mode=getItemView&aid=${apiKey}&no=${no}&om=json`;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: 'no-store' });
      const raw = new TextDecoder('utf-8').decode(await response.arrayBuffer());
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!response.ok) throw new Error(`도매꾹 API 응답 오류 (HTTP ${response.status})`);
      return parsed;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500)); // 백오프 후 재시도
    }
  }
  throw lastError;
}

export async function GET(request: Request) {
  const apiKey = process.env.DOMEGGOOK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: '서버에 도매꾹 API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const no = searchParams.get('no');
  if (!no || !/^\d{4,12}$/.test(no)) {
    return NextResponse.json({ error: '올바른 상품번호(no)가 필요합니다.' }, { status: 400 });
  }

  // 캐시 확인
  const cached = cache.get(no);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  }

  try {
    const parsed = await fetchItemView(no, apiKey);
    const root = parsed.domeggook as Record<string, any> | undefined; // 외부 API 응답 — 스키마 미보장이라 any 사용

    if (!root || !root.basis) {
      // 도매꾹 오류 응답 (상품 없음·판매 종료 등)
      const reason =
        (parsed as any)?.errors?.message ?? (root as any)?.errors?.message ?? '상품을 찾지 못했습니다.';
      return NextResponse.json({ error: String(reason) }, { status: 404 });
    }

    ////////// 응답 정제
    const thumbOriginal: string | null = root.thumb?.original ?? root.thumb?.large ?? null;
    const detailHtml: string =
      typeof root.desc?.contents === 'string' ? root.desc.contents : (root.desc?.contents?.item ?? '');

    const images: DomemeItemImage[] = [];
    if (thumbOriginal) {
      images.push({ url: thumbOriginal, proxyUrl: buildProxyUrl(thumbOriginal, apiKey), kind: 'thumb' });
    }
    for (const url of extractImageUrls(detailHtml)) {
      if (url === thumbOriginal) continue;
      images.push({ url, proxyUrl: buildProxyUrl(url, apiKey), kind: 'detail' });
    }

    const supplyPriceRaw = root.price?.supply ?? root.price?.dome ?? null;
    const supplyPrice = supplyPriceRaw !== null ? Number(supplyPriceRaw) : null;

    const data: DomemeItem = {
      no,
      title: String(root.basis.title ?? ''),
      supplyPrice: Number.isFinite(supplyPrice) ? supplyPrice : null,
      itemUrl: `https://domeme.domeggook.com/s/${no}`,
      license: {
        usable: String(root.desc?.license?.usable ?? '') === 'true',
        msg: root.desc?.license?.msg ? String(root.desc.license.msg) : null,
      },
      images,
    };

    // 캐시 저장 (초과 시 가장 오래된 항목 제거)
    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(no, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: '도매매 상품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 502 },
    );
  }
}

////////// 이미지 프록시 URL 생성
function buildProxyUrl(url: string, secret: string): string {
  const signature = signDomemeImageUrl(url, secret);
  return `/api/domeme-image?url=${encodeURIComponent(url)}&sig=${signature}`;
}
