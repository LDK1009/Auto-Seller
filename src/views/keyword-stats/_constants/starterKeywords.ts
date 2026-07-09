//////////////////////////////////////// 최근 검색 기록 (localStorage) ////////////////////////////////////////
// 시작 키워드 큐레이션 상수는 실데이터 파이프라인(/api/starter-keywords)으로 대체됨 (07-09).

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
