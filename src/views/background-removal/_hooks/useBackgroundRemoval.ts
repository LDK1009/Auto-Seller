'use client';

//////////////////////////////////////// 누끼 처리 조율 훅 ////////////////////////////////////////
// Application 레이어 — 순차 처리 루프, 협조적 취소, 배경 재합성, ZIP, 입력 검증을 조율한다.
// 상태 보관·변경은 _store/backgroundRemovalStore가 담당(레이어 분리).
// 무거운 배경제거(removeImageBackground)는 1회만 수행하고 투명 결과를 보관 →
// 배경옵션 변경 시에는 applyBackground 재합성만 수행한다.

import { useCallback, useEffect, useRef } from 'react';
import { enqueueSnackbar } from 'notistack';
import { RESULT_SUFFIX, OUTPUT_EXTENSION, type BackgroundOption } from '../_constants/backgroundRemoval';
import { removeImageBackground } from '../_utils/removeImageBackground';
import { applyBackground } from '../_utils/applyBackground';
import { fetchBackgroundImage } from '@/shared/services/backgroundImageSearch';
import { buildZip, downloadBlob } from '@/shared/utils/zip';
import { trackEvent } from '@/shared/utils/analytics';
import {
  filterAcceptedImageFiles,
  notifyRejectedImageFiles,
} from '@/shared/utils/imageFileValidation';
import { useBackgroundRemovalStore, type ImageJob } from '../_store/backgroundRemovalStore';
import { useImageHandoffStore } from '@/shared/store/imageHandoffStore';

// 컴포넌트 호환을 위한 타입 재노출
export type { ImageJob, ProcessStatus } from '../_store/backgroundRemovalStore';

