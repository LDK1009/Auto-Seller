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

////////// 시작 키워드 (빈 화면 랭킹 표) — Supabase 직접 읽기
// 계산·저장은 새벽 크론(/api/starter-keywords/warm)이 담당, 여기선 테이블 SELECT만 (읽기 공개 RLS).
import type { StarterKeywordsResponse } from '@/shared/types/keywordStats';
import { getSupabaseClient } from './supabase';

export async function fetchStarterKeywords(category: string = 'all'): Promise<StarterKeywordsResponse> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { configured: false, seasonal: [], steady: [] }; // Supabase 미설정 — 준비 중 강등
  }
  const { data, error } = await supabase
    .from('starter_keywords_cache')
    .select('payload')
    .eq('category', category)
    .maybeSingle();
  if (error) {
    console.error(error);
    throw new Error('시작 키워드 조회에 실패했습니다.');
  }
  const payload = (data?.payload ?? { seasonal: [], steady: [] }) as {
    seasonal: KeywordStat[];
    steady: KeywordStat[];
  };
  return { configured: true, seasonal: payload.seasonal ?? [], steady: payload.steady ?? [] };
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

////////// AI 판단 (로그인 필요 — 일일 무료 제한)
import type { AiVerdictResponse } from '@/shared/types/keywordVerdict';
import type { KeywordStat } from '@/shared/types/keywordStats';

export async function fetchAiVerdict(params: {
  keyword: string;
  stat: KeywordStat;
  detail: KeywordDetail | null;
  accessToken: string;
}): Promise<AiVerdictResponse> {
  const response = await fetch('/api/keyword-verdict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({ keyword: params.keyword, stat: params.stat, detail: params.detail }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? 'AI 판단에 실패했습니다.');
  }
  return body as AiVerdictResponse;
}

////////// 스스 카테고리 후보 (상품명 → 네이버쇼핑 상위 상품 카테고리 최빈값 + 제목 토큰)
export type CategoryCandidate = { path: string; count: number; sampleSize: number };
export type TitleToken = { token: string; count: number }; // 경쟁 상품 제목 빈출 단어

export async function fetchCategorySuggest(
  query: string,
): Promise<{ configured: boolean; candidates: CategoryCandidate[]; titleTokens: TitleToken[] }> {
  const response = await fetch(`/api/category-suggest?q=${encodeURIComponent(query)}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? '카테고리 후보 조회에 실패했습니다.');
  }
  return { ...body, titleTokens: body?.titleTokens ?? [] };
}
