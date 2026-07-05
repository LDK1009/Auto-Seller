'use client';

//////////////////////////////////////// 워터마크 상태 스토어 ////////////////////////////////////////
// 이 라우트 전용 상태와 순수 변경 액션만 담는다 (State 레이어).

import { create } from 'zustand';
import { DEFAULT_WATERMARK_SETTINGS, type WatermarkSettings } from '../_constants/watermark';

//////////////////// 타입 ////////////////////
export type WatermarkStatus = 'pending' | 'done' | 'error';

export type WatermarkJob = {
  id: string;
  file: File;
  originalUrl: string;
  status: WatermarkStatus;
  resultBlob: Blob | null;
  resultUrl: string | null;
  error: string | null;
};

//////////////////// 스토어 ////////////////////
type WatermarkState = {
  jobs: WatermarkJob[];
  settings: WatermarkSettings;
  isProcessing: boolean;
  isZipping: boolean;
  processedCount: number;

  addJobs: (jobs: WatermarkJob[]) => void;
  patchJob: (id: string, patch: Partial<WatermarkJob>) => void;
  removeJob: (id: string) => void;
  clearJobs: () => void;
  updateSettings: (patch: Partial<WatermarkSettings>) => void;
  setIsProcessing: (value: boolean) => void;
  setIsZipping: (value: boolean) => void;
  setProcessedCount: (value: number) => void;
};

export const useWatermarkStore = create<WatermarkState>((set) => ({
  jobs: [],
  settings: DEFAULT_WATERMARK_SETTINGS,
  isProcessing: false,
  isZipping: false,
  processedCount: 0,

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
