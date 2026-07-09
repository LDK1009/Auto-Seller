//////////////////////////////////////// 키워드 비교 타입 (API 라우트 ↔ 클라이언트 공유) ////////////////////////////////////////
// 트렌드는 데이터랩 "단일 요청" 다중 그룹으로 수집 — 같은 응답 안에서만 스케일 비교가 유효하다.

import type { TrendPoint } from '@/shared/types/keywordDetail';

export type CompareEntry = {
  keyword: string;
  monthlySearches: number | null; // 월간 검색수 (PC+모바일, "<10"은 9)
  isLowVolume: boolean;
  monthlyClicks: number | null; // 월평균 클릭수
  avgCtr: number | null; // 월평균 클릭률 %
  productCount: number | null; // 등록 상품 수
  ratio: number | null; // 경쟁강도 = 상품수 ÷ 검색수
  deviceRatio: { pc: number; mobile: number } | null; // 기기 비율 % (검색광고 절대치)
  genderRatio: { male: number; female: number } | null; // 성별 비율 % (쇼핑인사이트)
  ageTop: string | null; // 연령 1위 (예: "40대 54%")
  trend: TrendPoint[]; // 12개월 — 응답 내 키워드 간 동일 스케일
};

export type KeywordCompareResponse = {
  configured: boolean;
  entries: CompareEntry[]; // 요청 순서 유지 (첫 번째 = 기준 키워드)
};
