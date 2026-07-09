//////////////////////////////////////// 키워드 상세 분석 타입 (종합차트) ////////////////////////////////////////

export type TrendPoint = { period: string; ratio: number }; // 월별 상대지수 (기간 내 최대 = 100)

export type KeywordDetail = {
  configured: boolean;
  keyword: string;
  //////////////////// ①② 트렌드·시즌성 ////////////////////
  trend: TrendPoint[]; // 최근 12개월
  trendDirection: 'up' | 'flat' | 'down' | null; // 최근 3개월 vs 이전 3개월
  seasonality: {
    isSeasonal: boolean;
    peakMonths: number[]; // 1~12
    label: string | null; // "매년 9~10월 집중" 등
    isInSeason: boolean; // 현재 월이 피크 구간인가
  };
  //////////////////// ③④⑤⑥ 누가 검색하나 ////////////////////
  deviceRatio: { pc: number; mobile: number } | null; // % (검색광고 PC/모바일 검색수 기반 — 절대치라 정확)
  genderRatio: { male: number; female: number } | null; // % (쇼핑인사이트 — 쇼핑 클릭 기준)
  ageRatio: { label: string; percent: number }[] | null; // 연령대별 % (쇼핑인사이트)
  weekdayRatio: number[] | null; // 월~일 7개, 합 100 (%) — 최근 90일 일별 지수의 요일 평균
  //////////////////// ⑦⑧⑨⑩ 시장 상황 ////////////////////
  priceBand: { min: number; median: number; max: number } | null; // 상위 40개 최저가 분포
  brandShare: number | null; // 상위 40개 중 브랜드 상품 비율 %
  strictProductCount: number | null; // 중고·렌탈·해외직구 제외 상품 수
  blogCount: number | null; // 블로그 문서 수
  cafeCount: number | null; // 카페 글 수
  //////////////////// ⑪⑫ 카테고리·쇼핑 클릭 (쇼핑인사이트) ////////////////////
  categoryName: string | null; // 판별된 대분류 (쇼핑 상위 상품 최빈값)
  categorySeason: string | null; // 카테고리 수요 피크 라벨 ("7~8월 성수기" 등)
  shoppingClickTrend: TrendPoint[]; // 12개월 쇼핑 클릭 추이 (검색 트렌드 보조선)
};