export function useBackgroundRemoval() {
  //////////////////// 스토어 구독 ////////////////////
  const jobs = useBackgroundRemovalStore((state) => state.jobs);
  const isProcessing = useBackgroundRemovalStore((state) => state.isProcessing);
  const isCancelling = useBackgroundRemovalStore((state) => state.isCancelling);
  const isModelLoading = useBackgroundRemovalStore((state) => state.isModelLoading);
  const isZipping = useBackgroundRemovalStore((state) => state.isZipping);
  const backgroundOption = useBackgroundRemovalStore((state) => state.backgroundOption);
  const customColor = useBackgroundRemovalStore((state) => state.customColor);
  const setCustomColor = useBackgroundRemovalStore((state) => state.setCustomColor);

  // 협조적 취소 플래그 (진행 중 이미지의 추론 자체는 중단 불가 → 다음 이미지부터 중지)
  const cancelRequestedRef = useRef(false);

  //////////////////// 파일 추가 (입력 제한 검증 — 공통 유틸) ////////////////////
  const addFiles = useCallback((files: File[] | FileList) => {
    const { jobs: currentJobs, addJobs } = useBackgroundRemovalStore.getState();
    const { accepted, rejected } = filterAcceptedImageFiles(files, {
      count: currentJobs.length,
      totalBytes: currentJobs.reduce((sum, job) => sum + job.file.size, 0),
    });
    notifyRejectedImageFiles(rejected);
    if (accepted.length === 0) return;

    const newJobs: ImageJob[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
      progressMs: 0,
      step: '',
      transparentBlob: null,
      resultBlob: null,
      resultUrl: null,
      error: null,
    }));
    addJobs(newJobs);
  }, []);

  //////////////////// 개별 삭제 (objectURL 정리 포함) ////////////////////
  const removeJob = useCallback((id: string) => {
    const { jobs: currentJobs, removeJob: removeFromStore } = useBackgroundRemovalStore.getState();
    const target = currentJobs.find((job) => job.id === id);
    if (target) {
      URL.revokeObjectURL(target.originalUrl);
      if (target.resultUrl) URL.revokeObjectURL(target.resultUrl);
    }
    removeFromStore(id);
  }, []);

  //////////////////// 전체 초기화 (objectURL 정리 포함) ////////////////////
  const clearAll = useCallback(() => {
    const { jobs: currentJobs, clearJobs } = useBackgroundRemovalStore.getState();
    currentJobs.forEach((job) => {
      URL.revokeObjectURL(job.originalUrl);
      if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
    });
    clearJobs();
  }, []);

  //////////////////// 전체 처리 (순차) ////////////////////
  const start = useCallback(async () => {
    const store = useBackgroundRemovalStore.getState();
    const pendingIds = store.jobs
      .filter((job) => job.status === 'pending' || job.status === 'error')
      .map((job) => job.id);
    if (pendingIds.length === 0 || store.isProcessing) return;

    cancelRequestedRef.current = false;
    store.setIsCancelling(false);
    store.setIsModelLoading(false);
    store.setIsProcessing(true);

    for (const id of pendingIds) {
      // 취소 요청 시 다음 이미지부터 중지 (진행 중인 이미지는 위 반복에서 이미 완료됨)
      if (cancelRequestedRef.current) break;

      const { jobs: latestJobs, patchJob, setIsModelLoading } =
        useBackgroundRemovalStore.getState();
      const target = latestJobs.find((job) => job.id === id);
      if (!target) continue;

      patchJob(id, { status: 'processing', progress: 0, progressMs: 0, step: '준비 중', error: null });
      try {
        //////////////////// 1) 배경 제거(투명) ////////////////////
        const transparentBlob = await removeImageBackground(target.file, ({ step, phase, ratio, durationMs }) => {
          // 모델 다운로드는 개별 바가 아니라 전체 로딩바로 표시
          if (phase === 'download') {
            setIsModelLoading(true);
            return;
          }
          setIsModelLoading(false);
          patchJob(id, { step, progress: ratio, progressMs: durationMs });
        });

        //////////////////// 2) 배경옵션 적용 (루프 중 변경 반영 위해 최신값 참조) ////////////////////
        const currentOption = useBackgroundRemovalStore.getState().backgroundOption;
        // 이미지 배경이면 프록시에서 로드 (HTTP 캐시로 반복 비용 낮음)
        const backgroundImageBlob =
          currentOption.kind === 'image' ? await fetchBackgroundImage(currentOption.url) : null;
        const resultBlob = await applyBackground(transparentBlob, currentOption, backgroundImageBlob);
        const resultUrl = URL.createObjectURL(resultBlob);

        patchJob(id, {
          status: 'done',
          progress: 1,
          progressMs: 200,
          step: '',
          transparentBlob,
          resultBlob,
          resultUrl,
        });
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : '알 수 없는 오류';
        useBackgroundRemovalStore.getState().patchJob(id, { status: 'error', error: message });
      }
    }

    const wasCancelled = cancelRequestedRef.current;
    cancelRequestedRef.current = false;
    const endStore = useBackgroundRemovalStore.getState();
    endStore.setIsCancelling(false);
    endStore.setIsModelLoading(false);
    endStore.setIsProcessing(false);
    if (wasCancelled) {
      enqueueSnackbar('누끼 처리를 중지했습니다. 남은 이미지는 대기 상태입니다.', { variant: 'info' });
    } else {
      enqueueSnackbar('누끼 처리가 완료되었습니다.', { variant: 'success' });
    }
  }, []);

  //////////////////// 도매매 가져오기 등 다른 도구에서 넘어온 이미지 수신 ////////////////////
  // autoStart 플래그가 켜져 있으면(원클릭 이어달리기) 도착 즉시 배경 제거를 시작한다.
  useEffect(() => {
    const { images, autoStart, clear } = useImageHandoffStore.getState();
    if (images.length === 0) return;
    clear();
    const files = images.map(
      (image) => new File([image.blob], image.name, { type: image.blob.type || 'image/png' }),
    );
    addFiles(files);
    if (autoStart) {
      enqueueSnackbar(`이미지 ${files.length}장을 이어받아 배경 제거를 시작합니다.`, { variant: 'info' });
      start();
    } else {
      enqueueSnackbar(`이미지 ${files.length}장을 이어받았습니다.`, { variant: 'info' });
    }
  }, [addFiles, start]);

  //////////////////// 처리 취소 요청 ////////////////////
  // 진행 중 이미지의 추론은 중단 불가 → 현재 이미지 완료 후 나머지 중지(협조적 취소).
  const requestCancel = useCallback(() => {
    const store = useBackgroundRemovalStore.getState();
    if (!store.isProcessing || cancelRequestedRef.current) return;
    cancelRequestedRef.current = true;
    store.setIsCancelling(true);
    enqueueSnackbar('현재 이미지를 마친 뒤 중지합니다.', { variant: 'warning' });
  }, []);

  //////////////////// 배경옵션 변경 시 완료 job 재합성 ////////////////////
  const changeBackgroundOption = useCallback(async (option: BackgroundOption) => {
    // 이미지 배경이면 먼저 로드 — 실패 시 옵션을 바꾸지 않고 중단(일관성 유지)
    let backgroundImageBlob: Blob | null = null;
    if (option.kind === 'image') {
      try {
        backgroundImageBlob = await fetchBackgroundImage(option.url);
      } catch (error) {
        console.error(error);
        enqueueSnackbar('배경 이미지를 불러오지 못했습니다.', { variant: 'error' });
        return;
      }
    }

    const store = useBackgroundRemovalStore.getState();
    store.setBackgroundOption(option);

    const doneJobs = store.jobs.filter((job) => job.status === 'done' && job.transparentBlob);
    for (const job of doneJobs) {
      try {
        const resultBlob = await applyBackground(job.transparentBlob as Blob, option, backgroundImageBlob);
        const resultUrl = URL.createObjectURL(resultBlob);

        const { jobs: latestJobs, patchJob } = useBackgroundRemovalStore.getState();
        const prevJob = latestJobs.find((item) => item.id === job.id);
        if (prevJob?.resultUrl) URL.revokeObjectURL(prevJob.resultUrl);
        patchJob(job.id, { resultBlob, resultUrl });
      } catch (error) {
        console.error(error);
      }
    }
  }, []);

  //////////////////// ZIP 다운로드 ////////////////////
  const downloadAllAsZip = useCallback(async () => {
    const store = useBackgroundRemovalStore.getState();
    const doneJobs = store.jobs.filter((job) => job.status === 'done' && job.resultBlob);
    if (doneJobs.length === 0) {
      enqueueSnackbar('다운로드할 완료 이미지가 없습니다.', { variant: 'info' });
      return;
    }

    store.setIsZipping(true);
    try {
      const zipBlob = await buildZip(
        doneJobs.map((job) => ({ fileName: job.file.name, blob: job.resultBlob as Blob })),
        { suffix: RESULT_SUFFIX, extension: OUTPUT_EXTENSION },
      );
      downloadBlob(zipBlob, '누끼결과.zip');
      trackEvent('zip_download', { tool: 'background-removal' });
    } catch (error) {
      console.error(error);
      enqueueSnackbar('ZIP 생성 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      useBackgroundRemovalStore.getState().setIsZipping(false);
    }
  }, []);

  //////////////////// 언마운트 시 objectURL·상태 정리 ////////////////////
  // 스토어는 모듈 레벨에 남으므로, 라우트 이탈 시 revoke된 URL이 스토어에 남지 않게 함께 비운다.
  useEffect(() => {
    return () => {
      const { jobs: currentJobs, clearJobs } = useBackgroundRemovalStore.getState();
      currentJobs.forEach((job) => {
        URL.revokeObjectURL(job.originalUrl);
        if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
      });
      clearJobs();
    };
  }, []);

  //////////////////// 파생 값 ////////////////////
  const doneCount = jobs.filter((job) => job.status === 'done').length;
  const pendingCount = jobs.filter((job) => job.status === 'pending' || job.status === 'error').length;

  return {
    jobs,
    isProcessing,
    isCancelling,
    isModelLoading,
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
