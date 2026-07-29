//////////////////////////////////////// 크레딧·감시 클라이언트 서비스 ////////////////////////////////////////
// 서버 API 호출 전담 (컴포넌트는 훅 경유로만 사용).

import type { CreditPackId } from '@/shared/constants/billing';

export type CreditTransaction = {
  id: string;
  amount: number;
  kind: 'signup' | 'subscription' | 'purchase' | 'spend' | 'refund';
  feature: string | null;
  balance_after: number;
  created_at: string;
};

export type CreditSummary = {
  configured: boolean;
  balance: number;
  transactions: CreditTransaction[];
};

////////// 내 크레딧 (최초 호출 시 가입 보너스 지급)
export async function fetchCredits(accessToken: string): Promise<CreditSummary> {
  const response = await fetch('/api/credits', { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? '크레딧 정보를 불러오지 못했어요.');
  return body as CreditSummary;
}

////////// 크레딧 충전 (등록된 카드로 즉시 결제)
export async function purchaseCredits(accessToken: string, packId: CreditPackId): Promise<{ balance: number }> {
  const response = await fetch('/api/credits/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ packId }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? '충전에 실패했어요.');
  return body as { balance: number };
}

//////////////////// 품절 감시 ////////////////////
export type WatchItem = {
  id: string;
  product_no: string;
  title: string;
  thumb_url: string | null;
  last_status: 'in_stock' | 'sold_out' | 'unavailable' | null;
  last_checked_at: string | null;
  notified_at: string | null;
  created_at: string;
};

export type WatchListResponse = {
  subscribed: boolean;
  limit: number;
  items: WatchItem[];
};

export async function fetchWatchList(accessToken: string): Promise<WatchListResponse> {
  const response = await fetch('/api/watch', { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? '감시 목록을 불러오지 못했어요.');
  return body as WatchListResponse;
}

export async function addWatch(
  accessToken: string,
  product: { productNo: string; title: string; thumbUrl?: string | null },
): Promise<void> {
  const response = await fetch('/api/watch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(product),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? '감시 추가에 실패했어요.');
}

export async function removeWatch(accessToken: string, productNo: string): Promise<void> {
  const response = await fetch(`/api/watch?productNo=${encodeURIComponent(productNo)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? '감시 해제에 실패했어요.');
}
