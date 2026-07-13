//////////////////////////////////////// 도매꾹 상품 조회 프록시 ////////////////////////////////////////
// 상품번호 → 도매꾹 오픈API getItemView 호출(키 은닉) → 화면에 필요한 정보만 정제해 반환.
// - 24시간 인메모리 캐시 (동일 상품 재조회 시 API 호출 없음 — 쿼터 보호)
// - 일시 오류 1회 재시도
// - 상세 이미지 URL에는 HMAC 서명을 붙여 이미지 프록시(domeggook-image)의 오픈 프록시 악용을 차단

import { NextResponse } from 'next/server';
import { signDomeggookImageUrl } from '@/shared/utils/domeggookImageSignature';
import type { DomeggookItem, DomeggookItemImage } from '@/shared/types/domeggook';

const API_BASE = 'https://domeggook.com/ssl/api/';
const API_VERSION = '4.6';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const CACHE_MAX_ENTRIES = 500;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_DETAIL_IMAGES = 60;

// 인메모리 캐시 (서버리스 인스턴스별 — 완전하진 않지만 쿼터 보호에 충분)
const cache = new Map<string, { data: DomeggookItem; expiresAt: number }>();

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

    const images: DomeggookItemImage[] = [];
    if (thumbOriginal) {
      images.push({ url: thumbOriginal, proxyUrl: buildProxyUrl(thumbOriginal, apiKey), kind: 'thumb' });
    }
    for (const url of extractImageUrls(detailHtml)) {
      if (url === thumbOriginal) continue;
      images.push({ url, proxyUrl: buildProxyUrl(url, apiKey), kind: 'detail' });
    }

    ////////// 등록 준비 패키지 필드 추출
    const deli = root.deli ?? {};
    const domeDeli = deli.dome ?? {};
    const infoDutyItems = root.detail?.infoDuty?.item;
    const categoryElems: { name?: string }[] = root.category?.parents?.elem ?? [];
    const categoryNames = [
      ...categoryElems.map((element) => element?.name).filter(Boolean),
      root.category?.current?.name,
    ].filter(Boolean);

    const data: DomeggookItem = {
      no,
      title: String(root.basis.title ?? ''),
      itemUrl: `https://domeggook.com/${no}`,
      license: {
        usable: String(root.desc?.license?.usable ?? '') === 'true',
        msg: root.desc?.license?.msg ? String(root.desc.license.msg) : null,
      },
      images,

      domePrice: toNumberOrNull(root.price?.dome),
      supplyPrice: toNumberOrNull(root.price?.supply),
      resaleMinimum: toNumberOrNull(root.price?.resale?.minimum),
      moq: toNumberOrNull(root.qty?.domeMoq) ?? 1,
      inventory: toNumberOrNull(root.qty?.inventory),
      taxType: toStringOrNull(root.basis?.tax),
      origin: toStringOrNull(root.detail?.country),
      manufacturer: toStringOrNull(root.detail?.manufacturer),
      model: toStringOrNull(root.detail?.model),
      infoDuty: {
        type: toStringOrNull(root.detail?.infoDuty?.type),
        items: (Array.isArray(infoDutyItems) ? infoDutyItems : infoDutyItems ? [infoDutyItems] : [])
          .map((entry: any) => ({ name: String(entry?.name ?? ''), desc: String(entry?.desc ?? '') }))
          .filter((entry: { name: string }) => entry.name),
      },
      delivery: {
        method: toStringOrNull(deli.method),
        pay: toStringOrNull(deli.pay),
        feeType: toStringOrNull(domeDeli.type),
        baseFee: parseBaseFee(domeDeli.tbl),
        feeRaw: toStringOrNull(domeDeli.tbl),
        jejuExtra: toNumberOrNull(deli.feeExtra?.jeju),
        islandsExtra: toNumberOrNull(deli.feeExtra?.islands),
        sendAvgDays: toNumberOrNull(deli.sendAvg),
      },
      returnInfo: {
        fee: toNumberOrNull(root.return?.deliAmt),
        exchangeDouble: String(root.return?.deliAmtDouble ?? '') === 'true',
      },
      categoryPath: categoryNames.length > 0 ? categoryNames.join(' > ') : null,
      supplierName: toStringOrNull(root.seller?.company?.name) ?? toStringOrNull(root.seller?.nick),
      options: parseOptions(root.selectOpt),
      keywords: parseKeywords(root.basis?.keywords?.kw),
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
      { error: '도매꾹 상품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 502 },
    );
  }
}

////////// 이미지 프록시 URL 생성
function buildProxyUrl(url: string, secret: string): string {
  const signature = signDomeggookImageUrl(url, secret);
  return `/api/domeggook-image?url=${encodeURIComponent(url)}&sig=${signature}`;
}

////////// 값 정규화 (외부 API 응답 — 문자열/숫자 혼재)
function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

////////// 공급사 키워드 파싱 (단일 문자열/배열 혼재 대응)
function parseKeywords(kw: unknown): string[] {
  const list = Array.isArray(kw) ? kw : kw ? [kw] : [];
  return list
    .map((entry) => String(entry).trim())
    .filter((keyword) => keyword.length > 0)
    .slice(0, 20);
}

////////// 옵션 조합 파싱 — selectOpt는 이중 인코딩 JSON 문자열, data 맵에 조합별 옵션명·가산가·재고
const MAX_OPTIONS = 200;

function parseOptions(selectOpt: unknown): { name: string; priceAdd: number; stock: number }[] {
  try {
    const parsed = typeof selectOpt === 'string' ? JSON.parse(selectOpt) : selectOpt;
    const data = parsed?.data;
    if (!data || typeof data !== 'object') return [];

    const options = Object.values(data as Record<string, any>)
      .filter((entry) => entry && String(entry.hid ?? '0') !== '1') // 숨김 옵션 제외
      .map((entry) => ({
        name: String(entry.name ?? '').trim(),
        priceAdd: toNumberOrNull(entry.domPrice) ?? 0,
        stock: toNumberOrNull(entry.qty) ?? 0,
      }))
      .filter((option) => option.name.length > 0)
      .slice(0, MAX_OPTIONS);

    // 조합 1개 + 가산가 0 = 사실상 단일 상품 → 옵션 없음으로 취급
    if (options.length === 1 && options[0].priceAdd === 0) return [];
    return options;
  } catch {
    return []; // 파싱 실패 시 옵션 없음 (시트의 다른 항목은 정상 제공)
  }
}

////////// 배송비 테이블 파싱 — "80+3000|80+3000" 형식의 첫 구간 요금 추출 (불확실하면 null, 원문은 feeRaw로 보존)
function parseBaseFee(tbl: unknown): number | null {
  if (typeof tbl !== 'string' || tbl.length === 0) return null;
  const firstTier = tbl.split('|')[0];
  const feePart = firstTier.includes('+') ? firstTier.split('+')[1] : firstTier;
  return toNumberOrNull(feePart);
}
