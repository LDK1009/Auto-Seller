//////////////////////////////////////// 배경 합성 유틸 ////////////////////////////////////////
// 투명 PNG Blob 위에 배경(단색 또는 이미지)을 깔아 canvas로 합성한다.
// 배경 옵션이 'transparent'면 원본 투명 Blob을 그대로 반환한다.
// 'image'는 호출자(훅)가 fetch한 배경 Blob을 함께 넘긴다 (여러 장 재사용 위해 fetch 분리).

import { OUTPUT_FORMAT, type BackgroundOption, type PatternKind } from '../_constants/backgroundRemoval';

//////////////////// 패턴 배경 그리기 ////////////////////
// 선택 색상 + 흰색 2톤. 줄무늬·체크 단위는 이미지 크기에 비례(고해상도에서도 비율 유지).
const PATTERN_SECONDARY_COLOR = '#FFFFFF';

function drawPatternBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  hex: string,
  pattern: PatternKind,
): void {
  const shorterSide = Math.min(width, height);

  switch (pattern) {
    case 'gradient': {
      // 위: 선택 색 → 아래: 흰색
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, hex);
      gradient.addColorStop(1, PATTERN_SECONDARY_COLOR);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      break;
    }
    case 'stripes-vertical': {
      const unit = Math.max(8, Math.round(shorterSide / 24));
      context.fillStyle = PATTERN_SECONDARY_COLOR;
      context.fillRect(0, 0, width, height);
      context.fillStyle = hex;
      for (let x = 0; x < width; x += unit * 2) {
        context.fillRect(x, 0, unit, height);
      }
      break;
    }
    case 'stripes-horizontal': {
      const unit = Math.max(8, Math.round(shorterSide / 24));
      context.fillStyle = PATTERN_SECONDARY_COLOR;
      context.fillRect(0, 0, width, height);
      context.fillStyle = hex;
      for (let y = 0; y < height; y += unit * 2) {
        context.fillRect(0, y, width, unit);
      }
      break;
    }
    case 'check': {
      const unit = Math.max(12, Math.round(shorterSide / 12));
      context.fillStyle = PATTERN_SECONDARY_COLOR;
      context.fillRect(0, 0, width, height);
      context.fillStyle = hex;
      for (let row = 0; row * unit < height; row += 1) {
        for (let column = 0; column * unit < width; column += 1) {
          if ((row + column) % 2 === 0) {
            context.fillRect(column * unit, row * unit, unit, unit);
          }
        }
      }
      break;
    }
    case 'solid':
    default:
      context.fillStyle = hex;
      context.fillRect(0, 0, width, height);
  }
}

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
    drawPatternBackground(context, canvas.width, canvas.height, option.hex, option.pattern ?? 'solid');
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
