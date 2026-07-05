'use client';

//////////////////////////////////////// 이미지 분할 조율 훅 ////////////////////////////////////////
// 파일 추가(검증·해상도 측정) → 일괄 분할 → ZIP(조각별 번호 파일명).

import { useCallback, useEffect } from 'react';
import { enqueueSnackbar } from 'notistack';
import { buildZipWithNames, downloadBlob } from '@/shared/utils/zip';
import {
  filterAcceptedImageFiles,
  notifyRejectedImageFiles,
} from '@/shared/utils/imageFileValidation';
import { splitImage, getSplitExtension } from '../_utils/splitImage';
import { useImageSplitStore, type SplitJob } from '../_store/imageSplitStore';

// 해상도 측정
async function measureSize(source: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(source);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

export function useImageSplit() {
  //////////////////// 스토어 구독 ////////////////////
  const jobs = useImageSplitStore((state) => state.jobs);
  const pieceHeight = useImageSplitStore((state) => state.pieceHeight);
  const isProcessing = useImageSplitStore((state) => state.isProcessing);
  const isZipping = useImageSplitStore((state) => state.isZipping);
  const setPieceHeight = useImageSplitStore((state) => state.setPieceHeight);

  //////////////////// 파일 추가 ////////////////////
  const addFiles = useCallback((files: File[] | FileList) => {
    const { jobs: currentJobs, addJobs, patchJob } = useImageSplitStore.getState();
    const { accepted, rejected } = filterAcceptedImageFiles(files, {
      count: currentJobs.length,
      totalBytes: currentJobs.reduce((sum, job) => sum + job.file.size, 0),
    });
    notifyRejectedImageFiles(rejected);
    if (accepted.length === 0) return;

    const newJobs: SplitJob[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalUrl: URL.createObjectURL(file),
      width: null,
      height: null,
      status: 'pending',
      pieceBlobs: [],
      error: null,
    }));
    addJobs(newJobs);

    newJobs.forEach(async (job) => {
      try {
        const { width, height } = await measureSize(job.file);
        patchJob(job.id, { width, height });
      } catch (error) {
        console.error(error);
      }
    });
  }, []);

  //////////////////// 삭제 / 초기화 ////////////////////
  const removeJob = useCallback((id: string) => {
    const { jobs: currentJobs, removeJob: removeFromStore } = useImageSplitStore.getState();
    const target = currentJobs.find((job) => job.id === id);
    if (target) URL.revokeObjectURL(target.originalUrl);
    removeFromStore(id);
  }, []);

  const clearAll = useCallback(() => {
    const { jobs: currentJobs, clearJobs } = useImageSplitStore.getState();
    currentJobs.forEach((job) => URL.revokeObjectURL(job.originalUrl));
    clearJobs();
  }, []);

  //////////////////// 일괄 분할 ////////////////////
  const processAll = useCallback(async () => {
    const store = useImageSplitStore.getState();
    if (store.jobs.length === 0 || store.isProcessing) return;

    store.setIsProcessing(true);
    for (const job of store.jobs) {
      const { patchJob, pieceHeight: currentHeight } = useImageSplitStore.getState();
      try {
        const pieceBlobs = await splitImage(job.file, currentHeight);
        patchJob(job.id, { status: 'done', pieceBlobs, error: null });
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : '알 수 없는 오류';
        patchJob(job.id, { status: 'error', error: message });
      }
    }
    useImageSplitStore.getState().setIsProcessing(false);
    enqueueSnackbar('이미지 분할이 완료되었습니다.', { variant: 'success' });
  }, []);

  //////////////////// ZIP 다운로드 (조각별 번호) ////////////////////
  const downloadAllAsZip = useCallback(async () => {
    const store = useImageSplitStore.getState();
    const doneJobs = store.jobs.filter((job) => job.status === 'done' && job.pieceBlobs.length > 0);
    if (doneJobs.length === 0) {
      enqueueSnackbar('다운로드할 분할 결과가 없습니다.', { variant: 'info' });
      return;
    }

    store.setIsZipping(true);
    try {
      const entries = doneJobs.flatMap((job) => {
        const baseName = job.file.name.replace(/\.[^.]+$/, '');
        const extension = getSplitExtension(job.file);
        return job.pieceBlobs.map((blob, index) => ({
          name: `${baseName}_${String(index + 1).padStart(2, '0')}.${extension}`,
          blob,
        }));
      });
      const zipBlob = await buildZipWithNames(entries);
      downloadBlob(zipBlob, '상세분할.zip');
    } catch (error) {
      console.error(error);
      enqueueSnackbar('ZIP 생성 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      useImageSplitStore.getState().setIsZipping(false);
    }
  }, []);

  //////////////////// 언마운트 정리 ////////////////////
  useEffect(() => {
    return () => {
      const { jobs: currentJobs, clearJobs } = useImageSplitStore.getState();
      currentJobs.forEach((job) => URL.revokeObjectURL(job.originalUrl));
      clearJobs();
    };
  }, []);

  //////////////////// 파생 값 ////////////////////
  const doneCount = jobs.filter((job) => job.status === 'done').length;
  const totalPieces = jobs.reduce((sum, job) => sum + job.pieceBlobs.length, 0);

  return {
    jobs,
    pieceHeight,
    isProcessing,
    isZipping,
    doneCount,
    totalPieces,
    setPieceHeight,
    addFiles,
    removeJob,
    clearAll,
    processAll,
    downloadAllAsZip,
  };
}
