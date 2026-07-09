//////////////////////////////////////// 키워드 통계 타입 (API 라우트 ↔ 클라이언트 공유) ////////////////////////////////////////

export type KeywordStat = {
  keyword: string;
  monthlySearches: number | null; // 월간 검색수 (PC+모바일 합, "<10"은 9로 수치화)
  isLowVolume: boolean; // 검색량 10 미만 (네이버가 "< 10"으로 반환)
  competition: string | null; // 경쟁정도 원문 (높음/중간/낮음)
  productCount: number | null; // 네이버쇼핑 등록 상품 수
  ratio: number | null; // 경쟁강도 = 상품수 ÷ 월간 검색수 (낮을수록 틈새)
  monthlyClicks: number | null; // 월평균 클릭수 (PC+모바일 — 검색이 클릭으로 이어지는 양)
  avgCtr: number | null; // 월평균 클릭률 % (PC/모바일 평균)
  category: string | null; // 최빈 카테고리 경로 (쇼핑 상위 10개 기준, "대분류 > 중분류")
};

// 연관 키워드 (keywordstool이 덤으로 주는 목록 — 검색량만 있고 상품수는 미조회)
export type RelatedKeyword = {
  keyword: string;
  monthlySearches: number;
  isLowVolume: boolean;
  competition: string | null;
};

export type KeywordStatsResponse = {
  configured: boolean; // 서버에 키가 설정돼 있는지 — false면 UI는 발급 안내 표시
  stats: KeywordStat[];
  related: RelatedKeyword[]; // 연관 키워드 (검색량 내림차순, 최대 30개)
};
