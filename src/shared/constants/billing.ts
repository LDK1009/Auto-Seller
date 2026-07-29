//////////////////////////////////////// 결제·크레딧 상수 ////////////////////////////////////////
// 정책 단일 출처: docs/기획/가격정책.md (2026-07-29 확정)
// - 품절 자동감시 = 월 9,900 구독 (감시 50개 상한 = 알림톡 원가 방어선)
// - AI 생성물 = 크레딧 종량 (1크레딧 = 200원). 누끼는 크레딧 0 = 완전 무료 입구
//
// 🚨 결제 킬스위치 (2026-07-27 도입, 07-29 해제조건 재정의)
// 켜는 법: Vercel 환경변수 BILLING_ENABLED=true (서버 전용 — NEXT_PUBLIC_ 금지).
// 해제 선결 3개: ① 유료 기능 라이브(감시·AI 생성) ② 토스 심사 승인·라이브 키 등록 ③ 알림톡 템플릿 승인
// (구 선결 "@imgly 라이선스 정리"는 ormbg 교체로 해소됨 — 2026-07-29)

//////////////////// 구독 ////////////////////
export const SUBSCRIPTION_PLAN = {
  id: 'standard',
  name: '오토셀러 스탠다드',
  monthlyPrice: 9900,
  includedCredits: 30, // 매월 결제 시 지급
  watchLimit: 50, // 품절 감시 상품 상한 (원가 방어)
} as const;

// 결제 주기 (개월)
export const BILLING_PERIOD_MONTHS = 1;

//////////////////// 크레딧 ////////////////////
export const CREDIT_UNIT_PRICE = 200; // 1크레딧 = 200원 (앵커)
export const SIGNUP_BONUS_CREDITS = 10; // 신규 가입 무료 체험

// 기능별 소모량 — 누끼(배경 제거)는 목록에 없다 = 크레딧 0 = 무료
export const CREDIT_COST = {
  background: 1, // AI 배경 생성
  thumbnail: 1, // AI 썸네일 생성
  detail_page: 5, // AI 상세페이지 생성 (다중 이미지·긴 생성)
} as const;

export type CreditFeature = keyof typeof CREDIT_COST;

// 충전팩 (대량 할인)
export const CREDIT_PACKS = [
  { id: 'pack30', credits: 30, price: 5900 },
  { id: 'pack100', credits: 100, price: 18000 },
  { id: 'pack300', credits: 300, price: 48000 },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]['id'];

export function findCreditPack(packId: string) {
  return CREDIT_PACKS.find((pack) => pack.id === packId) ?? null;
}

//////////////////// 킬스위치 ////////////////////
// 서버에서만 호출한다 (process.env는 클라이언트 번들에 없음).
export function isBillingEnabled(): boolean {
  return process.env.BILLING_ENABLED === 'true';
}

// 차단 시 API가 돌려줄 공통 응답 본문
export const BILLING_DISABLED_MESSAGE = '결제 기능을 준비하고 있어요. 조금만 기다려주세요.';
