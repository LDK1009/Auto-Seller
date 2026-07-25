'use client';

//////////////////////////////////////// 내 상품 목록 훅 ////////////////////////////////////////
// 저장 목록 조회·삭제 + 일괄 품절 확인 (버튼 트리거 — 라인 3).

import { useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { useAuthSession } from '@/shared/hooks/useAuthSession';
import {
  fetchSavedProducts,
  removeSavedProduct,
  checkProductsStock,
  type SavedProduct,
  type StockCheckResult,
} from '@/shared/services/savedProductsService';

export function useSavedProducts() {
  const { enqueueSnackbar } = useSnackbar();
  const { session, isSessionLoading } = useAuthSession();

  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stockResults, setStockResults] = useState<Map<string, StockCheckResult> | null>(null);
  const [checkProgress, setCheckProgress] = useState<string | null>(null);

  ////////// 목록 로드 (세션 확정 후)
  useEffect(() => {
    if (isSessionLoading) return;
    let cancelled = false;
    const load = async () => (session ? fetchSavedProducts() : []);
    load()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) enqueueSnackbar('저장 목록을 불러오지 못했어요.', { variant: 'error' });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionLoading, session?.user.id]);

  ////////// 삭제
  const remove = async (id: string) => {
    try {
      await removeSavedProduct(id);
      setProducts((previous) => previous.filter((product) => product.id !== id));
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '삭제에 실패했어요.', { variant: 'error' });
    }
  };

  ////////// 일괄 품절 확인
  const checkStock = async () => {
    if (products.length === 0) return;
    setCheckProgress(`확인 중… 0/${products.length}`);
    try {
      const results = await checkProductsStock(
        products.map((product) => product.product_no),
        (done, total) => setCheckProgress(`확인 중… ${done}/${total}`),
      );
      setStockResults(results);
      const soldOutCount = Array.from(results.values()).filter((entry) => entry.isSoldOut || entry.failed).length;
      enqueueSnackbar(
        soldOutCount > 0 ? `주의가 필요한 상품 ${soldOutCount}개를 찾았어요.` : '모든 상품이 판매 가능 상태예요.',
        { variant: soldOutCount > 0 ? 'warning' : 'success' },
      );
    } catch (error) {
      console.error(error);
      enqueueSnackbar('품절 확인에 실패했어요.', { variant: 'error' });
    } finally {
      setCheckProgress(null);
    }
  };

  return { session, isSessionLoading, products, isLoading, stockResults, checkProgress, remove, checkStock };
}
