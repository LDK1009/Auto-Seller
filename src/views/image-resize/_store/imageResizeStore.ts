'use client';

//////////////////////////////////////// 규격 변환 상태 스토어 ////////////////////////////////////////
// 이 라우트 전용 상태와 순수 변경 액션만 담는다 (State 레이어 — 비즈니스 로직 금지).
// 변환 루프·ZIP·검증 등 조율은 _hooks/useImageResize가 담당.

import { create } from 'zustand';
import { DEFAULT_RESIZE_SETTINGS, type ResizeSettings } from '../_constants/imageResize';

//////////////////// 타입 ////////////////////
export type ResizeStatus = 'pending' | 'done' | 'error';

export type ResizeJob = {
  id: string;
  file: File;
  originalUrl: string; // 원본 미리보기 objectURL
  originalWidth: number | null; // 원본 해상도 (측정 후 기록)
  originalHeight: number | null;
  status: ResizeStatus;
  resultBlob: Blob | null;
  resultUrl: string | null;
  error: string | null;
};

//////////////////// 스토어 ////////////////////
type ImageResizeState = {
  // 상태
  jobs: ResizeJob[];
  settings: ResizeSettings;
  isProcessing: boolean;
  isZipping: boolean;
  processedCount: number; // 이번 변환에서 처리 완료된 수 (전체 진행률용)

  // 액션 (순수 상태 변경만)
  addJobs: (jobs: ResizeJob[]) => void;
  patchJob: (id: string, patch: Partial<ResizeJob>) => void;
  removeJob: (id: string) => void;
  clearJobs: () => void;
  updateSettings: (patch: Partial<ResizeSettings>) => void;
  setIsProcessing: (value: boolean) => void;
  setIsZipping: (value: boolean) => void;
  setProcessedCount: (value: number) => void;
};

export const useImageResizeStore = create<ImageResizeState>((set) => ({
  //////////////////// 초기 상태 ////////////////////
  jobs: [],
  settings: DEFAULT_RESIZE_SETTINGS,
  isProcessing: false,
  isZipping: false,
  processedCount: 0,

  //////////////////// 액션 ////////////////////
  addJobs: (newJobs) => set((state) => ({ jobs: [...state.jobs, ...newJobs] })),

  patchJob: (id, patch) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    })),

  removeJob: (id) => set((state) => ({ jobs: state.jobs.filter((job) => job.id !== id) })),

  clearJobs: () => set({ jobs: [] }),

  updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

  setIsProcessing: (value) => set({ isProcessing: value }),
  setIsZipping: (value) => set({ isZipping: value }),
  setProcessedCount: (value) => set({ processedCount: value }),
}));
