//////////////////////////////////////// 배경 제거 유틸 ////////////////////////////////////////
// @imgly/background-removal을 동적 import로 감싸 File을 투명 PNG Blob으로 변환한다.
// 동적 import 이유: 라이브러리가 브라우저 전용(WASM)이라 SSR 평가를 피하고 초기 번들에서 제외.

import {
  REMOVE_BG_CONFIG,
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

export async function removeImageBackground(
  file: File,
  onProgress?: ProgressHandler,
): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal');

  // 다운로드는 자산(모델·WASM)이 여러 개라 개별 %가 리셋됨 → 전체 바이트로 누적 집계
  const downloadBytes = new Map<string, { current: number; total: number }>();

  const blob = await removeBackground(file, {
    ...REMOVE_BG_CONFIG,
    progress: (key, current, total) => {
      if (!onProgress) return;

      //////////////////// 다운로드 구간 (누적 집계 비율) ////////////////////
      if (key.startsWith('fetch:')) {
        downloadBytes.set(key, { current, total });
        let loaded = 0;
        let size = 0;
        for (const entry of downloadBytes.values()) {
          loaded += entry.current;
          size += entry.total;
        }
        onProgress({
          step: DOWNLOAD_STEP_LABEL,
          phase: 'download',
          ratio: size > 0 ? loaded / size : 0,
          durationMs: 0,
        });
        return;
      }

      //////////////////// 연산 4단계 (가중치 목표치로 진행) ////////////////////
      const stepConfig = STEP_PROGRESS[key];
      if (!stepConfig) {
        onProgress({ step: '처리 중', phase: 'compute', ratio: total > 0 ? current / total : 0, durationMs: 400 });
        return;
      }
      // 단계 시작 이벤트 → 해당 단계 끝까지 estMs 동안 채움. 완료(current===total)면 즉시 도달.
      const isStepDone = current >= total;
      onProgress({
        step: stepConfig.label,
        phase: 'compute',
        ratio: stepConfig.end,
        durationMs: isStepDone ? 200 : stepConfig.estMs,
      });
    },
  });

  return blob;
}
