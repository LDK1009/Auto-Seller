//////////////////////////////////////// 도매매 상품 서비스 ////////////////////////////////////////
// 서버 프록시(/api/domeme-item, /api/domeme-image) 호출 전담.

import type { DomemeItem, DomemeItemImage } from '@/shared/types/domeme';

////////// 상품 정보 조회
export async function fetchDomemeItem(productNo: string): Promise<DomemeItem> {
  const response = await fetch(`/api/domeme-item?no=${productNo}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? '도매매 상품 정보를 불러오지 못했습니다.');
  }
  return body as DomemeItem;
}

////////// 선택 이미지들을 파일(Blob)로 다운로드 — 파이프라인 핸드오프용
export async function downloadDomemeImages(
  images: DomemeItemImage[],
  productNo: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ name: string; blob: Blob }[]> {
  const files: { name: string; blob: Blob }[] = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const response = await fetch(image.proxyUrl);
    if (!response.ok) {
      throw new Error(`이미지 ${index + 1}번을 불러오지 못했습니다.`);
    }
    const blob = await response.blob();

    // 파일명: 원본 URL 마지막 조각 (없거나 이상하면 순번 기반)
    const urlName = image.url.split('/').pop()?.split('?')[0] ?? '';
    const hasExtension = /\.(jpe?g|png|gif|webp|bmp)$/i.test(urlName);
    const fallbackExtension = blob.type.startsWith('image/') ? blob.type.split('/')[1] : 'jpg';
    const name = hasExtension ? urlName : `domeme-${productNo}-${index + 1}.${fallbackExtension}`;

    files.push({ name, blob });
    onProgress?.(index + 1, images.length);
  }

  return files;
}
