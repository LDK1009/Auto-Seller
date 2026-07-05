//////////////////////////////////////// 이미지 규격 변환 유틸 ////////////////////////////////////////
// canvas로 목표 크기에 맞춰 리사이즈한다.
// contain: 비율 유지 + 남는 영역을 배경색으로 채움 / cover: 비율 유지 + 넘치는 부분 중앙 크롭.

import type { ResizeSettings } from '../_constants/imageResize';

export async function resizeImage(source: Blob, settings: ResizeSettings): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement('canvas');
  canvas.width = settings.width;
  canvas.height = settings.height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.');
  }

  //////////////////// 배경 채움 ////////////////////
  // JPG는 투명 미지원이라 항상 채움. contain 여백도 배경색으로 채움.
  const needsBackground = settings.fit === 'contain' || settings.format === 'image/jpeg';
  if (needsBackground) {
    context.fillStyle = settings.backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  //////////////////// 스케일 계산 (비율 유지) ////////////////////
  const scaleRatio =
    settings.fit === 'contain'
      ? Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height)
      : Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);

  const drawWidth = bitmap.width * scaleRatio;
  const drawHeight = bitmap.height * scaleRatio;
  const offsetX = (canvas.width - drawWidth) / 2;
  const offsetY = (canvas.height - drawHeight) / 2;

  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
  bitmap.close();

  //////////////////// Blob 추출 ////////////////////
  const resultBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, settings.format, settings.quality);
  });

  if (!resultBlob) {
    throw new Error('규격 변환 결과를 생성하지 못했습니다.');
  }
  return resultBlob;
}

////////// 원본 해상도 측정
export async function measureImageSize(source: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(source);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}
