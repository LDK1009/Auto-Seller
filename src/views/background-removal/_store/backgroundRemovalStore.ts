'use client';

//////////////////////////////////////// 누끼 상태 스토어 ////////////////////////////////////////
// 이 라우트 전용 상태와 순수 변경 액션만 담는다 (State 레이어 — 비즈니스 로직 금지).
// 처리 루프·ZIP·검증 등 조율 로직은 _hooks/useBackgroundRemoval에 있다.
// persist 미사용: File/Blob은 직렬화 불가 + 세션 휘발 상태가 맞음.

import { create } from 'zustand';
import { DEFAULT_CUSTOM_COLOR, type BackgroundOption } from '../_constants/backgroundRemoval';

//////////////////// 타입 ////////////////////
export type ProcessStatus = 'pending' | 'processing' | 'done' | 'error';

export type ImageJob = {
  id: string;
  file: File;
  originalUrl: string; // 원본 미리보기 objectURL
  status: ProcessStatus;
  progress: number; // 0~1 목표 진행률 (processing 중)
  progressMs: number; // 위 목표까지 바 애니메이션 시간(ms)
  step: string; // 현재 단계 라벨(배경 분석 …), processing 중에만 유효
  transparentBlob: Blob | null; // 누끼(투명) 결과 — 재합성 재료
  resultBlob: Blob | null; // 배경옵션 적용 최종 결과
  resultUrl: string | null; // 최종 결과 objectURL
  error: string | null;
};

//////////////////// 스토어 ////////////////////
type BackgroundRemovalState = {
  // 상태
  jobs: ImageJob[];
  isProcessing: boolean;
  isCancelling: boolean; // 취소 요청 후 현재 이미지 마무리 대기
  isModelLoading: boolean; // 모델 다운로드(최초 1회) — 전체 바에 표시
  modelProgress: number; // 모델 다운로드 비율 0~1
  isZipping: boolean;
  backgroundOption: BackgroundOption;
  customColor: string;

  // 액션 (순수 상태 변경만)
  addJobs: (jobs: ImageJob[]) => void;
  patchJob: (id: string, patch: Partial<ImageJob>) => void;
  removeJob: (id: string) => void;
  clearJobs: () => void;
  setIsProcessing: (value: boolean) => void;
  setIsCancelling: (value: boolean) => void;
  setIsModelLoading: (value: boolean) => void;
  setModelProgress: (value: number) => void;
  setIsZipping: (value: boolean) => void;
  setBackgroundOption: (option: BackgroundOption) => void;
  setCustomColor: (hex: string) => void;
};

export const useBackgroundRemovalStore = create<BackgroundRemovalState>((set) => ({
  //////////////////// 초기 상태 ////////////////////
  jobs: [],
  isProcessing: false,
  isCancelling: false,
  isModelLoading: false,
  modelProgress: 0,
  isZipping: false,
  backgroundOption: { kind: 'transparent' },
  customColor: DEFAULT_CUSTOM_COLOR,

  //////////////////// 액션 ////////////////////
  addJobs: (newJobs) => set((state) => ({ jobs: [...state.jobs, ...newJobs] })),

  patchJob: (id, patch) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    })),

  removeJob: (id) => set((state) => ({ jobs: state.jobs.filter((job) => job.id !== id) })),

  clearJobs: () => set({ jobs: [] }),

  setIsProcessing: (value) => set({ isProcessing: value }),
  setIsCancelling: (value) => set({ isCancelling: value }),
  setIsModelLoading: (value) => set({ isModelLoading: value }),
  setModelProgress: (value) => set({ modelProgress: value }),
  setIsZipping: (value) => set({ isZipping: value }),
  setBackgroundOption: (option) => set({ backgroundOption: option }),
  setCustomColor: (hex) => set({ customColor: hex }),
}));
