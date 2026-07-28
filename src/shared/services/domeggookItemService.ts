//////////////////////////////////////// 도매꾹 상품 서비스 ////////////////////////////////////////
// 서버 프록시(/api/domeggook-item, /api/domeggook-image) 호출 전담.

import type { DomeggookItem, DomeggookItemImage } from '@/shared/types/domeggook';

////////// 조회 실패 에러 — HTTP 상태를 실어 호출부가 이탈 사유를 분해할 수 있게 한다 (GA4 lookup reason)
// Error를 상속하므로 기존 `error instanceof Error ? error.message` 처리 경로는 그대로 동작한다.
export class DomeggookItemError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'DomeggookItemError';
    this.status = status;
  }
}

////////// 상품 정보 조회
export async function fetchDomeggookItem(productNo: string): Promise<DomeggookItem> {
  let response: Response;
  try {
    response = await fetch(`/api/domeggook-item?no=${productNo}`);
  } catch {
    // 네트워크 단절 등 — 응답 자체가 없는 경우 (status 0으로 구분)
    throw new DomeggookItemError('네트워크 연결을 확인해주세요.', 0);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new DomeggookItemError(body?.error ?? '도매꾹 상품 정보를 불러오지 못했어요.', response.status);
  }
  return body as DomeggookItem;
}

////////// 선택 이미지들을 파일(Blob)로 다운로드 — 파이프라인 핸드오프용
export async function downloadDomeggookImages(
  images: DomeggookItemImage[],
  productNo: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ name: string; blob: Blob }[]> {
  const files: { name: string; blob: Blob }[] = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const response = await fetch(image.proxyUrl);
    if (!response.ok) {
      throw new Error(`이미지 ${index + 1}번을 불러오지 못했어요.`);
    }
    const blob = await response.blob();

    // 파일명: 원본 URL 마지막 조각 (없거나 이상하면 순번 기반)
    const urlName = image.url.split('/').pop()?.split('?')[0] ?? '';
    const hasExtension = /\.(jpe?g|png|gif|webp|bmp)$/i.test(urlName);
    const fallbackExtension = blob.type.startsWith('image/') ? blob.type.split('/')[1] : 'jpg';
    const name = hasExtension ? urlName : `domeggook-${productNo}-${index + 1}.${fallbackExtension}`;

    files.push({ name, blob });
    onProgress?.(index + 1, images.length);
  }

  return files;
}
