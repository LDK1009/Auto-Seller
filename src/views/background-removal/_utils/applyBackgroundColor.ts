//////////////////////////////////////// 배경색 합성 유틸 ////////////////////////////////////////
// 투명 PNG Blob을 canvas에 그린 뒤 지정 배경색을 깔아 합성한다.
// 배경 옵션이 'transparent'면 원본 투명 Blob을 그대로 반환한다.

import { OUTPUT_FORMAT, type BackgroundOption } from '../_constants/backgroundRemoval';

export async function applyBackgroundColor(
  transparentBlob: Blob,
  option: BackgroundOption,
): Promise<Blob> {
  //////////////////// 투명 옵션: 합성 불필요 ////////////////////
  if (option.kind === 'transparent') {
    return transparentBlob;
  }

  //////////////////// 이미지 디코드 ////////////////////
  const bitmap = await createImageBitmap(transparentBlob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.');
  }

  //////////////////// 배경색 → 전경 순서로 합성 ////////////////////
  context.fillStyle = option.hex;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  //////////////////// Blob 추출 ////////////////////
  const composedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_FORMAT);
  });

  if (!composedBlob) {
    throw new Error('배경색 합성 결과를 생성하지 못했습니다.');
  }

  return composedBlob;
}
