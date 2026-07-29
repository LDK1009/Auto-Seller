//////////////////////////////////////// AI 이미지 생성 (Gemini) ////////////////////////////////////////
// 서버 전용. 키 미설정 시 configured=false로 강등 (throw 금지 — UI가 "준비 중" 안내).
// 모델은 env로 교체 가능 (원가·화질 실측 후 조정) — 기본은 표준 해상도 모델(장당 원가 최저 구간).
// 원가 감각 (2026-07 리서치): 1024px ≈ $0.039(≈55원) / 1K-2K ≈ $0.134(≈190원)
//   → 크레딧 1개 = 200원이므로 썸네일은 표준 해상도로 생성해야 마진이 남는다.

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image-preview';

export const isImageGenerationConfigured = () => Boolean(process.env.GEMINI_API_KEY);

export type GeneratedImage = {
  base64: string; // data 부분만 (data URL 접두사 제외)
  mimeType: string;
};

////////// 공통 호출 — 텍스트 프롬프트 + (선택) 참조 이미지들 → 이미지 1장
export async function generateImage(params: {
  prompt: string;
  referenceImages?: { base64: string; mimeType: string }[];
}): Promise<GeneratedImage> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('이미지 생성 기능이 아직 준비되지 않았어요.');
  const model = process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL;

  // parts: 참조 이미지 → 프롬프트 순서 (모델이 이미지를 맥락으로 읽고 지시를 적용)
  const parts: Record<string, unknown>[] = [
    ...(params.referenceImages ?? []).map((image) => ({
      inline_data: { mime_type: image.mimeType, data: image.base64 },
    })),
    { text: params.prompt },
  ];

  const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] }),
    cache: 'no-store',
  });

  const parsed = await response.json();
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
        return { base64: inline.data, mimeType: inline.mime_type ?? inline.mimeType ?? 'image/png' };
      }
    }
  }
  throw new Error('이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.');
}

//////////////////// 프롬프트 빌더 ////////////////////
// 셀러 썸네일 관행에 맞춘 지시 — 과장 문구·허위 정보 삽입 금지 (SaaS 책임 범위)
export function buildThumbnailPrompt(params: { productName: string; style: string; headline?: string }): string {
  const headlineLine = params.headline
    ? `이미지 위쪽에 "${params.headline}" 문구를 굵고 읽기 쉬운 한글 서체로 넣어줘. 오타 없이 정확히 그대로.`
    : '문구는 넣지 마.';
  return [
    '온라인 쇼핑몰 상품 썸네일을 만들어줘.',
    `상품: ${params.productName}`,
    `스타일: ${params.style}`,
    '정사각형(1:1) 구도, 상품이 화면 중앙에서 크게 보이게.',
    '참조 이미지의 상품 형태·색상·비율을 그대로 유지하고, 없는 기능이나 다른 제품을 만들어내지 마.',
    headlineLine,
    '가격, 할인율, 인증 마크, 브랜드 로고는 넣지 마.',
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
