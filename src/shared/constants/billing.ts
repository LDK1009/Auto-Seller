//////////////////////////////////////// 구독 상수 ////////////////////////////////////////
// ⚠️ 가격은 초안 (PLAN.md 7장 가격 사다리 — S2 확정 전). 판매는 비노출 상태(/pricing 직접 URL만).
//
// 🚨 2026-07-27 안전장치 (ROADMAP 정합성 이슈 #6)
// 유료로 잠긴 기능이 아직 0개인데 결제 API는 39,000원을 실제 청구할 수 있는 상태였다.
// 아래 킬스위치를 도입해 기본값을 "판매 중지"로 두고, 유료 1호 출시 시점에만 켠다.
// 켜는 법: Vercel 환경변수에 BILLING_ENABLED=true 등록 (서버 전용 — NEXT_PUBLIC_ 금지).
// 해제 전 선결 3개: ① 유료 기능 1개 라이브 ② 가격 확정(39,000원은 폐기 방향) ③ @imgly 라이선스 정리.

export const SUBSCRIPTION_PLAN = {
  id: 'pro',
  name: '오토셀러 프로',
  monthlyPrice: 39000, // 원 — ⚠️ 구 초안. PLAN 7장 재정의(구독+종량) 미반영. 폐기 방향
} as const;

// 결제 주기 (개월)
export const BILLING_PERIOD_MONTHS = 1;

////////// 결제 킬스위치 — 명시적으로 켜기 전까지 모든 과금 경로 차단
// 서버에서만 호출한다 (process.env는 클라이언트 번들에 없음).
export function isBillingEnabled(): boolean {
  return process.env.BILLING_ENABLED === 'true';
}

// 차단 시 API가 돌려줄 공통 응답 본문
export const BILLING_DISABLED_MESSAGE = '유료 플랜은 아직 준비 중이에요. 조금만 기다려주세요.';
