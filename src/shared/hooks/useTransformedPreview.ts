'use client';

//////////////////////////////////////// 즉석 변환 미리보기 훅 (공통) ////////////////////////////////////////
// 미리보기 모달에서 "현재 설정으로 처리했을 때의 예상 결과"를 보여주기 위해,
// 현재 슬라이드의 원본만 즉석 변환한다 (전체 미리 생성은 낭비 — 인덱스/설정 변경 시 재생성).

import { useEffect, useRef, useState } from 'react';

type PreviewSource = { id: string; blob: Blob };

type UseTransformedPreviewArgs<TSettings> = {
  activeIndex: number; // -1 = 닫힘
  sources: PreviewSource[];
  settings: TSettings;
  settingsKey: string; // 설정 변경 감지용 직렬화 키
  transform: (blob: Blob, settings: TSettings) => Promise<Blob>;
};

export function useTransformedPreview<TSettings>({
  activeIndex,
  sources,
  settings,
  settingsKey,
  transform,
}: UseTransformedPreviewArgs<TSettings>) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasError, setHasError] = useState(false);

  // 최신 값 참조 (transform/settings를 effect 의존성에서 제외해 불필요 재실행 방지)
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // 경쟁 상태 방지용 세대 카운터 + 현재 URL 보관
  const generationRef = useRef(0);
  const urlRef = useRef<string | null>(null);

  const activeSourceId = activeIndex >= 0 ? sources[activeIndex]?.id : undefined;

  useEffect(() => {
    const generation = ++generationRef.current;

    // 닫힘 또는 대상 없음 → 정리
    if (activeIndex < 0 || !activeSourceId) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setPreviewUrl(null);
      setHasError(false);
      setIsGenerating(false);
      return;
    }

    const source = sources[activeIndex];
    setIsGenerating(true);
    setHasError(false);

    (async () => {
      try {
        const resultBlob = await transformRef.current(source.blob, settingsRef.current);
        if (generation !== generationRef.current) return; // 이미 다음 요청이 시작됨
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(resultBlob);
        setPreviewUrl(urlRef.current);
      } catch (error) {
        console.error(error);
        if (generation !== generationRef.current) return;
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
          urlRef.current = null;
        }
        setPreviewUrl(null);
        setHasError(true);
      } finally {
        if (generation === generationRef.current) setIsGenerating(false);
      }
    })();
    // settingsKey가 설정 변경을 대표한다 (settings 객체 자체는 ref로 참조)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, activeSourceId, settingsKey]);

  // 언마운트 시 URL 정리
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  return { previewUrl, isGenerating, hasError };
}
