//////////////////////////////////////// 이미지 세로 분할 유틸 ////////////////////////////////////////
// 긴 상세페이지 이미지를 지정 높이 단위로 잘라 여러 Blob으로 만든다.
// 출력: 기본 JPG 압축(용량 절감 — 상세 이미지는 투명도가 불필요) / 옵션으로 원본 포맷 유지.

const KEEPABLE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const ORIGINAL_QUALITY = 0.92;
export const JPG_QUALITY = 0.85; // JPG 압축 기본 품질 (P-5)

export type SplitOutputMode = 'jpg' | 'original';

export async function splitImage(
  source: Blob,
  pieceHeight: number,
  outputMode: SplitOutputMode = 'jpg',
): Promise<Blob[]> {
  const bitmap = await createImageBitmap(source);
  const pieceCount = Math.max(1, Math.ceil(bitmap.height / pieceHeight));

  const useJpg = outputMode === 'jpg';
  const outputFormat = useJpg
    ? 'image/jpeg'
    : KEEPABLE_FORMATS.includes(source.type)
      ? source.type
      : 'image/png';
  const outputQuality = useJpg ? JPG_QUALITY : ORIGINAL_QUALITY;

  const pieces: Blob[] = [];
  for (let index = 0; index < pieceCount; index += 1) {
    const sourceY = index * pieceHeight;
    const currentHeight = Math.min(pieceHeight, bitmap.height - sourceY);

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = currentHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      throw new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.');
    }
    if (useJpg) {
      // JPG는 투명도가 없으므로 흰 배경 선깔기 (PNG 투명 원본 대비)
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(bitmap, 0, sourceY, bitmap.width, currentHeight, 0, 0, bitmap.width, currentHeight);

    const pieceBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputFormat, outputQuality);
    });
    if (!pieceBlob) {
      bitmap.close();
      throw new Error('분할 조각 생성에 실패했습니다.');
    }
    pieces.push(pieceBlob);
  }

  bitmap.close();
  return pieces;
}

////////// 출력 확장자
export function getSplitExtension(source: Blob, outputMode: SplitOutputMode = 'jpg'): string {
  if (outputMode === 'jpg') return 'jpg';
  switch (source.type) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'png';
  }
}
