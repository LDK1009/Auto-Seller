//////////////////////////////////////// 등록 상품 저장 서비스 (내 목록 — 품절 감시 라인 2·3) ////////////////////////////////////////
// saved_products 테이블 (RLS — 본인 행만). 무료 개수 제한은 코드에서 관리.

import { getSupabaseClient } from './supabase';
import type { DomeggookItem } from '@/shared/types/domeggook';

export const SAVED_PRODUCTS_FREE_LIMIT = 50; // 무료 저장 한도 (초과 정책은 유료 설계 시 확정)

// DB 스키마 그대로 (snake_case) — 실측 2026-07-24
export type SavedProduct = {
  id: string;
  user_id: string;
  product_no: string;
  title: string;
  thumb_url: string | null;
  dome_price: number | null;
  created_at: string;
};

////////// 내 목록 조회 (최신순)
export async function fetchSavedProducts(): Promise<SavedProduct[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('saved_products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    throw new Error('저장 목록을 불러오지 못했습니다.');
  }
  return (data ?? []) as SavedProduct[];
}

////////// 저장 (중복 = 도매꾹 상품번호 기준 무시, 한도 검사)
export async function saveProduct(item: DomeggookItem): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('저장 기능 준비 중입니다.');

  const { count, error: countError } = await supabase
    .from('saved_products')
    .select('id', { count: 'exact', head: true });
  if (countError) {
    console.error(countError);
    throw new Error('저장에 실패했습니다.');
  }
  if ((count ?? 0) >= SAVED_PRODUCTS_FREE_LIMIT) {
    throw new Error(`저장은 최대 ${SAVED_PRODUCTS_FREE_LIMIT}개까지 가능합니다. 목록에서 안 쓰는 상품을 정리해주세요.`);
  }

  const thumb = item.images.find((image) => image.kind === 'thumb');
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('로그인이 필요합니다.');

  const { error } = await supabase.from('saved_products').upsert(
    {
      user_id: userData.user.id,
      product_no: item.no,
      title: item.title,
      thumb_url: thumb?.url ?? null,
      dome_price: item.domePrice,
    },
    { onConflict: 'user_id,product_no' },
  );
  if (error) {
    console.error(error);
    throw new Error('저장에 실패했습니다.');
  }
}

////////// 삭제
export async function removeSavedProduct(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.from('saved_products').delete().eq('id', id);
  if (error) {
    console.error(error);
    throw new Error('삭제에 실패했습니다.');
  }
}

//////////////////// 일괄 품절 확인 (라인 3 — 버튼 눌러야 조회, 서버 상시 가동 없음) ////////////////////
// 기존 /api/domeggook-item 재사용 (서버 1h 캐시) — 동시 4개 제한으로 순차 배치
export type StockCheckResult = {
  product_no: string;
  inventory: number | null;
  saleStatus: string | null;
  isSoldOut: boolean; // 재고 0 또는 판매중 아님
  failed: boolean; // 조회 실패 (판매 종료로 상품 자체가 내려간 경우 포함)
};

const STOCK_CHECK_CONCURRENCY = 4;

export async function checkProductsStock(
  productNos: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, StockCheckResult>> {
  const results = new Map<string, StockCheckResult>();
  let done = 0;

  for (let index = 0; index < productNos.length; index += STOCK_CHECK_CONCURRENCY) {
    const batch = productNos.slice(index, index + STOCK_CHECK_CONCURRENCY);
    await Promise.all(
      batch.map(async (no) => {
        try {
          const response = await fetch(`/api/domeggook-item?no=${encodeURIComponent(no)}`);
          if (!response.ok) throw new Error(`조회 실패 (${response.status})`);
          const item = (await response.json()) as DomeggookItem;
          const saleStatus = item.saleStatus ?? null;
          const isSoldOut = item.inventory === 0 || (saleStatus !== null && saleStatus !== '판매중');
          results.set(no, { product_no: no, inventory: item.inventory, saleStatus, isSoldOut, failed: false });
        } catch (error) {
          console.error('품절 확인 실패:', no, error);
          results.set(no, { product_no: no, inventory: null, saleStatus: null, isSoldOut: false, failed: true });
        } finally {
          done += 1;
          onProgress?.(done, productNos.length);
        }
      }),
    );
  }
  return results;
}
