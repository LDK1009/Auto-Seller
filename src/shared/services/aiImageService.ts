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

////////// 참조 이미지 축소 (긴 변 1024px·JPEG) → base64
// 도매꾹 원본은 2-4MB가 흔하다. base64는 여기서 1.33배로 더 불어나 요청 본문이 수 MB가 되고,
// 모델은 어차피 축소해서 읽는다 → 보내기 전에 줄여 전송 실패·지연을 없앤다.
const REFERENCE_MAX_SIDE = 1024;
const REFERENCE_QUALITY = 0.9;

export async function blobToReferencePayload(blob: Blob): Promise<GeneratedImagePayload> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, REFERENCE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && blob.size <= 1_000_000) {
    bitmap.close();
    return blobToBase64(blob); // 이미 작으면 그대로 (재인코딩 손실 없음)
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return blobToBase64(blob);
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const resized = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', REFERENCE_QUALITY),
  );
  return blobToBase64(resized ?? blob);
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

// 서버가 응답을 안 주면 스피너가 영원히 돈다 — 라우트 상한(maxDuration 120s)보다 조금 길게 잡고 끊는다
const REQUEST_TIMEOUT_MS = 130_000;

async function postJson(path: string, accessToken: string, body: unknown) {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(error);
    // 크레딧은 서버가 선차감 후 실패 시 환불한다 — 여기서 "차감 안 됐다"고 단정하면 거짓말이 될 수 있다
    throw new Error('시간이 너무 오래 걸려서 중단했어요. 잠시 후 다시 시도해주세요.');
  }
  const parsed = await response.json().catch(() => null);
  if (!response.ok) {
    // 서버가 바디 없이 끊긴 경우(타임아웃·용량 초과)에도 원인을 알 수 있게 상태코드를 남긴다
    const fallback =
      response.status === 413
        ? '이미지가 너무 커요. 다른 이미지로 시도해주세요.'
        : `이미지 생성에 실패했어요. (오류 ${response.status})`;
    const error = new Error(parsed?.error ?? fallback) as AiGenerateError;
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
