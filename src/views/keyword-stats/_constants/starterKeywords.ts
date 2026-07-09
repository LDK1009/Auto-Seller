//////////////////////////////////////// 시작 키워드 큐레이션 (빈 화면용) ////////////////////////////////////////
// "뭘 쳐야 할지 모르는" 초보를 위한 첫 클릭 유도.
// ⚠️ 임시 큐레이션 — 도매꾹 인기검색어 API 승인 후 "셀러들이 지금 찾는 키워드"로 교체 예정 (백로그).
// 시즌은 월별 정적 맵 (수동 관리 없이 자동 순환).

////////// 월별 시즌 키워드 (1~12월)
const SEASONAL_KEYWORDS_BY_MONTH: Record<number, string[]> = {
  1: ['목도리', '핫팩', '가습기', '방한 장갑', '수면양말'],
  2: ['졸업 꽃다발', '신학기 가방', '필통', '이사 정리함', '공기청정기'],
  3: ['미세먼지 마스크', '봄 자켓', '등산 스틱', '피크닉 매트', '화분'],
  4: ['캠핑 의자', '자외선 차단 토시', '피크닉 도시락', '운동화 세탁', '벚꽃 소품'],
  5: ['캠핑 랜턴', '선물 카네이션', '어린이 장난감', '휴대용 선풍기', '모기장'],
  6: ['제습기', '장마 우산', '레인부츠', '차량용 햇빛가리개', '아쿠아슈즈'],
  7: ['넥쿨러', '손선풍기', '물놀이 튜브', '캠핑 타프', '쿨매트'],
  8: ['휴가 캐리어', '방수팩', '아이스박스', '모기 퇴치기', '쿨토시'],
  9: ['추석 선물세트', '등산 배낭', '가을 니트', '차박 매트', '보온병'],
  10: ['핼러윈 소품', '전기요', '단풍 캠핑', '가을 자켓', '무릎담요'],
  11: ['수능 선물', '전기히터', '패딩 조끼', '김장 매트', '온수매트'],
  12: ['크리스마스 트리', '연말 선물', '방한 부츠', '눈썰매', '어그 슬리퍼'],
};

////////// 스테디 소싱 키워드 (계절 무관 위탁 단골 카테고리)
export const STEADY_KEYWORDS = ['주방 수납', '차량용 거치대', '반려동물 장난감', '욕실 선반', '무선 청소솔'];

////////// 이번 달 시즌 키워드
export function getSeasonalKeywords(): string[] {
  const month = new Date().getMonth() + 1;
  return SEASONAL_KEYWORDS_BY_MONTH[month] ?? [];
}

////////// 최근 검색 기록 (localStorage)
const RECENT_STORAGE_KEY = 'keyword-stats-recent';
export const RECENT_MAX = 8;

export function loadRecentKeywords(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

export function saveRecentKeyword(keyword: string): string[] {
  const next = [keyword, ...loadRecentKeywords().filter((entry) => entry !== keyword)].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장 실패는 무시 (프라이빗 모드 등)
  }
  return next;
}
