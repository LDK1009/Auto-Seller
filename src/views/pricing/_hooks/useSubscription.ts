'use client';

//////////////////////////////////////// 구독 상태 훅 (/pricing 전용) ////////////////////////////////////////
// 내 구독 조회 + 카드 등록 복귀(authKey) 처리 + 해지. 데이터 패칭·상태 조율 전담.

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useAuthSession } from '@/shared/hooks/useAuthSession';
import {
  fetchMySubscription,
  startCardRegistration,
  issueBillingKey,
  cancelSubscription,
} from '@/shared/services/billingService';
import { fetchCredits, purchaseCredits } from '@/shared/services/creditService';
import type { CreditPackId } from '@/shared/constants/billing';
import type { Subscription } from '@/shared/types/billing';

export function useSubscription() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { session, isSessionLoading, accessToken } = useAuthSession();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const issueHandledRef = useRef(false);

  ////////// 내 구독 로드 — 핸들러용 (구독 시작·해지 후 갱신)
  const reload = async () => {
    if (!session) {
      setSubscription(null);
      return;
    }
    try {
      setSubscription(await fetchMySubscription());
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '구독 조회에 실패했어요.', { variant: 'error' });
    }
  };

  ////////// 초기 로드 (세션 확정 후 — 콜백에서만 setState)
  // 구독 + 크레딧 잔액을 함께 받는다 (크레딧 최초 조회 시 가입 보너스 지급됨)
  useEffect(() => {
    if (isSessionLoading) return;
    let cancelled = false;
    const load = async () => {
      if (!session || !accessToken) return null;
      const [subscriptionData, credits] = await Promise.all([
        fetchMySubscription(),
        fetchCredits(accessToken).catch(() => null),
      ]);
      if (!cancelled && credits) setCreditBalance(credits.balance);
      return subscriptionData;
    };
    load()
      .then((data) => {
        if (!cancelled) setSubscription(data);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) enqueueSnackbar('구독 조회에 실패했어요.', { variant: 'error' });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionLoading, session?.user.id]);

  ////////// 카드 등록 복귀 처리 — ?result=success&authKey=...&customerKey=...
  useEffect(() => {
    if (isSessionLoading || !accessToken || issueHandledRef.current) return;
    const result = searchParams.get('result');
    const authKey = searchParams.get('authKey');
    const customerKey = searchParams.get('customerKey');

    if (result === 'fail') {
      issueHandledRef.current = true;
      enqueueSnackbar(searchParams.get('message') ?? '카드 등록이 취소됐어요.', { variant: 'info' });
      router.replace('/pricing');
      return;
    }
    if (result !== 'success' || !authKey || !customerKey) return;

    issueHandledRef.current = true;
    (async () => {
      setIsProcessing(true);
      try {
        await issueBillingKey({ accessToken, authKey, customerKey });
        enqueueSnackbar('구독이 시작됐어요.', { variant: 'success' });
        await reload();
      } catch (error) {
        console.error(error);
        enqueueSnackbar(error instanceof Error ? error.message : '결제 처리에 실패했어요.', { variant: 'error' });
      } finally {
        setIsProcessing(false);
        router.replace('/pricing'); // 쿼리 제거 — 새로고침 재실행 방지
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionLoading, accessToken, searchParams]);

  ////////// 카드 등록 시작 (구독 시작)
  const subscribe = async () => {
    if (!session) {
      enqueueSnackbar('로그인 후 이용할 수 있어요.', { variant: 'info' });
      return;
    }
    setIsProcessing(true);
    try {
      // customerKey: 기존 구독 있으면 재사용, 없으면 신규 (uuid)
      const customerKey = subscription?.customer_key ?? crypto.randomUUID();
      await startCardRegistration(customerKey);
    } catch (error) {
      // 사용자가 등록창을 닫은 경우도 reject — 에러 토스트는 메시지 있을 때만
      console.error(error);
      if (error instanceof Error && error.message) {
        enqueueSnackbar(error.message, { variant: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  ////////// 크레딧 충전 (등록된 카드로 즉시 결제)
  const purchase = async (packId: CreditPackId) => {
    if (!accessToken) {
      enqueueSnackbar('로그인 후 이용할 수 있어요.', { variant: 'info' });
      return;
    }
    setIsProcessing(true);
    try {
      const result = await purchaseCredits(accessToken, packId);
      setCreditBalance(result.balance);
      enqueueSnackbar('크레딧을 충전했어요.', { variant: 'success' });
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '충전에 실패했어요.', { variant: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  ////////// 해지
  const cancel = async () => {
    if (!accessToken) return;
    setIsProcessing(true);
    try {
      await cancelSubscription(accessToken);
      enqueueSnackbar('구독을 해지했어요. 남은 기간까지는 계속 이용할 수 있어요.', { variant: 'success' });
      await reload();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '해지 처리에 실패했어요.', { variant: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    session,
    isSessionLoading,
    subscription,
    creditBalance,
    isLoading,
    isProcessing,
    subscribe,
    purchase,
    cancel,
  };
}
