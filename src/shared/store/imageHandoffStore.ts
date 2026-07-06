'use client';

//////////////////////////////////////// 이미지 핸드오프 스토어 (공통) ////////////////////////////////////////
// 도구 간 파이프라인 연결용: 한 도구의 결과 이미지를 다른 도구의 입력으로 넘긴다.
// (예: 누끼 완료 → "규격 변환으로 보내기" → 규격 변환 페이지가 마운트 시 꺼내감)
// autoStart: 받는 도구가 지원하면 도착 즉시 작업을 자동 시작한다 (원클릭 이어달리기 — 도매매 가져오기 → 누끼).

import { create } from 'zustand';

export type HandoffImage = {
  name: string; // 파일명 (확장자 포함)
  blob: Blob;
};

type ImageHandoffState = {
  images: HandoffImage[];
  autoStart: boolean;
  setImages: (images: HandoffImage[], autoStart?: boolean) => void;
  clear: () => void;
};

export const useImageHandoffStore = create<ImageHandoffState>((set) => ({
  images: [],
  autoStart: false,
  setImages: (images, autoStart = false) => set({ images, autoStart }),
  clear: () => set({ images: [], autoStart: false }),
}));
