//////////////////////////////////////// 상세 통이미지 조립 ////////////////////////////////////////
// 상세 이미지 여러 장을 세로로 병합해 스마트에디터에 "1장만 업로드"하면 되게 만든다.
// - 폭 정규화: 상세페이지 관행 폭(860px)과 원본 최대 폭 중 작은 값으로 통일
// - 캔버스 한 변 한계(크롬 ~32,767px) 대비: 20,000px 초과 시 자동으로 여러 파트로 분할

const TARGET_MAX_WIDTH = 860; // 스마트스토어 상세 관행 폭
const MAX_PART_HEIGHT = 20_000; // 파트당 최대 높이 (캔버스 한계 여유분)
const OUTPUT_QUALITY = 0.85;

type ScaledImage = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
};

export async function mergeImagesVertically(blobs: Blob[]): Promise<Blob[]> {
  if (blobs.length === 0) return [];

  const bitmaps = await Promise.all(blobs.map((blob) => createImageBitmap(blob)));

  try {
    // 폭 정규화 (비율 유지 스케일)
    const targetWidth = Math.min(TARGET_MAX_WIDTH, Math.max(...bitmaps.map((bitmap) => bitmap.width)));
    const scaledImages: ScaledImage[] = bitmaps.map((bitmap) => ({
      bitmap,
      width: targetWidth,
      height: Math.max(1, Math.round((bitmap.height * targetWidth) / bitmap.width)),
    }));

    // 높이 한계 기준으로 파트 그룹핑 (이미지 중간은 자르지 않음)
    const groups: ScaledImage[][] = [];
    let currentGroup: ScaledImage[] = [];
    let currentHeight = 0;
    for (const image of scaledImages) {
      if (currentHeight + image.height > MAX_PART_HEIGHT && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        currentHeight = 0;
      }
      currentGroup.push(image);
      currentHeight += image.height;
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    // 그룹별 캔버스 병합 → JPG
    const parts: Blob[] = [];
    for (const group of groups) {
      const totalHeight = group.reduce((sum, image) => sum + image.height, 0);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = totalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('캔버스 컨텍스트를 만들지 못했습니다.');

      context.fillStyle = '#FFFFFF'; // JPG 배경 (투명 불가)
      context.fillRect(0, 0, canvas.width, canvas.height);

      let offsetY = 0;
      for (const image of group) {
        context.drawImage(image.bitmap, 0, offsetY, image.width, image.height);
        offsetY += image.height;
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('통이미지 생성에 실패했습니다.'))),
          'image/jpeg',
          OUTPUT_QUALITY,
        );
      });
      parts.push(blob);
    }

    return parts;
  } finally {
    bitmaps.forEach((bitmap) => bitmap.close());
  }
}
