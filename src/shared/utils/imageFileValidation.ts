//////////////////////////////////////// 이미지 파일 입력 검증 (공통) ////////////////////////////////////////
// 타입 → 개별 크기 → 장수 → 총용량 순으로 검증하고, 제외 사유별 토스트 안내를 제공한다.

import { enqueueSnackbar } from 'notistack';
import {
  ACCEPTED_IMAGE_PREFIX,
  MAX_FILE_SIZE,
  MAX_FILE_COUNT,
  MAX_TOTAL_SIZE,
  formatMegabytes,
} from '@/shared/constants/imageLimits';

type RejectedCounts = { type: number; size: number; count: number; total: number };

export type ImageFileFilterResult = {
  accepted: File[];
  rejected: RejectedCounts;
};

////////// 현재 보유분(count/totalBytes) 기준으로 추가 가능한 파일만 필터
export function filterAcceptedImageFiles(
  files: File[] | FileList,
  existing: { count: number; totalBytes: number },
): ImageFileFilterResult {
  const all = Array.from(files);
  const rejected: RejectedCounts = { type: 0, size: 0, count: 0, total: 0 };

  // 1) 이미지 타입만
  let candidates = all.filter((file) => {
    if (file.type.startsWith(ACCEPTED_IMAGE_PREFIX)) return true;
    rejected.type += 1;
    return false;
  });
  // 2) 개별 파일 크기 상한
  candidates = candidates.filter((file) => {
    if (file.size <= MAX_FILE_SIZE) return true;
    rejected.size += 1;
    return false;
  });

  // 3) 장수·총용량 상한 (누적 검사)
  let runningCount = existing.count;
  let runningTotal = existing.totalBytes;
  const accepted: File[] = [];
  for (const file of candidates) {
    if (runningCount >= MAX_FILE_COUNT) {
      rejected.count += 1;
      continue;
    }
    if (runningTotal + file.size > MAX_TOTAL_SIZE) {
      rejected.total += 1;
      continue;
    }
    accepted.push(file);
    runningCount += 1;
    runningTotal += file.size;
  }

  return { accepted, rejected };
}

////////// 제외 사유별 토스트 안내
export function notifyRejectedImageFiles(rejected: RejectedCounts): void {
  if (rejected.type > 0) {
    enqueueSnackbar(`이미지가 아닌 파일 ${rejected.type}개는 제외했습니다.`, { variant: 'warning' });
  }
  if (rejected.size > 0) {
    enqueueSnackbar(`${formatMegabytes(MAX_FILE_SIZE)}MB를 초과한 파일 ${rejected.size}개는 제외했습니다.`, {
      variant: 'warning',
    });
  }
  if (rejected.count > 0) {
    enqueueSnackbar(`최대 ${MAX_FILE_COUNT}장까지 처리할 수 있어 ${rejected.count}개는 제외했습니다.`, {
      variant: 'warning',
    });
  }
  if (rejected.total > 0) {
    enqueueSnackbar(`총 ${formatMegabytes(MAX_TOTAL_SIZE)}MB를 초과해 ${rejected.total}개는 제외했습니다.`, {
      variant: 'warning',
    });
  }
}
