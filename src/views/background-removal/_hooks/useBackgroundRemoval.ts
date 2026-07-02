'use client';

//////////////////////////////////////// 누끼 처리 조율 훅 ////////////////////////////////////////
// job 큐 상태, 순차 처리(메모리 안전), 배경옵션 적용/재합성, ZIP 다운로드를 조율한다.
// 무거운 배경제거(removeImageBackground)는 1회만 수행하고 투명 결과를 보관 →
// 배경옵션 변경 시에는 applyBackgroundColor 재합성만 수행한다.

import { useCallback, useEffect, useRef, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import {
  ACCEPTED_IMAGE_PREFIX,
  DEFAULT_CUSTOM_COLOR,
  MAX_FILE_SIZE,
  MAX_FILE_COUNT,
  MAX_TOTAL_SIZE,
  type BackgroundOption,
} from '../_constants/backgroundRemoval';
import { removeImageBackground } from '../_utils/removeImageBackground';
import { applyBackgroundColor } from '../_utils/applyBackgroundColor';
import { buildZip, downloadBlob } from '../_utils/buildZip';

//////////////////// 타입 ////////////////////
export type ProcessStatus = 'pending' | 'processing' | 'done' | 'error';

export type ImageJob = {
  id: string;
  file: File;
  originalUrl: string; // 원본 미리보기 objectURL
  status: ProcessStatus;
  progress: number; // 0~1 목표 진행률 (processing 중)
  progressMs: number; // 위 목표까지 바 애니메이션 시간(ms)
  downloading: boolean; // 모델 다운로드 구간(바 indeterminate)
  step: string; // 현재 단계 라벨(모델 다운로드 / 배경 분석 …), processing 중에만 유효
  transparentBlob: Blob | null; // 누끼(투명) 결과 — 재합성 재료
  resultBlob: Blob | null; // 배경옵션 적용 최종 결과
  resultUrl: string | null; // 최종 결과 objectURL
  error: string | null;
};

//////////////////// 유틸: job 부분 업데이트 ////////////////////
function patchJob(jobs: ImageJob[], id: string, patch: Partial<ImageJob>): ImageJob[] {
  return jobs.map((job) => (job.id === id ? { ...job, ...patch } : job));
}

export function useBackgroundRemoval() {
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false); // 취소 요청 후 현재 이미지 마무리 대기
  const [isZipping, setIsZipping] = useState(false);
  const [backgroundOption, setBackgroundOption] = useState<BackgroundOption>({ kind: 'transparent' });
  const [customColor, setCustomColor] = useState(DEFAULT_CUSTOM_COLOR);

  // 순차 루프에서 최신 배경옵션 참조용
  const backgroundOptionRef = useRef(backgroundOption);
  backgroundOptionRef.current = backgroundOption;

  // 협조적 취소 플래그 (진행 중 이미지의 추론 자체는 중단 불가 → 다음 이미지부터 중지)
  const cancelRequestedRef = useRef(false);

  // 언마운트 시 objectURL 정리를 위한 최신 jobs 참조
  const jobsRef = useRef<ImageJob[]>(jobs);
  jobsRef.current = jobs;

  //////////////////// 파일 추가 (입력 제한 검증) ////////////////////
  const addFiles = useCallback((files: File[] | FileList) => {
    const all = Array.from(files);
    const rejected = { type: 0, size: 0, count: 0, total: 0 };

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

    // 3) 장수·총용량 상한 (현재 보유분 기준 누적 검사)
    const current = jobsRef.current;
    let runningCount = current.length;
    let runningTotal = current.reduce((sum, job) => sum + job.file.size, 0);

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

    // 제외 사유별 안내
    const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));
    if (rejected.type > 0) {
      enqueueSnackbar(`이미지가 아닌 파일 ${rejected.type}개는 제외했습니다.`, { variant: 'warning' });
    }
    if (rejected.size > 0) {
      enqueueSnackbar(`${mb(MAX_FILE_SIZE)}MB를 초과한 파일 ${rejected.size}개는 제외했습니다.`, { variant: 'warning' });
    }
    if (rejected.count > 0) {
      enqueueSnackbar(`최대 ${MAX_FILE_COUNT}장까지 처리할 수 있어 ${rejected.count}개는 제외했습니다.`, { variant: 'warning' });
    }
    if (rejected.total > 0) {
      enqueueSnackbar(`총 ${mb(MAX_TOTAL_SIZE)}MB를 초과해 ${rejected.total}개는 제외했습니다.`, { variant: 'warning' });
    }
    if (accepted.length === 0) return;

    const newJobs: ImageJob[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
      progressMs: 0,
      downloading: false,
      step: '',
      transparentBlob: null,
      resultBlob: null,
      resultUrl: null,
      error: null,
    }));
    setJobs((prev) => [...prev, ...newJobs]);
  }, []);

  //////////////////// 개별 삭제 ////////////////////
  const removeJob = useCallback((id: string) => {
    setJobs((prev) => {
      const target = prev.find((job) => job.id === id);
      if (target) {
        URL.revokeObjectURL(target.originalUrl);
        if (target.resultUrl) URL.revokeObjectURL(target.resultUrl);
      }
      return prev.filter((job) => job.id !== id);
    });
  }, []);

  //////////////////// 전체 초기화 ////////////////////
  const clearAll = useCallback(() => {
    setJobs((prev) => {
      prev.forEach((job) => {
        URL.revokeObjectURL(job.originalUrl);
        if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
      });
      return [];
    });
  }, []);

  //////////////////// 전체 처리 (순차) ////////////////////
  const start = useCallback(async () => {
    const pendingIds = jobsRef.current
      .filter((job) => job.status === 'pending' || job.status === 'error')
      .map((job) => job.id);
    if (pendingIds.length === 0 || isProcessing) return;

    cancelRequestedRef.current = false;
    setIsCancelling(false);
    setIsProcessing(true);
    for (const id of pendingIds) {
      // 취소 요청 시 다음 이미지부터 중지 (진행 중인 이미지는 위 반복에서 이미 완료됨)
      if (cancelRequestedRef.current) break;

      const target = jobsRef.current.find((job) => job.id === id);
      if (!target) continue;

      setJobs((prev) => patchJob(prev, id, {
        status: 'processing', progress: 0, progressMs: 0, downloading: false, step: '준비 중', error: null,
      }));
      try {
        //////////////////// 1) 배경 제거(투명) ////////////////////
        const transparentBlob = await removeImageBackground(target.file, ({ step, phase, ratio, durationMs }) => {
          setJobs((prev) => patchJob(prev, id, {
            step,
            progress: ratio,
            progressMs: durationMs,
            downloading: phase === 'download',
          }));
        });

        //////////////////// 2) 배경옵션 적용 ////////////////////
        const resultBlob = await applyBackgroundColor(transparentBlob, backgroundOptionRef.current);
        const resultUrl = URL.createObjectURL(resultBlob);

        setJobs((prev) => patchJob(prev, id, {
          status: 'done',
          progress: 1,
          progressMs: 200,
          downloading: false,
          step: '',
          transparentBlob,
          resultBlob,
          resultUrl,
        }));
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : '알 수 없는 오류';
        setJobs((prev) => patchJob(prev, id, { status: 'error', error: message }));
      }
    }
    const wasCancelled = cancelRequestedRef.current;
    cancelRequestedRef.current = false;
    setIsCancelling(false);
    setIsProcessing(false);
    if (wasCancelled) {
      enqueueSnackbar('누끼 처리를 중지했습니다. 남은 이미지는 대기 상태입니다.', { variant: 'info' });
    } else {
      enqueueSnackbar('누끼 처리가 완료되었습니다.', { variant: 'success' });
    }
  }, [isProcessing]);

  //////////////////// 처리 취소 요청 ////////////////////
  // 진행 중 이미지의 추론은 중단 불가 → 현재 이미지 완료 후 나머지 중지(협조적 취소).
  const requestCancel = useCallback(() => {
    if (!isProcessing || cancelRequestedRef.current) return;
    cancelRequestedRef.current = true;
    setIsCancelling(true);
    enqueueSnackbar('현재 이미지를 마친 뒤 중지합니다.', { variant: 'warning' });
  }, [isProcessing]);

  //////////////////// 배경옵션 변경 시 완료 job 재합성 ////////////////////
  const changeBackgroundOption = useCallback(async (option: BackgroundOption) => {
    setBackgroundOption(option);

    const doneJobs = jobsRef.current.filter((job) => job.status === 'done' && job.transparentBlob);
    for (const job of doneJobs) {
      try {
        const resultBlob = await applyBackgroundColor(job.transparentBlob as Blob, option);
        const resultUrl = URL.createObjectURL(resultBlob);
        setJobs((prev) => {
          const prevJob = prev.find((item) => item.id === job.id);
          if (prevJob?.resultUrl) URL.revokeObjectURL(prevJob.resultUrl);
          return patchJob(prev, job.id, { resultBlob, resultUrl });
        });
      } catch (error) {
        console.error(error);
      }
    }
  }, []);

  //////////////////// ZIP 다운로드 ////////////////////
  const downloadAllAsZip = useCallback(async () => {
    const doneJobs = jobsRef.current.filter((job) => job.status === 'done' && job.resultBlob);
    if (doneJobs.length === 0) {
      enqueueSnackbar('다운로드할 완료 이미지가 없습니다.', { variant: 'info' });
      return;
    }

    setIsZipping(true);
    try {
      const zipBlob = await buildZip(
        doneJobs.map((job) => ({ fileName: job.file.name, blob: job.resultBlob as Blob })),
      );
      downloadBlob(zipBlob, '누끼결과.zip');
    } catch (error) {
      console.error(error);
      enqueueSnackbar('ZIP 생성 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsZipping(false);
    }
  }, []);

  //////////////////// 언마운트 시 objectURL 정리 ////////////////////
  useEffect(() => {
    return () => {
      jobsRef.current.forEach((job) => {
        URL.revokeObjectURL(job.originalUrl);
        if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
      });
    };
  }, []);

  //////////////////// 파생 값 ////////////////////
  const doneCount = jobs.filter((job) => job.status === 'done').length;
  const pendingCount = jobs.filter((job) => job.status === 'pending' || job.status === 'error').length;

  return {
    jobs,
    isProcessing,
    isCancelling,
    isZipping,
    backgroundOption,
    customColor,
    setCustomColor,
    doneCount,
    pendingCount,
    addFiles,
    removeJob,
    clearAll,
    start,
    requestCancel,
    changeBackgroundOption,
    downloadAllAsZip,
  };
}
