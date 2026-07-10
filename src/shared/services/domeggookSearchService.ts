//////////////////////////////////////// 도매꾹 검색 서비스 ////////////////////////////////////////
// 서버 프록시(/api/domeggook-search·categories) 호출 전담.

import type {
  DomeggookCategoriesResponse,
  DomeggookSearchParams,
  DomeggookSearchResponse,
} from '@/shared/types/domeggookSearch';

export async function fetchDomeggookSearch(params: DomeggookSearchParams): Promise<DomeggookSearchResponse> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('kw', params.keyword);
  if (params.category) query.set('ca', params.category);
  if (params.sort) query.set('so', params.sort);
  if (params.page && params.page > 1) query.set('pg', String(params.page));
  if (params.minPrice && params.minPrice > 0) query.set('mnp', String(params.minPrice));
  if (params.maxPrice && params.maxPrice > 0) query.set('mxp', String(params.maxPrice));
  if (params.singleUnit) query.set('single', '1');
  if (params.freeShipping) query.set('free', '1');
  if (params.lowestPriceOnly) query.set('lwp', '1');
  if (params.fastShipping) query.set('fdl', '1');
  if (params.excludeOversea) query.set('nooversea', '1');

  const response = await fetch(`/api/domeggook-search?${query.toString()}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? '검색에 실패했습니다.');
  }
  return body as DomeggookSearchResponse;
}

export async function fetchDomeggookCategories(): Promise<DomeggookCategoriesResponse> {
  const response = await fetch('/api/domeggook-categories');
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? '카테고리 조회에 실패했습니다.');
  }
  return body as DomeggookCategoriesResponse;
}
