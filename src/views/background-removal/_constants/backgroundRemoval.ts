//////////////////////////////////////// 누끼 기능 상수 ////////////////////////////////////////

import type { Config } from '@imgly/background-removal';

//////////////////// 입력 파일 ////////////////////
// 허용 이미지 MIME 접두사
export const ACCEPTED_IMAGE_PREFIX = 'image/';
// input accept 속성값
export const ACCEPT_ATTR = 'image/png,image/jpeg,image/webp';

//////////////////// 입력 제한 (메모리 보호) ////////////////////
// 완료본이 브라우저 메모리에 누적되므로 OOM 방지용 상한. 정상 사용은 걸리지 않는 수준.
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 개별 10MB — 순간 디코드 peak 방어
export const MAX_FILE_COUNT = 100; // 최대 100장 — 완료본 누적 방어
export const MAX_TOTAL_SIZE = 300 * 1024 * 1024; // 총 300MB — 집계 방어(먼저 걸리는 값)

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

//////////////////// 배경 옵션 ////////////////////
// 'transparent' = 배경 제거만, 'color' = 색상/패턴 배경 합성, 'image' = 검색 이미지 배경 합성
// 패턴은 선택 색상 + 흰색 2톤으로 그린다.
export type PatternKind = 'solid' | 'gradient' | 'stripes-vertical' | 'stripes-horizontal' | 'check';

// 그라데이션 진행 방향 (선택 색 → 흰색이 흐르는 방향, 'center'는 중앙에서 바깥으로 퍼짐)
export type GradientDirection =
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'
  | 'top-left'
  | 'center';

export type BackgroundOption =
  | { kind: 'transparent' }
  | { kind: 'color'; hex: string; pattern?: PatternKind; gradientDirection?: GradientDirection }
  | { kind: 'image'; url: string };

export const DEFAULT_CUSTOM_COLOR = '#F2F2F2';

// 패턴 선택 타일 목록
export const PATTERN_OPTIONS: { pattern: PatternKind; label: string }[] = [
  { pattern: 'solid', label: '단색' },
  { pattern: 'gradient', label: '그라데이션' },
  { pattern: 'stripes-vertical', label: '세로선' },
  { pattern: 'stripes-horizontal', label: '가로선' },
  { pattern: 'check', label: '체크무늬' },
];

// 그라데이션 방향 목록 (기본: 아래로) — 3×3 그리드 순서, 중앙은 radial(퍼짐)
export const DEFAULT_GRADIENT_DIRECTION: GradientDirection = 'bottom';
export const GRADIENT_DIRECTIONS: { direction: GradientDirection; label: string }[] = [
  { direction: 'top-left', label: '왼쪽 위로' },
  { direction: 'top', label: '위로' },
  { direction: 'top-right', label: '오른쪽 위로' },
  { direction: 'left', label: '왼쪽으로' },
  { direction: 'center', label: '중앙에서 퍼짐' },
  { direction: 'right', label: '오른쪽으로' },
  { direction: 'bottom-left', label: '왼쪽 아래로' },
  { direction: 'bottom', label: '아래로' },
  { direction: 'bottom-right', label: '오른쪽 아래로' },
];

// 셀러 추천 색상 (상품컷에 자주 쓰는 톤)
export const SELLER_RECOMMENDED_COLORS: { hex: string; label: string }[] = [
  { hex: '#FFFFFF', label: '흰색' },
  { hex: '#F7F7F7', label: '라이트그레이' },
  { hex: '#F5EFE6', label: '아이보리' },
  { hex: '#FFE8D6', label: '피치' },
  { hex: '#FDE2E4', label: '연핑크' },
  { hex: '#E3F2FD', label: '연블루' },
  { hex: '#E8F5E9', label: '연민트' },
  { hex: '#212121', label: '블랙' },
];
