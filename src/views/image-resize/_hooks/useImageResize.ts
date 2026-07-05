'use client';

//////////////////////////////////////// 규격 변환 조율 훅 ////////////////////////////////////////
// Application 레이어 — 파일 추가(검증·해상도 측정), 일괄 변환, ZIP, 핸드오프 수신을 조율한다.
// 상태 보관·변경은 _store/imageResizeStore가 담당.

import { useCallback, useEffect } from 'react';
import { enqueueSnackbar } from 'notistack';
import { buildZip, downloadBlob } from '@/shared/utils/zip';
import {
  filterAcceptedImageFiles,
  notifyRejectedImageFiles,
} from '@/shared/utils/imageFileValidation';
import { useImageHandoffStore } from '@/shared/store/imageHandoffStore';
import { EXTENSION_BY_FORMAT, RESIZE_RESULT_SUFFIX } from '../_constants/imageResize';
import { resizeImage, measureImageSize } from '../_utils/resizeImage';
import { useImageResizeStore, type ResizeJob } from '../_store/imageResizeStore';

export function useImageResize() {
  //////////////////// 스토어 구독 ////////////////////
  const jobs = useImageResizeStore((state) => state.jobs);
  const settings = useImageResizeStore((state) => state.settings);
  const isProcessing = useImageResizeStore((state) => state.isProcessing);
  const isZipping = useImageResizeStore((state) => state.isZipping);
  const processedCount = useImageResizeStore((state) => state.processedCount);
  const updateSettings = useImageResizeStore((state) => state.updateSettings);

  //////////////////// 파일 추가 (검증 + 해상도 측정) ////////////////////
  const addFiles = useCallback((files: File[] | FileList) => {
    const { jobs: currentJobs, addJobs, patchJob } = useImageResizeStore.getState();
    const { accepted, rejected } = filterAcceptedImageFiles(files, {
      count: currentJobs.length,
      totalBytes: currentJobs.reduce((sum, job) => sum + job.file.size, 0),
    });
    notifyRejectedImageFiles(rejected);
    if (accepted.length === 0) return;

    const newJobs: ResizeJob[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalUrl: URL.createObjectURL(file),
      originalWidth: null,
      originalHeight: null,
      status: 'pending',
      resultBlob: null,
      resultUrl: null,
      error: null,
    }));
    addJobs(newJobs);

    // 해상도는 비동기로 측정해 카드에 표기
    newJobs.forEach(async (job) => {
      try {
        const { width, height } = await measureImageSize(job.file);
        patchJob(job.id, { originalWidth: width, originalHeight: height });
      } catch (error) {
        console.error(error);
      }
    });
  }, []);

  //////////////////// 누끼 등 다른 도구에서 넘어온 이미지 수신 ////////////////////
  useEffect(() => {
    const { images, clear } = useImageHandoffStore.getState();
    if (images.length === 0) return;
    clear();
    const files = images.map(
      (image) => new File([image.blob], image.name, { type: image.blob.type || 'image/png' }),
    );
    addFiles(files);
    enqueueSnackbar(`이미지 ${files.length}장을 이어받았습니다.`, { variant: 'info' });
  }, [addFiles]);

  //////////////////// 개별 삭제 / 전체 초기화 (objectURL 정리) ////////////////////
  const removeJob = useCallback((id: string) => {
    const { jobs: currentJobs, removeJob: removeFromStore } = useImageResizeStore.getState();
    const target = currentJobs.find((job) => job.id === id);
    if (target) {
      URL.revokeObjectURL(target.originalUrl);
      if (target.resultUrl) URL.revokeObjectURL(target.resultUrl);
    }
    removeFromStore(id);
  }, []);

  const clearAll = useCallback(() => {
    const { jobs: currentJobs, clearJobs } = useImageResizeStore.getState();
    currentJobs.forEach((job) => {
      URL.revokeObjectURL(job.originalUrl);
      if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
    });
    clearJobs();
  }, []);

  //////////////////// 일괄 변환 (현재 설정으로 전체 재변환) ////////////////////
  const processAll = useCallback(async () => {
    const store = useImageResizeStore.getState();
    if (store.jobs.length === 0 || store.isProcessing) return;

    store.setIsProcessing(true);
    store.setProcessedCount(0);

    let processed = 0;
    for (const job of store.jobs) {
      const { patchJob, setProcessedCount, settings: currentSettings } = useImageResizeStore.getState();
      try {
        const resultBlob = await resizeImage(job.file, currentSettings);
        const resultUrl = URL.createObjectURL(resultBlob);

        const prevJob = useImageResizeStore.getState().jobs.find((item) => item.id === job.id);
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

    useImageResizeStore.getState().setIsProcessing(false);
    enqueueSnackbar('규격 변환이 완료되었습니다.', { variant: 'success' });
  }, []);

  //////////////////// ZIP 다운로드 ////////////////////
  const downloadAllAsZip = useCallback(async () => {
    const store = useImageResizeStore.getState();
    const doneJobs = store.jobs.filter((job) => job.status === 'done' && job.resultBlob);
    if (doneJobs.length === 0) {
      enqueueSnackbar('다운로드할 완료 이미지가 없습니다.', { variant: 'info' });
      return;
    }

    store.setIsZipping(true);
    try {
      const zipBlob = await buildZip(
        doneJobs.map((job) => ({ fileName: job.file.name, blob: job.resultBlob as Blob })),
        { suffix: RESIZE_RESULT_SUFFIX, extension: EXTENSION_BY_FORMAT[store.settings.format] },
      );
      downloadBlob(zipBlob, '규격변환.zip');
    } catch (error) {
      console.error(error);
      enqueueSnackbar('ZIP 생성 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      useImageResizeStore.getState().setIsZipping(false);
    }
  }, []);

  //////////////////// 언마운트 시 정리 ////////////////////
  useEffect(() => {
    return () => {
      const { jobs: currentJobs, clearJobs } = useImageResizeStore.getState();
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
    addFiles,
    removeJob,
    clearAll,
    processAll,
    downloadAllAsZip,
  };
}
