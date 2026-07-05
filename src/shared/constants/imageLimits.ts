//////////////////////////////////////// 이미지 입력 제한 (공통) ////////////////////////////////////////
// 이미지 도구들(누끼·규격 변환·워터마크 등)이 공유하는 입력 제한.
// 완료본이 브라우저 메모리에 누적되므로 OOM 방지용 상한 — 정상 사용은 걸리지 않는 수준.

export const ACCEPTED_IMAGE_PREFIX = 'image/';
export const ACCEPT_ATTR = 'image/png,image/jpeg,image/webp';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 개별 10MB — 순간 디코드 peak 방어
export const MAX_FILE_COUNT = 100; // 최대 100장 — 완료본 누적 방어
export const MAX_TOTAL_SIZE = 300 * 1024 * 1024; // 총 300MB — 집계 방어(먼저 걸리는 값)

////////// 바이트 → MB 표기
export function formatMegabytes(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

////////// 제한 안내 문구 (드롭존 하단 표기용)
export const IMAGE_LIMIT_HELPER_TEXT = `개별 ${formatMegabytes(MAX_FILE_SIZE)}MB · 최대 ${MAX_FILE_COUNT}장 · 총 ${formatMegabytes(MAX_TOTAL_SIZE)}MB 까지`;
