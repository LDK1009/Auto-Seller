'use client';

//////////////////////////////////////// 규정 검사 상태 스토어 ////////////////////////////////////////
// 이 라우트 전용 상태와 순수 변경 액션만 담는다 (State 레이어).

import { create } from 'zustand';
import type { CheckItem, CheckStatus } from '../_constants/imageCheck';

//////////////////// 타입 ////////////////////
export type CheckJob = {
  id: string;
  file: File;
  originalUrl: string;
  width: number | null;
  height: number | null;
  checks: CheckItem[]; // 측정 완료 후 채워짐
  overall: CheckStatus | null; // null = 검사 중
};

//////////////////// 스토어 ////////////////////
type ImageCheckState = {
  jobs: CheckJob[];
  addJobs: (jobs: CheckJob[]) => void;
  patchJob: (id: string, patch: Partial<CheckJob>) => void;
  removeJob: (id: string) => void;
  clearJobs: () => void;
};

export const useImageCheckStore = create<ImageCheckState>((set) => ({
  jobs: [],
  addJobs: (newJobs) => set((state) => ({ jobs: [...state.jobs, ...newJobs] })),
  patchJob: (id, patch) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    })),
  removeJob: (id) => set((state) => ({ jobs: state.jobs.filter((job) => job.id !== id) })),
  clearJobs: () => set({ jobs: [] }),
}));
