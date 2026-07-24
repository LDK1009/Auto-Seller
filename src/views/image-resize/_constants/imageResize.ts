//////////////////////////////////////// 이미지 규격 변환 상수 ////////////////////////////////////////

export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';
export type ResizeFitMode = 'contain' | 'cover'; // contain=비율 유지+여백, cover=비율 유지+중앙 크롭

export type ResizeSettings = {
  width: number;
  height: number;
  fit: ResizeFitMode;
  backgroundColor: string; // contain 여백/JPG 배경 색
  format: OutputFormat;
  quality: number; // 0~1 (jpeg/webp)
  cropTopPercent: number; // 변환 전 상단 잘라내기 % (P-4 — 공급사 문구 제거)
  cropBottomPercent: number; // 변환 전 하단 잘라내기 %
};

//////////////////// 규격 프리셋 (스마트스토어 기준 — 타겟 단일 마켓) ////////////////////
export const SIZE_PRESETS: { key: string; label: string; width: number; height: number }[] = [
  { key: 'main-1000', label: '대표 1000×1000 (권장)', width: 1000, height: 1000 },
  { key: 'min-500', label: '최소 500×500', width: 500, height: 500 },
  { key: 'detail-860', label: '상세 가로 860×860', width: 860, height: 860 },
];

export const DEFAULT_RESIZE_SETTINGS: ResizeSettings = {
  width: 1000,
  height: 1000,
  fit: 'contain',
  backgroundColor: '#FFFFFF',
  format: 'image/jpeg',
  quality: 0.9,
  cropTopPercent: 0,
  cropBottomPercent: 0,
};

//////////////////// 상·하단 잘라내기 (P-4) ////////////////////
// 공급사 대표이미지의 상·하단 홍보 문구 제거용 프리셋
export const CROP_PRESETS: { label: string; top: number; bottom: number }[] = [
  { label: '없음', top: 0, bottom: 0 },
  { label: '상단 10%', top: 10, bottom: 0 },
  { label: '하단 10%', top: 0, bottom: 10 },
  { label: '상·하단 10%', top: 10, bottom: 10 },
];
export const MAX_CROP_PERCENT = 40;

//////////////////// 출력 포맷 ////////////////////
export const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: 'image/jpeg', label: 'JPG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WEBP' },
];

export const EXTENSION_BY_FORMAT: Record<OutputFormat, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// 결과 파일명 접미사
export const RESIZE_RESULT_SUFFIX = '_규격';

// 크기 입력 허용 범위
export const MIN_DIMENSION = 100;
export const MAX_DIMENSION = 5000;
