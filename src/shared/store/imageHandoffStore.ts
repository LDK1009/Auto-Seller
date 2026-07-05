'use client';

//////////////////////////////////////// 이미지 핸드오프 스토어 (공통) ////////////////////////////////////////
// 도구 간 파이프라인 연결용: 한 도구의 결과 이미지를 다른 도구의 입력으로 넘긴다.
// (예: 누끼 완료 → "규격 변환으로 보내기" → 규격 변환 페이지가 마운트 시 꺼내감)

import { create } from 'zustand';

export type HandoffImage = {
  name: string; // 파일명 (확장자 포함)
  blob: Blob;
};

type ImageHandoffState = {
  images: HandoffImage[];
  setImages: (images: HandoffImage[]) => void;
  clear: () => void;
};

export const useImageHandoffStore = create<ImageHandoffState>((set) => ({
  images: [],
  setImages: (images) => set({ images }),
  clear: () => set({ images: [] }),
}));
