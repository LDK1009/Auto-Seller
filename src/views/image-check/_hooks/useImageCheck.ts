'use client';

//////////////////////////////////////// 규정 검사 조율 훅 ////////////////////////////////////////
// 파일 추가(검증) → 해상도 측정 → 규정 검사 실행 → 규격 변환으로 보내기.

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  filterAcceptedImageFiles,
  notifyRejectedImageFiles,
} from '@/shared/utils/imageFileValidation';
import { useImageHandoffStore } from '@/shared/store/imageHandoffStore';
import { trackEvent } from '@/shared/utils/analytics';
import { checkImage } from '../_utils/checkImage';
import { useImageCheckStore, type CheckJob } from '../_store/imageCheckStore';

// 해상도 측정 (규정 검사에 필요)
async function measureSize(source: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(source);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

export function useImageCheck() {
  const jobs = useImageCheckStore((state) => state.jobs);
  const router = useRouter();

  //////////////////// 파일 추가 → 즉시 검사 ////////////////////
  const addFiles = useCallback((files: File[] | FileList) => {
    const { jobs: currentJobs, addJobs, patchJob } = useImageCheckStore.getState();
    const { accepted, rejected } = filterAcceptedImageFiles(files, {
      count: currentJobs.length,
      totalBytes: currentJobs.reduce((sum, job) => sum + job.file.size, 0),
    });
    notifyRejectedImageFiles(rejected);
    if (accepted.length === 0) return;

    const newJobs: CheckJob[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalUrl: URL.createObjectURL(file),
      width: null,
      height: null,
      checks: [],
      overall: null,
    }));
    addJobs(newJobs);

    // 해상도 측정 후 검사 실행
    newJobs.forEach(async (job) => {
      try {
        const { width, height } = await measureSize(job.file);
        const { checks, overall } = checkImage(job.file, width, height);
        patchJob(job.id, { width, height, checks, overall });
      } catch (error) {
        console.error(error);
        patchJob(job.id, {
          overall: 'fail',
          checks: [{ key: 'decode', label: '이미지 판독', status: 'fail', message: '이미지를 읽을 수 없습니다.' }],
        });
      }
    });
  }, []);

  //////////////////// 삭제 / 초기화 ////////////////////
  const removeJob = useCallback((id: string) => {
    const { jobs: currentJobs, removeJob: removeFromStore } = useImageCheckStore.getState();
    const target = currentJobs.find((job) => job.id === id);
    if (target) URL.revokeObjectURL(target.originalUrl);
    removeFromStore(id);
  }, []);

  const clearAll = useCallback(() => {
    const { jobs: currentJobs, clearJobs } = useImageCheckStore.getState();
    currentJobs.forEach((job) => URL.revokeObjectURL(job.originalUrl));
    clearJobs();
  }, []);

  //////////////////// 규격 변환으로 보내기 (파이프라인) ////////////////////
  const sendToResize = useCallback(() => {
    const currentJobs = useImageCheckStore.getState().jobs;
    if (currentJobs.length === 0) return;
    useImageHandoffStore.getState().setImages(
      currentJobs.map((job) => ({ name: job.file.name, blob: job.file })),
    );
    trackEvent('handoff', { from: 'image-check', to: 'image-resize' });
    router.push('/image-resize');
  }, [router]);

  //////////////////// 언마운트 정리 ////////////////////
  useEffect(() => {
    return () => {
      const { jobs: currentJobs, clearJobs } = useImageCheckStore.getState();
      currentJobs.forEach((job) => URL.revokeObjectURL(job.originalUrl));
      clearJobs();
    };
  }, []);

  //////////////////// 파생 값 ////////////////////
  const passCount = jobs.filter((job) => job.overall === 'pass').length;
  const warnCount = jobs.filter((job) => job.overall === 'warn').length;
  const failCount = jobs.filter((job) => job.overall === 'fail').length;

  return { jobs, passCount, warnCount, failCount, addFiles, removeJob, clearAll, sendToResize };
}
