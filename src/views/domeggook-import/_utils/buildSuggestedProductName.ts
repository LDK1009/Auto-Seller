//////////////////////////////////////// 추천 상품명 조합 ////////////////////////////////////////
// 규칙 기반 조합 (AI 미사용). 소스 = 도매꾹 공급사 키워드만 (2026-07-14 결정 —
// 상품명 토큰은 상호·판촉 문구 등 노이즈가 많아 폐기).
// 1) 홍보어 제거
// 2) 동의어 정리 — 부분 포함 관계 토큰은 대표 1개만 (검색량 조회 시 검색량, 미조회 시 더 구체적인 쪽)
// 3) 정렬 — 검색량 내림차순 (미조회 시 공급사 등록 순서), 숫자 속성 토큰은 뒤로
// 4) 권장 길이(35자) 안에서 순서대로 연결, 초과 토큰은 건너뜀

import type { KeywordStat } from '@/shared/types/keywordStats';
import { NAME_RECOMMENDED_LENGTH, PROMO_WORDS } from './validateProductName';

// 두 문자열의 최장 공통 부분 문자열 길이 (대표 키워드 연관성 판정용)
function longestCommonSubstringLength(a: string, b: string): number {
  let best = 0;
  for (let start = 0; start < a.length; start += 1) {
    for (let end = start + best + 1; end <= a.length; end += 1) {
      if (b.includes(a.slice(start, end))) best = end - start;
      else break;
    }
  }
  return best;
}

////////// 키워드 풀 — 정제·동의어 정리·정렬까지 (직접 조합 UI에서 재사용)
export function buildNameTokenPool(
  supplierKeywords: string[],
  tagStats: Map<string, KeywordStat> | null,
): string[] {
  const searchesOf = (token: string) => tagStats?.get(token.replace(/\s+/g, ''))?.monthlySearches ?? 0;

  // 1) 중복 + 홍보어 제거
  const cleaned = Array.from(new Set(supplierKeywords.map((keyword) => keyword.trim()).filter(Boolean))).filter(
    (token) => !PROMO_WORDS.some((word) => token.toLowerCase().includes(word.toLowerCase())),
  );

  // 1.5) 대표 키워드 연관 필터 — 도매꾹 keywords[0]이 대표 키워드 (실측: 5개 중 4개 명확)
  // 대표와 2글자 이상 연속으로 겹치는 키워드만 유지 (우산 ~ 골프우산 ○ / 포장박스·자외선차단 ×)
  // 단순 포함이 아닌 공통 부분 문자열 비교 — 대표가 "장우산"일 때 "uv우산"도 살리기 위함
  const representative = cleaned[0];
  const related = representative
    ? cleaned.filter(
        (token) => token === representative || longestCommonSubstringLength(representative, token) >= 2,
      )
    : cleaned;
  // 필터가 과하게 걸러내면(대표만 남으면) 노이즈 감수하고 전체 유지
  const pool = related.length >= 2 ? related : cleaned;

  // 2) 동의어 정리 — 포함 관계 그룹당 대표 1개 (검색량 > 길이(구체성) > 앞 순서)
  const representativeScore = (token: string) => (tagStats ? searchesOf(token) : token.length);
  const deduped = pool.filter((token, index) => {
    return !pool.some((other, otherIndex) => {
      if (other === token) return false;
      const related = other.includes(token) || token.includes(other);
      if (!related) return false;
      const scoreOther = representativeScore(other);
      const scoreToken = representativeScore(token);
      return scoreOther > scoreToken || (scoreOther === scoreToken && otherIndex < index);
    });
  });

  // 3) 정렬 — 검색량순 (미조회 시 공급사 등록 순서), 숫자 속성 토큰은 뒤로
  const ordered = tagStats ? [...deduped].sort((a, b) => searchesOf(b) - searchesOf(a)) : deduped;
  const textTokens = ordered.filter((token) => !/\d/.test(token));
  const numericTokens = ordered.filter((token) => /\d/.test(token));
  return [...textTokens, ...numericTokens];
}

////////// 권장 길이 안에서 순서대로 연결 (초과 토큰은 건너뜀) — 랜덤 조합에서도 재사용
export function composeWithinLength(tokens: string[]): string | null {
  const parts: string[] = [];
  let length = 0;
  for (const token of tokens) {
    const nextLength = length === 0 ? token.length : length + 1 + token.length;
    if (nextLength > NAME_RECOMMENDED_LENGTH) continue;
    parts.push(token);
    length = nextLength;
  }
  return parts.length >= 2 ? parts.join(' ') : null;
}
