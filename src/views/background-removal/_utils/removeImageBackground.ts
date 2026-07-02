//////////////////////////////////////// 배경 제거 유틸 ////////////////////////////////////////
// @imgly/background-removal을 동적 import로 감싸 File을 투명 PNG Blob으로 변환한다.
// 동적 import 이유: 라이브러리가 브라우저 전용(WASM)이라 SSR 평가를 피하고 초기 번들에서 제외.

import { REMOVE_BG_CONFIG } from '../_constants/backgroundRemoval';

type ProgressHandler = (ratio: number) => void; // 0~1

export async function removeImageBackground(
  file: File,
  onProgress?: ProgressHandler,
): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal');

  const blob = await removeBackground(file, {
    ...REMOVE_BG_CONFIG,
    progress: (_key, current, total) => {
      if (onProgress && total > 0) {
        onProgress(current / total);
      }
    },
  });

  return blob;
}
