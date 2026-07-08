'use client';

//////////////////////////////////////// 이미지 분할 상태 스토어 ////////////////////////////////////////
// 이 라우트 전용 상태와 순수 변경 액션만 담는다 (State 레이어).

import { create } from 'zustand';
import { DEFAULT_PIECE_HEIGHT } from '../_constants/imageSplit';
import type { SplitOutputMode } from '../_utils/splitImage';

//////////////////// 타입 ////////////////////
export type SplitStatus = 'pending' | 'done' | 'error';

export type SplitJob = {
  id: string;
  file: File;
  originalUrl: string;
  width: number | null;
  height: number | null;
  status: SplitStatus;
  pieceBlobs: Blob[]; // 분할 결과 조각들
  error: string | null;
};

//////////////////// 스토어 ////////////////////
type ImageSplitState = {
  jobs: SplitJob[];
  pieceHeight: number; // 조각 높이(px)
  outputMode: SplitOutputMode; // 출력 포맷 (기본 jpg 압축 — P-5)
  isProcessing: boolean;
  isZipping: boolean;

  addJobs: (jobs: SplitJob[]) => void;
  patchJob: (id: string, patch: Partial<SplitJob>) => void;
  removeJob: (id: string) => void;
  clearJobs: () => void;
  setPieceHeight: (value: number) => void;
  setOutputMode: (value: SplitOutputMode) => void;
  setIsProcessing: (value: boolean) => void;
  setIsZipping: (value: boolean) => void;
};

export const useImageSplitStore = create<ImageSplitState>((set) => ({
  jobs: [],
  pieceHeight: DEFAULT_PIECE_HEIGHT,
  outputMode: 'jpg',
  isProcessing: false,
  isZipping: false,

  addJobs: (newJobs) => set((state) => ({ jobs: [...state.jobs, ...newJobs] })),
  patchJob: (id, patch) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    })),
  removeJob: (id) => set((state) => ({ jobs: state.jobs.filter((job) => job.id !== id) })),
  clearJobs: () => set({ jobs: [] }),
  setPieceHeight: (value) => set({ pieceHeight: value }),
  setOutputMode: (value) => set({ outputMode: value }),
  setIsProcessing: (value) => set({ isProcessing: value }),
  setIsZipping: (value) => set({ isZipping: value }),
}));
