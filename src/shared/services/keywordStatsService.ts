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
