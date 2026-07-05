//////////////////////////////////////// 이미지 규정 검사 유틸 ////////////////////////////////////////
// 포맷·크기·비율·용량을 검사해 항목별 pass/warn/fail과 종합 판정을 반환한다.

import {
  RECOMMENDED_DIMENSION,
  MINIMUM_DIMENSION,
  MAX_IMAGE_BYTES,
  type CheckItem,
  type CheckStatus,
} from '../_constants/imageCheck';

export function checkImage(file: File, width: number, height: number): { checks: CheckItem[]; overall: CheckStatus } {
  const checks: CheckItem[] = [];

  //////////////////// 포맷 ////////////////////
  if (file.type === 'image/jpeg' || file.type === 'image/png') {
    checks.push({ key: 'format', label: '파일 형식', status: 'pass', message: 'JPG/PNG — 적합' });
  } else if (file.type === 'image/webp') {
    checks.push({ key: 'format', label: '파일 형식', status: 'warn', message: 'WEBP — 일부 마켓 미지원, JPG/PNG 권장' });
  } else {
    checks.push({ key: 'format', label: '파일 형식', status: 'fail', message: `${file.type || '알 수 없음'} — JPG/PNG로 변환 필요` });
  }

  //////////////////// 해상도 ////////////////////
  const shorterSide = Math.min(width, height);
  if (shorterSide < MINIMUM_DIMENSION) {
    checks.push({
      key: 'dimension',
      label: '해상도',
      status: 'fail',
      message: `${width}×${height} — 최소 ${MINIMUM_DIMENSION}px 미만`,
    });
  } else if (shorterSide < RECOMMENDED_DIMENSION) {
    checks.push({
      key: 'dimension',
      label: '해상도',
      status: 'warn',
      message: `${width}×${height} — 권장 ${RECOMMENDED_DIMENSION}px 미만 (검색 노출에 불리할 수 있음)`,
    });
  } else {
    checks.push({ key: 'dimension', label: '해상도', status: 'pass', message: `${width}×${height} — 권장 기준 충족` });
  }

  //////////////////// 비율 (1:1 권장) ////////////////////
  if (width === height) {
    checks.push({ key: 'ratio', label: '비율', status: 'pass', message: '1:1 정방형 — 적합' });
  } else {
    checks.push({
      key: 'ratio',
      label: '비율',
      status: 'warn',
      message: `1:1 아님 (${(width / height).toFixed(2)}:1) — 규격 변환으로 정방형 맞춤 권장`,
    });
  }

  //////////////////// 용량 ////////////////////
  if (file.size <= MAX_IMAGE_BYTES) {
    checks.push({
      key: 'size',
      label: '용량',
      status: 'pass',
      message: `${(file.size / (1024 * 1024)).toFixed(1)}MB — 적합`,
    });
  } else {
    checks.push({
      key: 'size',
      label: '용량',
      status: 'fail',
      message: `${(file.size / (1024 * 1024)).toFixed(1)}MB — 20MB 초과`,
    });
  }

  //////////////////// 종합 판정 ////////////////////
  const overall: CheckStatus = checks.some((check) => check.status === 'fail')
    ? 'fail'
    : checks.some((check) => check.status === 'warn')
      ? 'warn'
      : 'pass';

  return { checks, overall };
}
