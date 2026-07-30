//////////////////////////////////////// AI 이미지 생성 (Gemini) ////////////////////////////////////////
// 서버 전용. 키 미설정 시 configured=false로 강등 (throw 금지 — UI가 "준비 중" 안내).
// 모델은 env(GEMINI_IMAGE_MODEL)로 교체 가능 — 기본값은 아래 실측 근거로 Flash 고정.

import { findThumbnailDirection, HEADLINE_MAX_LENGTH } from '@/shared/constants/aiThumbnail';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// 2026-07-29 실측으로 Flash 확정 (동일 프롬프트 비교):
//   3.1-flash-image  17.9s · 이미지 1,120토큰 · 장당 약 30-55원 → 크레딧 200원 대비 마진 73-85%
//   3-pro-image      27.8s · 동일 토큰      · 장당 약 190원   → 마진 5% (적자 위험)
// 품질(한글 문구 렌더·구도)은 양쪽 합격이라 Pro를 쓸 근거가 없다.
// 2026-07-30 재실측 (동일 참조 이미지·동일 프롬프트, 순수 API 왕복):
//   3.1-flash-image      12.8s / 11.8s  → 유일한 실사용 후보
//   3.1-flash-lite-image 28.2s          → 더 느리고 구도도 나쁨 (상품이 떠 있고 문구가 작음)
//   3-pro-image          303초 후 연결 끊김 → 사용 불가
const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image';
const RETRYABLE_ATTEMPTS = 2; // 503(혼잡)·빈 응답 대비 1회 재시도
const RETRY_DELAY_MS = 1500;

export const isImageGenerationConfigured = () => Boolean(process.env.GEMINI_API_KEY);

export type GeneratedImage = {
  base64: string; // data 부분만 (data URL 접두사 제외)
  mimeType: string;
};

// Gemini 응답 — 이미지 파트 키가 응답마다 snake/camel로 섞여 온다 (둘 다 받는다)
type GeminiInlineData = { data?: string; mime_type?: string; mimeType?: string };
type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; inline_data?: GeminiInlineData; inlineData?: GeminiInlineData }[] } }[];
  error?: { message?: string };
};

////////// 공통 호출 — 텍스트 프롬프트 + (선택) 참조 이미지들 → 이미지 1장
export async function generateImage(params: {
  prompt: string;
  referenceImages?: { base64: string; mimeType: string }[];
}): Promise<GeneratedImage> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('이미지 생성 기능이 아직 준비되지 않았어요.');
  // `??`가 아니라 `||` — env에 키만 있고 값이 빈 문자열이면 모델명 없이 호출돼 404가 난다
  const model = process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;

  // parts: 참조 이미지 → 프롬프트 순서 (모델이 이미지를 맥락으로 읽고 지시를 적용)
  const parts: Record<string, unknown>[] = [
    ...(params.referenceImages ?? []).map((image) => ({
      inline_data: { mime_type: image.mimeType, data: image.base64 },
    })),
    { text: params.prompt },
  ];

  // 응답은 text로 먼저 받는다 — 빈 바디/HTML 오류면 response.json()이
  // "Unexpected end of JSON input"만 던져서 원인(상태코드·바디)이 사라진다
  //
  // 재시도가 필요한 이유 (2026-07-30 실측): 이미지 모델은 혼잡 시 503 UNAVAILABLE
  // ("This model is currently experiencing high demand")을 그냥 던진다. 1회 재시도로 대부분 통과한다.
  let response: Response | null = null;
  let rawBody = '';
  for (let attempt = 0; attempt < RETRYABLE_ATTEMPTS; attempt += 1) {
    response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
      cache: 'no-store',
    });
    rawBody = await response.text();
    const isRetryable = response.status === 429 || response.status >= 500 || rawBody === '';
    if (!isRetryable || attempt === RETRYABLE_ATTEMPTS - 1) break;
    console.error(`이미지 생성 재시도 (status=${response.status}, 시도 ${attempt + 1})`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
  if (!response) throw new Error('이미지 생성에 실패했어요. 잠시 후 다시 시도해주세요.');

  if (!rawBody) {
    console.error(`이미지 생성 API 빈 응답: status=${response.status} model=${model}`);
    throw new Error('이미지 생성 서버가 응답을 주지 않았어요. 잠시 후 다시 시도해주세요.');
  }

  let parsed: GeminiResponse | null = null;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    console.error(`이미지 생성 API 응답 파싱 실패: status=${response.status} body=${rawBody.slice(0, 300)}`);
    throw new Error('이미지 생성 서버 응답을 읽지 못했어요. 잠시 후 다시 시도해주세요.');
  }

  if (!response.ok) {
    console.error('이미지 생성 API 오류:', parsed);
    throw new Error(parsed?.error?.message ?? '이미지 생성에 실패했어요.');
  }

  // 응답 parts 중 inline_data(이미지)를 찾는다 (텍스트 설명이 함께 오는 경우가 있음)
  const candidates = parsed?.candidates ?? [];
  for (const candidate of candidates) {
    for (const part of candidate?.content?.parts ?? []) {
      const inline = part?.inline_data ?? part?.inlineData;
      if (inline?.data) {
        return { base64: inline.data, mimeType: inline.mime_type ?? inline.mimeType ?? 'image/jpeg' };
      }
    }
  }
  throw new Error('이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.');
}

