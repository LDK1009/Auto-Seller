'use client';

//////////////////////////////////////// 랜딩 베스트 상품 훅 ////////////////////////////////////////
// 도매꾹 인기순(so=ha)·낱개 구매 가능 풀 24개를 받아 8개씩 로테이션 표시.
// 실패·미설정 시 빈 배열 — 랜딩 보조 섹션이라 조용히 숨긴다 (에러 토스트 없음).

import { useEffect, useRef, useState } from 'react';
import { fetchDomeggookSearch } from '@/shared/services/domeggookSearchService';
import type { DomeggookSearchItem } from '@/shared/types/domeggookSearch';

const POOL_SIZE = 24;
export const BEST_DISPLAY_COUNT = 8;

export function useBestProducts() {
  const [pool, setPool] = useState<DomeggookSearchItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    (async () => {
      try {
        const response = await fetchDomeggookSearch({
          sort: 'ha',
          singleUnit: true, // 낱개 구매 가능만 — "클릭했더니 대량 구매 전용" 실망 방지
          pageSize: POOL_SIZE,
        });
        setPool(response.items.filter((item) => !item.isBusinessOnly));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // 현재 오프셋부터 8개 — 끝에 걸치면 앞에서 이어 채움 (풀 순환)
  const sliced = pool.slice(offset, offset + BEST_DISPLAY_COUNT);
  const shortfall = BEST_DISPLAY_COUNT - sliced.length;
  const products = shortfall > 0 && pool.length > 0 ? [...sliced, ...pool.slice(0, shortfall)] : sliced;

  const rotate = () => {
    if (pool.length <= BEST_DISPLAY_COUNT) return;
    setOffset((previous) => (previous + BEST_DISPLAY_COUNT) % pool.length);
  };

  const canRotate = pool.length > BEST_DISPLAY_COUNT;

  // 히어로 목업용 대표 상품 1개 (인기 1위) — 실제 상품 썸네일로 시선을 잡는다
  const featuredProduct = pool[0] ?? null;

  return { products, isLoading, rotate, canRotate, featuredProduct };
}
