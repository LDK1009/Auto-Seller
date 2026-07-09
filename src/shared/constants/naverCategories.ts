//////////////////////////////////////// 네이버쇼핑 공식 대분류 (전역 공유) ////////////////////////////////////////
// 데이터랩 쇼핑인사이트 분야(1depth) = shop.json category1 체계 (실측 검증 07-09).
// 시작 키워드 카테고리 필터(서버·클라이언트)가 공유한다.

export const NAVER_TOP_CATEGORIES = [
  '패션의류',
  '패션잡화',
  '화장품/미용',
  '디지털/가전',
  '가구/인테리어',
  '출산/육아',
  '식품',
  '스포츠/레저',
  '생활/건강',
  '여가/생활편의',
] as const;

export type NaverTopCategory = (typeof NAVER_TOP_CATEGORIES)[number];
