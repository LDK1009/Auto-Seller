//////////////////////////////////////// 구독 상수 ////////////////////////////////////////
// ⚠️ 가격은 초안 (PLAN.md 7장 가격 사다리 — S2 확정 전). 판매는 비노출 상태(/pricing 직접 URL만).

export const SUBSCRIPTION_PLAN = {
  id: 'pro',
  name: '오토셀러 프로',
  monthlyPrice: 39000, // 원 — S2 확정 전 초안
} as const;

// 결제 주기 (개월)
export const BILLING_PERIOD_MONTHS = 1;
