//////////////////////////////////////// 상세페이지 이미지 분할 상수 ////////////////////////////////////////

// 조각 높이 프리셋 (마켓 에디터 업로드 제한 대응용)
export const HEIGHT_PRESETS: { label: string; value: number }[] = [
  { label: '2,000px', value: 2000 },
  { label: '3,000px', value: 3000 },
  { label: '5,000px', value: 5000 },
];

export const DEFAULT_PIECE_HEIGHT = 2000;
export const MIN_PIECE_HEIGHT = 500;
export const MAX_PIECE_HEIGHT = 10000;
