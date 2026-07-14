//////////////////////////////////////// 워터마크 합성 유틸 ////////////////////////////////////////
// 원본 위에 텍스트/로고 워터마크를 지정 위치·투명도·크기로 canvas 합성한다.
// 출력 포맷은 원본 포맷을 유지한다 (jpg/png/webp 외에는 png).

import {
  POSITION_ALIGN,
  WATERMARK_MARGIN_RATIO,
  type WatermarkSettings,
} from '@/shared/constants/watermark';

const KEEPABLE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const OUTPUT_QUALITY = 0.92;

////////// 정렬 기준 좌표 계산
function resolvePosition(
  canvasWidth: number,
  canvasHeight: number,
  markWidth: number,
  markHeight: number,
  settings: WatermarkSettings,
): { x: number; y: number } {
  const margin = Math.min(canvasWidth, canvasHeight) * WATERMARK_MARGIN_RATIO;
  const align = POSITION_ALIGN[settings.position];

  const x =
    align.horizontal === 'left'
      ? margin
      : align.horizontal === 'right'
        ? canvasWidth - margin - markWidth
        : (canvasWidth - markWidth) / 2;

  const y =
    align.vertical === 'top'
      ? margin
      : align.vertical === 'bottom'
        ? canvasHeight - margin - markHeight
        : (canvasHeight - markHeight) / 2;

  return { x, y };
}

export async function applyWatermark(source: Blob, settings: WatermarkSettings): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.');
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const shorterSide = Math.min(canvas.width, canvas.height);
  context.globalAlpha = settings.opacity;

  //////////////////// 텍스트 워터마크 ////////////////////
  if (settings.type === 'text') {
    const fontSize = Math.max(12, Math.round(shorterSide * settings.scale * 0.5));
    context.font = `700 ${fontSize}px Pretendard, sans-serif`;
    context.textBaseline = 'top';
    context.fillStyle = settings.textColor;

    const textWidth = context.measureText(settings.text).width;
    const { x, y } = resolvePosition(canvas.width, canvas.height, textWidth, fontSize, settings);
    context.fillText(settings.text, x, y);
  }

  //////////////////// 로고 워터마크 ////////////////////
  if (settings.type === 'logo') {
    if (!settings.logoBlob) {
      throw new Error('로고 이미지를 먼저 업로드하세요.');
    }
    const logo = await createImageBitmap(settings.logoBlob);
    const logoWidth = shorterSide * settings.scale;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    const { x, y } = resolvePosition(canvas.width, canvas.height, logoWidth, logoHeight, settings);
    context.drawImage(logo, x, y, logoWidth, logoHeight);
    logo.close();
  }

  context.globalAlpha = 1;

  //////////////////// Blob 추출 (원본 포맷 유지) ////////////////////
  const outputFormat = KEEPABLE_FORMATS.includes(source.type) ? source.type : 'image/png';
  const resultBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputFormat, OUTPUT_QUALITY);
  });

  if (!resultBlob) {
    throw new Error('워터마크 합성 결과를 생성하지 못했습니다.');
  }
  return resultBlob;
}

////////// 출력 파일 확장자 (원본 포맷 기준)
export function getWatermarkExtension(source: Blob): string {
  switch (source.type) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'png';
  }
}
