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

//////////////////// 진행 단계 ////////////////////
// @imgly progress 콜백의 key를 단계명 + 진행바 목표치로 매핑한다.
// fetch:* = 모델/WASM 다운로드(첫 실행만), compute:* = 실제 누끼 연산 4단계.
//
// 진행바(0~1)는 "한 이미지 4단계 = 100%"이며, 정확히 4등분하지 않고
// 실제 소요 비중대로 가중치를 준다(inference가 대부분을 차지).
// end = 해당 단계가 끝났을 때의 누적 진행률, estMs = 예상 소요시간(단계 경계에서만
// 이벤트가 오므로, 이 시간 동안 linear로 바를 채워 "기어가는" 진행감을 준다).
export const DOWNLOAD_STEP_LABEL = '모델 다운로드';

export type StepProgress = { label: string; end: number; estMs: number };
export const STEP_PROGRESS: Record<string, StepProgress> = {
  'compute:decode': { label: '이미지 해독', end: 0.05, estMs: 250 }, // 파일→픽셀 (빠름)
  'compute:inference': { label: '배경 분석', end: 0.8, estMs: 2500 }, // 추론 (대부분 차지)
  'compute:mask': { label: '배경 제거', end: 0.85, estMs: 250 }, // 마스크 적용 (빠름)
  'compute:encode': { label: '이미지 저장', end: 1.0, estMs: 900 }, // PNG 인코딩 (중간)
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
