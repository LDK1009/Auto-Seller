//////////////////////////////////////// 이미지 규정 검사 상수 ////////////////////////////////////////
// 스마트스토어 대표이미지 기준의 대략 규정. 마켓 정책은 변동될 수 있어 안내 문구로 고지한다.

export const RECOMMENDED_DIMENSION = 1000; // 권장 최소 변 (1000×1000)
export const MINIMUM_DIMENSION = 300; // 이 미만이면 부적합
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 최대 용량 20MB

export const CHECK_DISCLAIMER =
  '스마트스토어 대표이미지 기준의 대략 검사입니다. 마켓별 세부 정책은 달라질 수 있습니다.';

//////////////////// 검사 결과 타입 ////////////////////
export type CheckStatus = 'pass' | 'warn' | 'fail';

export type CheckItem = {
  key: string;
  label: string;
  status: CheckStatus;
  message: string;
};
