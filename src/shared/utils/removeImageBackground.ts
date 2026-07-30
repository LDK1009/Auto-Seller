//////////////////////////////////////// 배경 제거 유틸 ////////////////////////////////////////
// transformers.js + ormbg(Apache-2.0) ONNX 모델을 동적 import로 감싸 File을 투명 PNG Blob으로 변환한다.
// 동적 import 이유: 라이브러리가 브라우저 전용(WebGPU/WASM)이라 SSR 평가를 피하고 초기 번들에서 제외.
// 2026-07-29 교체: @imgly/background-removal(AGPL-3.0) → ormbg(Apache-2.0) — 상용 배포 라이선스 정리.

import {
  SEGMENTATION_MODEL_ID,
  MODEL_DTYPE,
  STEP_PROGRESS,
  DOWNLOAD_STEP_LABEL,
} from '@/shared/constants/backgroundRemoval';

//////////////////// 진행 정보 ////////////////////
// phase: 'download' = 모델 다운로드(바 indeterminate), 'compute' = 누끼 연산(바 채움)
// ratio: 목표 진행률 0~1 (compute만 유효), durationMs: 그 목표까지 애니메이션 시간
export type ProgressInfo = {
  step: string;
  phase: 'download' | 'compute';
  ratio: number;
  durationMs: number;
};
type ProgressHandler = (info: ProgressInfo) => void;

// 세그멘테이션 파이프라인 (모델 로드는 최초 1회 — 이후 재사용)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- transformers.js 파이프라인 타입은 동적 import 시점에만 확정
let segmenterPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSegmenter(onProgress?: ProgressHandler): Promise<any> {
  if (segmenterPromise) return segmenterPromise;

  segmenterPromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    // 로컬 모델 탐색 비활성화 — Hub에서만 받는다 (Next 정적 경로 오탐 방지)
    env.allowLocalModels = false;

    // 다운로드는 파일이 여러 개라 개별 %가 리셋됨 → 전체 바이트로 누적 집계
    const downloadBytes = new Map<string, { loaded: number; total: number }>();

    return pipeline('background-removal', SEGMENTATION_MODEL_ID, {
      dtype: MODEL_DTYPE,
      device: typeof navigator !== 'undefined' && 'gpu' in navigator ? 'webgpu' : 'wasm',
      progress_callback: (event: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (!onProgress || event.status !== 'progress' || !event.file) return;
        downloadBytes.set(event.file, { loaded: event.loaded ?? 0, total: event.total ?? 0 });
        let loaded = 0;
        let size = 0;
        for (const entry of downloadBytes.values()) {
          loaded += entry.loaded;
          size += entry.total;
        }
        onProgress({
          step: DOWNLOAD_STEP_LABEL,
          phase: 'download',
          ratio: size > 0 ? loaded / size : 0,
          durationMs: 0,
        });
      },
    });
  })();

  try {
    return await segmenterPromise;
  } catch (error) {
    segmenterPromise = null; // 실패 시 다음 시도에서 재로드
    console.error('배경 제거 모델 로드 실패:', error);
    throw new Error('배경 제거 준비에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.');
  }
}

export async function removeImageBackground(file: File, onProgress?: ProgressHandler): Promise<Blob> {
  ////////// 1) 모델 준비 (최초 1회 다운로드)
  const segmenter = await getSegmenter(onProgress);

  ////////// 2) 이미지 해독
  const imageUrl = URL.createObjectURL(file);
  try {
    onProgress?.({
      step: STEP_PROGRESS.decode.label,
      phase: 'compute',
      ratio: STEP_PROGRESS.decode.end,
      durationMs: STEP_PROGRESS.decode.estMs,
    });

    ////////// 3) 배경 제거 추론 (모델이 알파 적용된 RawImage를 반환)
    onProgress?.({
      step: STEP_PROGRESS.inference.label,
      phase: 'compute',
      ratio: STEP_PROGRESS.inference.end,
      durationMs: STEP_PROGRESS.inference.estMs,
    });
    const output = await segmenter(imageUrl);
    const rawImage = Array.isArray(output) ? output[0] : output;

    ////////// 4) PNG Blob으로 인코딩 (투명도 유지)
    onProgress?.({
      step: STEP_PROGRESS.compose.label,
      phase: 'compute',
      ratio: STEP_PROGRESS.compose.end,
      durationMs: STEP_PROGRESS.compose.estMs,
    });
    return await rawImageToPngBlob(rawImage);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

//////////////////// RawImage → PNG Blob ////////////////////
// transformers.js RawImage는 toBlob을 제공하지만 환경별 편차가 있어 캔버스 경유로 통일한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rawImageToPngBlob(rawImage: any): Promise<Blob> {
  if (typeof rawImage?.toBlob === 'function') {
    const blob = await rawImage.toBlob('image/png');
    if (blob instanceof Blob) return blob;
  }

  const canvas = rawImage.toCanvas() as HTMLCanvasElement | OffscreenCanvas;
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: 'image/png' });
  }
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('배경 제거 결과를 저장하지 못했어요.'));
    }, 'image/png');
  });
}
