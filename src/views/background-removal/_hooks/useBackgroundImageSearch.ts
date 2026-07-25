'use client';

//////////////////////////////////////// 배경 이미지 검색 훅 ////////////////////////////////////////
// 검색어·페이지·더보기 상태를 조율한다 (10개씩 로드, 서비스 경유).

import { useCallback, useRef, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import {
  searchBackgroundImages,
  type BackgroundImageItem,
} from '@/shared/services/backgroundImageSearch';

const PAGE_SIZE = 10;

export function useBackgroundImageSearch() {
  const [results, setResults] = useState<BackgroundImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 더보기용 현재 검색 컨텍스트
  const queryRef = useRef('');
  const pageRef = useRef(1);

  ////////// 새 검색 (1페이지부터 교체)
  const search = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;

    // 새 검색: 기존 결과를 먼저 비워 혼동 방지
    setResults([]);
    setHasMore(false);
    setIsLoading(true);
    setHasSearched(true);
    try {
      const { items, totalHits } = await searchBackgroundImages(query, 1);
      queryRef.current = query;
      pageRef.current = 1;
      setResults(items);
      setHasMore(PAGE_SIZE < totalHits);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('이미지 검색 중 오류가 발생했어요.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  ////////// 더보기 (다음 10개 이어붙임)
  const loadMore = useCallback(async () => {
    if (!queryRef.current) return;

    setIsLoading(true);
    try {
      const nextPage = pageRef.current + 1;
      const { items, totalHits } = await searchBackgroundImages(queryRef.current, nextPage);
      pageRef.current = nextPage;
      setResults((prev) => [...prev, ...items]);
      setHasMore(nextPage * PAGE_SIZE < totalHits);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('이미지를 더 불러오지 못했어요.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, hasMore, hasSearched, search, loadMore };
}
