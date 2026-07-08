//////////////////////////////////////// 키워드 통계 타입 (API 라우트 ↔ 클라이언트 공유) ////////////////////////////////////////

export type KeywordStat = {
  keyword: string;
  monthlySearches: number | null; // 월간 검색수 (PC+모바일 합, "<10"은 9로 수치화)
  isLowVolume: boolean; // 검색량 10 미만 (네이버가 "< 10"으로 반환)
  competition: string | null; // 경쟁정도 원문 (높음/중간/낮음)
  productCount: number | null; // 네이버쇼핑 등록 상품 수
  ratio: number | null; // 경쟁강도 = 상품수 ÷ 월간 검색수 (낮을수록 틈새)
};

export type KeywordStatsResponse = {
  configured: boolean; // 서버에 키가 설정돼 있는지 — false면 UI는 발급 안내 표시
  stats: KeywordStat[];
};
