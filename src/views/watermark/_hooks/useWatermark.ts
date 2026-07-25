'use client';

//////////////////////////////////////// 워터마크 조율 훅 ////////////////////////////////////////
// 파일 추가(검증), 로고 설정, 일괄 합성, ZIP 다운로드를 조율한다.

import { useCallback, useEffect } from 'react';
import { enqueueSnackbar } from 'notistack';
import { buildZipWithNames, downloadBlob } from '@/shared/utils/zip';
import { trackEvent } from '@/shared/utils/analytics';
import {
  filterAcceptedImageFiles,
  notifyRejectedImageFiles,
} from '@/shared/utils/imageFileValidation';
import { WATERMARK_RESULT_SUFFIX } from '@/shared/constants/watermark';
import { applyWatermark, getWatermarkExtension } from '@/shared/utils/applyWatermark';
import { useWatermarkStore, type WatermarkJob } from '../_store/watermarkStore';

export function useWatermark() {
  //////////////////// 스토어 구독 ////////////////////
  const jobs = useWatermarkStore((state) => state.jobs);
  const settings = useWatermarkStore((state) => state.settings);
  const isProcessing = useWatermarkStore((state) => state.isProcessing);
  const isZipping = useWatermarkStore((state) => state.isZipping);
  const processedCount = useWatermarkStore((state) => state.processedCount);
  const updateSettings = useWatermarkStore((state) => state.updateSettings);

  //////////////////// 파일 추가 ////////////////////
  const addFiles = useCallback((files: File[] | FileList) => {
    const { jobs: currentJobs, addJobs } = useWatermarkStore.getState();
    const { accepted, rejected } = filterAcceptedImageFiles(files, {
      count: currentJobs.length,
      totalBytes: currentJobs.reduce((sum, job) => sum + job.file.size, 0),
    });
    notifyRejectedImageFiles(rejected);
    if (accepted.length === 0) return;

    const newJobs: WatermarkJob[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalUrl: URL.createObjectURL(file),
      status: 'pending',
      resultBlob: null,
      resultUrl: null,
      error: null,
    }));
    addJobs(newJobs);
  }, []);

  //////////////////// 로고 설정 ////////////////////
  const setLogo = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('이미지 파일만 로고로 사용할 수 있어요.', { variant: 'warning' });
      return;
    }
    useWatermarkStore.getState().updateSettings({ logoBlob: file, logoName: file.name, type: 'logo' });
  }, []);

  //////////////////// 삭제 / 초기화 ////////////////////
  const removeJob = useCallback((id: string) => {
    const { jobs: currentJobs, removeJob: removeFromStore } = useWatermarkStore.getState();
    const target = currentJobs.find((job) => job.id === id);
    if (target) {
      URL.revokeObjectURL(target.originalUrl);
      if (target.resultUrl) URL.revokeObjectURL(target.resultUrl);
    }
    removeFromStore(id);
  }, []);

  const clearAll = useCallback(() => {
    const { jobs: currentJobs, clearJobs } = useWatermarkStore.getState();
    currentJobs.forEach((job) => {
      URL.revokeObjectURL(job.originalUrl);
      if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
    });
    clearJobs();
  }, []);

  //////////////////// 일괄 합성 (현재 설정으로 전체 재처리) ////////////////////
  const processAll = useCallback(async () => {
    const store = useWatermarkStore.getState();
    if (store.jobs.length === 0 || store.isProcessing) return;
    if (store.settings.type === 'logo' && !store.settings.logoBlob) {
      enqueueSnackbar('로고 이미지를 먼저 업로드하세요.', { variant: 'warning' });
      return;
    }

    store.setIsProcessing(true);
    store.setProcessedCount(0);

    let processed = 0;
    for (const job of store.jobs) {
      const { patchJob, setProcessedCount, settings: currentSettings } = useWatermarkStore.getState();
      try {
        const resultBlob = await applyWatermark(job.file, currentSettings);
        const resultUrl = URL.createObjectURL(resultBlob);

        const prevJob = useWatermarkStore.getState().jobs.find((item) => item.id === job.id);
        if (!prevJob) continue; // 처리 중 삭제됨
        if (prevJob.resultUrl) URL.revokeObjectURL(prevJob.resultUrl);

        patchJob(job.id, { status: 'done', resultBlob, resultUrl, error: null });
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : '알 수 없는 오류';
        patchJob(job.id, { status: 'error', error: message });
      }
      processed += 1;
      setProcessedCount(processed);
    }

    useWatermarkStore.getState().setIsProcessing(false);
    enqueueSnackbar('워터마크 합성이 완료됐어요.', { variant: 'success' });
  }, []);

  //////////////////// ZIP 다운로드 (원본 포맷 유지 → 파일별 확장자) ////////////////////
  const downloadAllAsZip = useCallback(async () => {
    const store = useWatermarkStore.getState();
    const doneJobs = store.jobs.filter((job) => job.status === 'done' && job.resultBlob);
    if (doneJobs.length === 0) {
      enqueueSnackbar('다운로드할 완료 이미지가 없어요.', { variant: 'info' });
      return;
    }

    store.setIsZipping(true);
    try {
      const usedNames = new Set<string>();
      const entries = doneJobs.map((job) => {
        const baseName = job.file.name.replace(/\.[^.]+$/, '');
        const extension = getWatermarkExtension(job.file);
        let name = `${baseName}${WATERMARK_RESULT_SUFFIX}.${extension}`;
        let counter = 1;
        while (usedNames.has(name)) {
          name = `${baseName}${WATERMARK_RESULT_SUFFIX}_${counter}.${extension}`;
          counter += 1;
        }
        usedNames.add(name);
        return { name, blob: job.resultBlob as Blob };
      });

      const zipBlob = await buildZipWithNames(entries);
      downloadBlob(zipBlob, '워터마크.zip');
      trackEvent('zip_download', { tool: 'watermark' });
    } catch (error) {
      console.error(error);
      enqueueSnackbar('ZIP 생성 중 오류가 발생했어요.', { variant: 'error' });
    } finally {
      useWatermarkStore.getState().setIsZipping(false);
    }
  }, []);

  //////////////////// 언마운트 정리 ////////////////////
  useEffect(() => {
    return () => {
      const { jobs: currentJobs, clearJobs } = useWatermarkStore.getState();
      currentJobs.forEach((job) => {
        URL.revokeObjectURL(job.originalUrl);
        if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
      });
      clearJobs();
    };
  }, []);

  //////////////////// 파생 값 ////////////////////
  const doneCount = jobs.filter((job) => job.status === 'done').length;

  return {
    jobs,
    settings,
    isProcessing,
    isZipping,
    processedCount,
    doneCount,
    updateSettings,
    setLogo,
    addFiles,
    removeJob,
    clearAll,
    processAll,
    downloadAllAsZip,
  };
}
