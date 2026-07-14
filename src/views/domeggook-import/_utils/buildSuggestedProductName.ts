//////////////////////////////////////// 추천 상품명 조합 ////////////////////////////////////////
// 태그 후보(공급사 키워드 + 상품명 토큰, 홍보어 제거됨)를 우선순위대로 이어붙여 권장 길이 안에서 조합.
// 검색량 데이터가 있으면 월간 검색수 내림차순 — 많이 찾는 키워드가 앞으로 (검색 노출 관행).

import type { KeywordStat } from '@/shared/types/keywordStats';
import { NAME_RECOMMENDED_LENGTH } from './validateProductName';

export function buildSuggestedProductName(
  tagCandidates: string[],
  tagStats: Map<string, KeywordStat> | null,
): string | null {
  if (tagCandidates.length === 0) return null;

  // 검색량 있으면 내림차순 정렬, 없으면 원 순서(공급사 키워드 우선) 유지
  const ordered = tagStats
    ? [...tagCandidates].sort((a, b) => {
        const searchesA = tagStats.get(a.replace(/\s+/g, ''))?.monthlySearches ?? 0;
        const searchesB = tagStats.get(b.replace(/\s+/g, ''))?.monthlySearches ?? 0;
        return searchesB - searchesA;
      })
    : tagCandidates;

  // 권장 길이 안에서 순서대로 연결 (중복 토큰은 이미 제거된 상태)
  const parts: string[] = [];
  let length = 0;
  for (const token of ordered) {
    const nextLength = length === 0 ? token.length : length + 1 + token.length;
    if (nextLength > NAME_RECOMMENDED_LENGTH) continue;
    parts.push(token);
    length = nextLength;
  }

  return parts.length >= 2 ? parts.join(' ') : null;
}
