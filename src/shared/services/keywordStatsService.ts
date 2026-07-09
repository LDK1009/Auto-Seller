//////////////////////////////////////// 키워드 통계 서비스 ////////////////////////////////////////
// 서버 프록시(/api/keyword-stats) 호출 전담 — 월간 검색수·경쟁도·상품 수.

import type { KeywordStatsResponse } from '@/shared/types/keywordStats';

export async function fetchKeywordStats(keywords: string[]): Promise<KeywordStatsResponse> {
  const query = encodeURIComponent(keywords.join(','));
  const response = await fetch(`/api/keyword-stats?keywords=${query}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? '검색량 조회에 실패했습니다.');
  }
  return body as KeywordStatsResponse;
}

////////// 스스 카테고리 후보 (상품명 → 네이버쇼핑 상위 상품 카테고리 최빈값)
export type CategoryCandidate = { path: string; count: number; sampleSize: number };

export async function fetchCategorySuggest(
  query: string,
): Promise<{ configured: boolean; candidates: CategoryCandidate[] }> {
  const response = await fetch(`/api/category-suggest?q=${encodeURIComponent(query)}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? '카테고리 후보 조회에 실패했습니다.');
  }
  return body;
}
