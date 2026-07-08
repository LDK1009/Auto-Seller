'use client';

//////////////////////////////////////// 도매꾹 상품 조회 훅 ////////////////////////////////////////
// 링크/상품번호 입력 → 파싱 → 서비스 호출 → 조회 상태 관리.

import { useState } from 'react';
import { fetchDomemeItem } from '@/shared/services/domemeItemService';
import type { DomemeItem } from '@/shared/types/domeme';
import { parseDomemeProductNo } from '../_utils/parseDomemeUrl';

type LookupStatus = 'idle' | 'loading' | 'loaded' | 'error';

export function useDomemeItem() {
  const [status, setStatus] = useState<LookupStatus>('idle');
  const [item, setItem] = useState<DomemeItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 성공 시 조회된 상품을 반환한다 (호출부가 기본 선택 등 후처리에 사용)
  const lookup = async (rawInput: string): Promise<DomemeItem | null> => {
    const productNo = parseDomemeProductNo(rawInput);
    if (!productNo) {
      setStatus('error');
      setErrorMessage('도매꾹 상품 링크 또는 상품번호를 확인해주세요. 예) https://domeggook.com/12345678');
      return null;
    }

    setStatus('loading');
    setErrorMessage(null);
    setItem(null);
    try {
      const fetched = await fetchDomemeItem(productNo);
      setItem(fetched);
      setStatus('loaded');
      return fetched;
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : '상품 정보를 불러오지 못했습니다.');
      setStatus('error');
      return null;
    }
  };

  const reset = () => {
    setStatus('idle');
    setItem(null);
    setErrorMessage(null);
  };

  return { status, item, errorMessage, lookup, reset };
}
