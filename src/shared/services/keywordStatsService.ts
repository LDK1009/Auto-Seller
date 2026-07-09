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

////////// 키워드 상세 분석 (종합차트 — 온디맨드)
import type { KeywordDetail } from '@/shared/types/keywordDetail';

export async function fetchKeywordDetail(keyword: string): Promise<KeywordDetail> {
  const response = await fetch(`/api/keyword-detail?keyword=${encodeURIComponent(keyword)}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? '상세 분석 조회에 실패했습니다.');
  }
  return body as KeywordDetail;
}

////////// 연관 키워드 상품 수 일괄 조회 (경쟁강도 계산용 — 검색수는 연관 풀에 이미 있음)
export async function fetchRelatedCompetition(keywords: string[]): Promise<Record<string, number | null>> {
  const query = encodeURIComponent(keywords.join(','));
  const response = await fetch(`/api/keyword-competition?keywords=${query}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? '연관 키워드 조회에 실패했습니다.');
  }
  return (body?.counts ?? {}) as Record<string, number | null>;
}

////////// 키워드 비교 (첫 번째 = 기준 키워드, 합계 2~5개)
import type { KeywordCompareResponse } from '@/shared/types/keywordCompare';

export async function fetchKeywordCompare(keywords: string[]): Promise<KeywordCompareResponse> {
  const query = encodeURIComponent(keywords.join(','));
  const response = await fetch(`/api/keyword-compare?keywords=${query}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? '키워드 비교에 실패했습니다.');
  }
  return body as KeywordCompareResponse;
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
