//////////////////////////////////////// 배경 합성 유틸 ////////////////////////////////////////
// 투명 PNG Blob 위에 배경(단색 또는 이미지)을 깔아 canvas로 합성한다.
// 배경 옵션이 'transparent'면 원본 투명 Blob을 그대로 반환한다.
// 'image'는 호출자(훅)가 fetch한 배경 Blob을 함께 넘긴다 (여러 장 재사용 위해 fetch 분리).

import { OUTPUT_FORMAT, type BackgroundOption } from '../_constants/backgroundRemoval';

export async function applyBackground(
  transparentBlob: Blob,
  option: BackgroundOption,
  backgroundImageBlob?: Blob | null,
): Promise<Blob> {
  //////////////////// 투명 옵션: 합성 불필요 ////////////////////
  if (option.kind === 'transparent') {
    return transparentBlob;
  }

  //////////////////// 전경 디코드 ////////////////////
  const foreground = await createImageBitmap(transparentBlob);
  const canvas = document.createElement('canvas');
  canvas.width = foreground.width;
  canvas.height = foreground.height;

  const context = canvas.getContext('2d');
  if (!context) {
    foreground.close();
    throw new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.');
  }

  //////////////////// 배경 그리기 ////////////////////
  if (option.kind === 'color') {
    context.fillStyle = option.hex;
    context.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    // 이미지 배경: cover-fit(비율 유지, 짧은 변 기준 확대, 중앙 크롭)
    if (!backgroundImageBlob) {
      foreground.close();
      throw new Error('배경 이미지 데이터가 없습니다.');
    }
    const background = await createImageBitmap(backgroundImageBlob);
    const scale = Math.max(canvas.width / background.width, canvas.height / background.height);
    const drawWidth = background.width * scale;
    const drawHeight = background.height * scale;
    const offsetX = (canvas.width - drawWidth) / 2;
    const offsetY = (canvas.height - drawHeight) / 2;
    context.drawImage(background, offsetX, offsetY, drawWidth, drawHeight);
    background.close();
  }

  //////////////////// 전경 겹치기 → Blob 추출 ////////////////////
  context.drawImage(foreground, 0, 0);
  foreground.close();

  const composedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_FORMAT);
  });

  if (!composedBlob) {
    throw new Error('배경 합성 결과를 생성하지 못했습니다.');
  }

  return composedBlob;
}
