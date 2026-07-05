//////////////////////////////////////// 이미지 세로 분할 유틸 ////////////////////////////////////////
// 긴 상세페이지 이미지를 지정 높이 단위로 잘라 여러 Blob으로 만든다.
// 출력 포맷은 원본 포맷 유지 (jpg/png/webp 외에는 png).

const KEEPABLE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const OUTPUT_QUALITY = 0.92;

export async function splitImage(source: Blob, pieceHeight: number): Promise<Blob[]> {
  const bitmap = await createImageBitmap(source);
  const pieceCount = Math.max(1, Math.ceil(bitmap.height / pieceHeight));
  const outputFormat = KEEPABLE_FORMATS.includes(source.type) ? source.type : 'image/png';

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
    context.drawImage(bitmap, 0, sourceY, bitmap.width, currentHeight, 0, 0, bitmap.width, currentHeight);

    const pieceBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputFormat, OUTPUT_QUALITY);
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

////////// 출력 확장자 (원본 포맷 기준)
export function getSplitExtension(source: Blob): string {
  switch (source.type) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'png';
  }
}
