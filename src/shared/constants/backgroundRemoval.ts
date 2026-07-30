//////////////////////////////////////// 누끼 기능 상수 ////////////////////////////////////////
// 모델: ormbg (Open Remove Background Model) ONNX — Apache-2.0
// 2026-07-29 교체: @imgly/background-removal(AGPL-3.0) → ormbg-ONNX(Apache-2.0)
// 사유: AGPL §13은 상용 SaaS 배포 시 전체 소스공개를 요구한다. 유료화 선결 조건이라 교체.
// 실행: transformers.js로 브라우저에서 (WebGPU 우선, 미지원 시 WASM) — 서버 비용 0 유지.

// 입력 파일 허용/제한은 공통 상수 사용: @/shared/constants/imageLimits

//////////////////// 출력 ////////////////////
export const OUTPUT_FORMAT = 'image/png' as const; // 투명도 유지 위해 PNG 고정
export const OUTPUT_EXTENSION = 'png';
export const RESULT_SUFFIX = '_누끼'; // 결과 파일명 접미사

//////////////////// 모델 ////////////////////
// Hugging Face Hub에서 로드 (최초 1회 다운로드 후 브라우저 캐시)
// ⚠️ 원본 레포(schirrmacher/ormbg)는 ONNX 파일만 있고 config·preprocessor가 없어 transformers.js가 못 읽는다.
//    transformers.js 변환본(onnx-community/ormbg-ONNX)을 쓴다 — 같은 모델·Apache-2.0, fp16 가중치 포함.
export const SEGMENTATION_MODEL_ID = 'onnx-community/ormbg-ONNX';
export const MODEL_LICENSE = 'Apache-2.0';

// 추론 정밀도 — fp16이 용량·속도 균형 (미지원 환경은 라이브러리가 fp32로 폴백)
export const MODEL_DTYPE = 'fp16' as const;

//////////////////// 진행 단계 ////////////////////
// phase: 'download' = 모델 내려받기(최초 1회), 'compute' = 실제 누끼 연산
// 진행바(0~1)는 "한 이미지 = 100%"이며 단계별 가중치로 채운다 (inference가 대부분).
export const DOWNLOAD_STEP_LABEL = '모델 다운로드';

export type StepProgress = { label: string; end: number; estMs: number };
export const STEP_PROGRESS: Record<string, StepProgress> = {
  decode: { label: '이미지 해독', end: 0.05, estMs: 250 }, // 파일→픽셀
  inference: { label: '배경 분석', end: 0.85, estMs: 2500 }, // 세그멘테이션 추론 (대부분 차지)
  compose: { label: '배경 제거', end: 1.0, estMs: 400 }, // 마스크 합성 + PNG 인코딩
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
