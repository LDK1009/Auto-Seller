//////////////////////////////////////// 상품명 채점 ////////////////////////////////////////
// 100점 = 기본 검사 70점 + 검색량 30점.
// - 기본 70: 길이 20 · 홍보 문구 15 · 특수문자 10 · 지재권 10 · 중복 단어 8 · 동의어 반복 7
//   (validateProductName 결과를 감점으로 변환 — 칩에 뜨는 문제와 점수 근거가 1:1)
// - 검색량 30: 검색량 있는 키워드 포함 비율 20 · 핵심(최다 검색) 키워드 앞배치 10
//   → 검색량 미조회 시 70점 만점으로 환산해 표시하고 UI가 안내

import type { KeywordStat } from '@/shared/types/keywordStats';
import type { NameCheckResult } from './validateProductName';

// 검사 항목별 감점 (fail은 전액, warn은 항목별 지정)
const BASE_TOTAL = 70;
const SEARCH_TOTAL = 30;
const DEDUCTIONS: Record<string, { warn: number; fail: number }> = {
  길이: { warn: 12, fail: 20 },
  '특수문자': { warn: 10, fail: 10 },
  '홍보 문구': { warn: 15, fail: 15 },
  '지재권 위험': { warn: 10, fail: 10 },
  '중복 단어': { warn: 8, fail: 8 },
  '동의어 반복': { warn: 7, fail: 7 },
};

export type ProductNameGrade = 'good' | 'ok' | 'bad';

export type ProductNameScore = {
  normalized: number; // 0~100 (검색량 미조회 시 70점 만점 환산)
  grade: ProductNameGrade; // 80+ good / 50+ ok / 미만 bad
  hasSearchPart: boolean; // 검색량 반영 여부
};

export function scoreProductName(
  name: string,
  nameChecks: NameCheckResult[],
  tagStats: Map<string, KeywordStat> | null,
): ProductNameScore {
  ////////// 기본 검사 70점 — 검사 결과를 감점으로 변환
  let baseScore = BASE_TOTAL;
  for (const check of nameChecks) {
    if (check.level === 'pass') continue;
    const deduction = DEDUCTIONS[check.label];
    if (deduction) baseScore -= deduction[check.level];
  }
  baseScore = Math.max(0, baseScore);

  ////////// 검색량 30점 — 조회된 경우에만
  const hasSearchPart = tagStats !== null && tagStats.size > 0;
  let searchScore = 0;
  if (hasSearchPart) {
    const tokens = Array.from(
      new Set(
        name
          .split(/\s+/)
          .map((token) => token.replace(/[^가-힣a-zA-Z0-9]/g, ''))
          .filter((token) => token.length >= 2),
      ),
    );
    const searchesOf = (token: string) => tagStats.get(token.replace(/\s+/g, ''))?.monthlySearches ?? 0;

    // 포함 20점 — 검색량 있는 키워드 비율
    const hitCount = tokens.filter((token) => searchesOf(token) > 0).length;
    searchScore += tokens.length > 0 ? Math.round((hitCount / tokens.length) * 20) : 0;

    // 앞배치 10점 — 첫 토큰이 상품명 내 최다 검색 키워드면 10, 상위 3위 안이면 6
    const ranked = [...tokens].sort((a, b) => searchesOf(b) - searchesOf(a));
    const firstToken = tokens[0];
    if (firstToken && searchesOf(firstToken) > 0) {
      const rank = ranked.indexOf(firstToken);
      if (rank === 0) searchScore += 10;
      else if (rank <= 2) searchScore += 6;
    }
  }

  ////////// 정규화 — 미조회 시 70점 만점 기준으로 환산
  const rawScore = baseScore + searchScore;
  const maxScore = hasSearchPart ? BASE_TOTAL + SEARCH_TOTAL : BASE_TOTAL;
  const normalized = Math.round((rawScore / maxScore) * 100);

  const grade: ProductNameGrade = normalized >= 80 ? 'good' : normalized >= 50 ? 'ok' : 'bad';
  return { normalized, grade, hasSearchPart };
}