//////////////////// 프롬프트 빌더 ////////////////////
// 셀러 썸네일 관행에 맞춘 지시 — 과장 문구·허위 정보 삽입 금지 (SaaS 책임 범위)
// 디자이너 브리프 방식 — 역할·캔버스·아트디렉션·제품처리·타이포·금지를 규격으로 준다.
// 한 줄 지시("썸네일 만들어줘")와 비교 실측한 결과가 아트디렉션 스펙(constants/aiThumbnail)에 정리돼 있다.
export function buildThumbnailPrompt(params: {
  productName: string;
  styleId?: string;
  headline?: string;
}): string {
  const direction = findThumbnailDirection(params.styleId);
  // 문구는 사용자 입력 — 줄바꿈·과한 길이를 잘라 브리프 구조가 깨지지 않게 한다
  const headline = params.headline?.replace(/\s+/g, ' ').trim().slice(0, HEADLINE_MAX_LENGTH);

  const typography = headline
    ? [
        `- 문구는 "${headline}" 한 줄만. 오타 없이 정확히 그대로.`,
        '- 한글 굵은 고딕(Black), 자간은 좁게, 줄바꿈 없음.',
        '- 글자 폭이 캔버스 가로의 55-70%를 차지하게 크게.',
        `- 색은 ${direction.textColor}. 외곽선·그림자·그라데이션·기울임 없음.`,
        '- 중요: 글자와 제품이 조금이라도 겹치면 실패다. 겹칠 것 같으면 제품을 아래로 내리고 크기를 줄여 겹침을 없앤다.',
      ].join('\n')
    : '- 글자와 숫자는 넣지 않는다.';

  return [
    '너는 네이버 스마트스토어 상품 썸네일을 전문으로 만드는 커머스 디자이너야.',
    '아래 브리프대로 참조 사진을 편집해서 썸네일 1장을 완성해.',
    '',
    `[상품] ${params.productName}`,
    '※ 상품명은 맥락 파악용이다. 상품명이나 그 일부를 이미지에 글자로 쓰지 마.',
    '',
    '[캔버스]',
    '- 1:1 정사각형(1000×1000 기준). 배경은 캔버스를 가득 채운다.',
    '- 글자와 제품은 캔버스 가장자리에서 최소 5% 떨어뜨린다. 여백에 선·테두리·프레임을 그리지 마.',
    '',
    '[아트디렉션]',
    ...direction.lines,
    '',
    '[제품 처리]',
    '- 참조 사진의 제품을 그대로 쓴다. 형태·색상·질감·비율·개수 변경 금지, 없는 제품·부품 창작 금지.',
    '- 제품 외곽을 배경에서 깔끔하게 분리하고, 바닥에 아주 짧은 접지 그림자(불투명도 15-20%)를 둔다.',
    '- 제품 초점은 선명하게. 흐리게 처리하지 마.',
    '',
    '[타이포그래피]',
    typography,
    '',
    '[금지]',
    '- 광선·반짝임·렌즈플레어·빛번짐, 패턴 오버레이, 그라데이션 장식',
    '- 스티커·리본·배지·라벨·말풍선·테두리 프레임',
    `- ${headline ? `지정한 "${headline}"` : '지정된 문구'} 외의 모든 글자 — 상품명·영문 슬로건·수량(예: 2매입)·단위·용량·가격·할인율·숫자 뱃지·인증마크·브랜드 로고·워터마크 전부 금지`,
    '- 사람 손·얼굴을 새로 만들어 넣지 않는다',
  ].join('\n');
}

export function buildDetailSectionPrompt(params: {
  productName: string;
  sectionTitle: string;
  sectionBody: string;
}): string {
  return [
    '온라인 쇼핑몰 상세페이지의 한 섹션 이미지를 만들어줘.',
    `상품: ${params.productName}`,
    `섹션 제목: ${params.sectionTitle}`,
    `섹션 내용: ${params.sectionBody}`,
    '세로형(4:5) 구도, 여백이 넉넉한 깔끔한 편집 디자인.',
    '제목과 내용을 한글로 정확히 렌더링하고, 오타 없이 그대로 넣어줘.',
    '참조 이미지의 상품 형태·색상을 유지하고, 없는 기능·수치·효능을 지어내지 마.',
    '가격, 할인율, 인증 마크는 넣지 마.',
  ].join('\n');
}
