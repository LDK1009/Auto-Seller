'use client';

//////////////////////////////////////// 셀러 고정값 훅 (A/S 정보) ////////////////////////////////////////
// 상품이 바뀌어도 동일한 값(A/S 전화·안내)을 브라우저 localStorage에 저장해 재사용한다.
// 무가입 원칙 유지 — 서버 저장 없음, 브라우저를 바꾸면 재입력 필요.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'auto-seller-fixed-info';

export type SellerFixedInfo = {
  afterServicePhone: string;
  afterServiceGuide: string;
};

const EMPTY_INFO: SellerFixedInfo = {
  afterServicePhone: '',
  afterServiceGuide: '',
};

export function useSellerFixedInfo() {
  const [fixedInfo, setFixedInfo] = useState<SellerFixedInfo>(EMPTY_INFO);

  // 마운트 후 복원 (SSR 하이드레이션 불일치 방지)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setFixedInfo({ ...EMPTY_INFO, ...JSON.parse(stored) });
    } catch (error) {
      console.error(error);
    }
  }, []);

  const updateFixedInfo = (patch: Partial<SellerFixedInfo>) => {
    setFixedInfo((prev) => {
      const next = { ...prev, ...patch };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { fixedInfo, updateFixedInfo };
}
