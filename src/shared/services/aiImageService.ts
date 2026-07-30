//////////////////////////////////////// AI 이미지 생성 서비스 (클라이언트) ////////////////////////////////////////
// 서버 API 호출 전담. 크레딧 차감·환불은 서버가 처리하므로 여기서는 결과만 다룬다.

export type GeneratedImagePayload = { base64: string; mimeType: string };

////////// Blob → base64 (data URL 접두사 제거)
export async function blobToBase64(blob: Blob): Promise<GeneratedImagePayload> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('이미지를 읽지 못했어요.'));
    reader.readAsDataURL(blob);
  });
  const [, base64 = ''] = dataUrl.split(',');
  return { base64, mimeType: blob.type || 'image/png' };
}

////////// base64 → Blob (생성 결과를 슬롯에 넣기 위해)
export function base64ToBlob(payload: GeneratedImagePayload): Blob {
  const binary = atob(payload.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: payload.mimeType });
}

//////////////////// 썸네일 생성 (크레딧 1) ////////////////////
export type ThumbnailRequest = {
  accessToken: string;
  productName: string;
  style: string;
  headline?: string;
  image: GeneratedImagePayload;
};

export type AiGenerateError = Error & { needsCredits?: boolean; notConfigured?: boolean };

async function postJson(path: string, accessToken: string, body: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const parsed = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(parsed?.error ?? '이미지 생성에 실패했어요.') as AiGenerateError;
    error.needsCredits = Boolean(parsed?.needsCredits);
    error.notConfigured = parsed?.configured === false;
    throw error;
  }
  return parsed;
}

export async function generateThumbnail(
  request: ThumbnailRequest,
): Promise<{ image: GeneratedImagePayload; creditsSpent: number }> {
  const { accessToken, ...body } = request;
  return postJson('/api/ai/thumbnail', accessToken, body);
}

//////////////////// 상세페이지 생성 (크레딧 5) ////////////////////
export type DetailPageRequest = {
  accessToken: string;
  productName: string;
  sections: { title: string; body: string }[];
  image: GeneratedImagePayload;
};

export async function generateDetailPage(
  request: DetailPageRequest,
): Promise<{ images: { title: string; base64: string; mimeType: string }[]; creditsSpent: number }> {
  const { accessToken, ...body } = request;
  return postJson('/api/ai/detail-page', accessToken, body);
}
