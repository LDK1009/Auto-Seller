//////////////////////////////////////// 워터마크 상수 ////////////////////////////////////////

export type WatermarkType = 'text' | 'logo';

export type WatermarkPosition =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

export type WatermarkSettings = {
  type: WatermarkType;
  text: string; // 텍스트 워터마크 내용
  textColor: string;
  logoBlob: Blob | null; // 로고 워터마크 이미지
  logoName: string; // 로고 파일명 표시용
  position: WatermarkPosition;
  opacity: number; // 0~1
  scale: number; // 짧은 변 대비 워터마크 크기 비율 (0.05~0.5)
};

export const DEFAULT_WATERMARK_SETTINGS: WatermarkSettings = {
  type: 'text',
  text: '© 내 스토어',
  textColor: '#FFFFFF',
  logoBlob: null,
  logoName: '',
  position: 'bottom-right',
  opacity: 0.5,
  scale: 0.12,
};

// 3×3 위치 그리드 순서
export const POSITION_GRID: { position: WatermarkPosition; label: string }[] = [
  { position: 'top-left', label: '왼쪽 위' },
  { position: 'top', label: '위' },
  { position: 'top-right', label: '오른쪽 위' },
  { position: 'left', label: '왼쪽' },
  { position: 'center', label: '중앙' },
  { position: 'right', label: '오른쪽' },
  { position: 'bottom-left', label: '왼쪽 아래' },
  { position: 'bottom', label: '아래' },
  { position: 'bottom-right', label: '오른쪽 아래' },
];

// 위치 → 가로/세로 정렬 매핑
export const POSITION_ALIGN: Record<
  WatermarkPosition,
  { horizontal: 'left' | 'center' | 'right'; vertical: 'top' | 'middle' | 'bottom' }
> = {
  'top-left': { horizontal: 'left', vertical: 'top' },
  top: { horizontal: 'center', vertical: 'top' },
  'top-right': { horizontal: 'right', vertical: 'top' },
  left: { horizontal: 'left', vertical: 'middle' },
  center: { horizontal: 'center', vertical: 'middle' },
  right: { horizontal: 'right', vertical: 'middle' },
  'bottom-left': { horizontal: 'left', vertical: 'bottom' },
  bottom: { horizontal: 'center', vertical: 'bottom' },
  'bottom-right': { horizontal: 'right', vertical: 'bottom' },
};

// 가장자리 여백 (짧은 변 대비 비율)
export const WATERMARK_MARGIN_RATIO = 0.04;

// 결과 파일명 접미사
export const WATERMARK_RESULT_SUFFIX = '_워터마크';
