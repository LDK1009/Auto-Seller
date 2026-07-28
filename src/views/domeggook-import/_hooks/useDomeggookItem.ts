'use client';

//////////////////////////////////////// 도매꾹 상품 조회 훅 ////////////////////////////////////////
// 링크/상품번호 입력 → 파싱 → 서비스 호출 → 조회 상태 관리.

import { useState } from 'react';
import { fetchDomeggookItem, DomeggookItemError } from '@/shared/services/domeggookItemService';
import type { DomeggookItem } from '@/shared/types/domeggook';
import type { LookupFailReason } from '@/shared/utils/analytics';
import { parseDomeggookProductNo } from '../_utils/parseDomeggookUrl';

type LookupStatus = 'idle' | 'loading' | 'loaded' | 'error';

////////// 실패 사유 분류 — GA4 domeggook_lookup { reason }
// "왜 못 들어왔는가"를 분해하기 위한 것. 사용자 입력 문제(url_parse)와
// 우리/도매꾹 문제(api_error)를 섞으면 이탈 원인 판정이 불가능해진다.
function classifyFailure(error: unknown): LookupFailReason {
  if (error instanceof DomeggookItemError) {
    if (error.status === 0) return 'network';
    if (error.status === 404) return 'not_found';
    return 'api_error'; // 400·500·502 등
  }
  return 'network';
}

export type LookupResult = { item: DomeggookItem | null; reason: LookupFailReason };

export function useDomeggookItem() {
  const [status, setStatus] = useState<LookupStatus>('idle');
  const [item, setItem] = useState<DomeggookItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 성공 시 조회된 상품을, 실패 시 사유를 함께 반환한다 (호출부가 기본 선택·계측에 사용)
  const lookup = async (rawInput: string): Promise<LookupResult> => {
    const productNo = parseDomeggookProductNo(rawInput);
    if (!productNo) {
      setStatus('error');
      setErrorMessage('도매꾹 상품 링크 또는 상품번호를 확인해주세요. 예) https://domeggook.com/12345678');
      return { item: null, reason: 'url_parse' };
    }

    setStatus('loading');
    setErrorMessage(null);
    setItem(null);
    try {
      const fetched = await fetchDomeggookItem(productNo);
      setItem(fetched);
      setStatus('loaded');
      return { item: fetched, reason: 'none' };
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : '상품 정보를 불러오지 못했어요.');
      setStatus('error');
      return { item: null, reason: classifyFailure(error) };
    }
  };

  const reset = () => {
    setStatus('idle');
    setItem(null);
    setErrorMessage(null);
  };

  return { status, item, errorMessage, lookup, reset };
}
