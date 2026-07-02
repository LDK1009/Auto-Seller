//////////////////////////////////////// 누끼 기능 상수 ////////////////////////////////////////

import type { Config } from '@imgly/background-removal';

//////////////////// 입력 파일 ////////////////////
// 허용 이미지 MIME 접두사
export const ACCEPTED_IMAGE_PREFIX = 'image/';
// input accept 속성값
export const ACCEPT_ATTR = 'image/png,image/jpeg,image/webp';

//////////////////// 출력 ////////////////////
export const OUTPUT_FORMAT = 'image/png' as const; // 투명도 유지 위해 PNG 고정
export const OUTPUT_EXTENSION = 'png';
export const RESULT_SUFFIX = '_누끼'; // 결과 파일명 접미사

//////////////////// @imgly 처리 옵션 ////////////////////
// 자산(모델·WASM)은 기본 imgly CDN에서 로드된다(별도 설정 불필요).
export const REMOVE_BG_CONFIG: Config = {
  device: 'gpu', // WebGPU 지원 시 GPU 추론, 미지원 브라우저는 자동 CPU 폴백
  model: 'isnet_fp16', // 품질/속도 균형 기본 모델
  output: {
    format: OUTPUT_FORMAT,
    quality: 0.8,
  },
};

//////////////////// 배경 옵션 프리셋 ////////////////////
// kind 'transparent' = 배경 제거만, 'color' = 단색 배경 합성
export type BackgroundOption =
  | { kind: 'transparent' }
  | { kind: 'color'; hex: string };

export const DEFAULT_CUSTOM_COLOR = '#F2F2F2';

// 빠른 선택용 프리셋 (스마트스토어는 흰 배경 상품컷 권장)
export const BACKGROUND_PRESETS: { label: string; option: BackgroundOption }[] = [
  { label: '투명', option: { kind: 'transparent' } },
  { label: '흰색', option: { kind: 'color', hex: '#FFFFFF' } },
];
