//////////////////////////////////////// 부가세 간이 계산 유틸 ////////////////////////////////////////
// 온라인 소매(통신판매) 기준의 대략 계산 — 신고는 홈택스/세무사 기준이 우선임을 UI에 고지.
// - 일반과세자: 납부세액 = 매출세액(공급대가×10/110) − 매입세액(매입가×10/110)
// - 간이과세자(소매업 부가가치율 15%): 납부세액 = 공급대가 × 15% × 10% − 공제세액(매입액×0.5%)
//   연 공급대가 4,800만 원 미만이면 납부 면제

export type VatTaxType = 'general' | 'simplified';

// 소매업(통신판매 포함) 간이과세 부가가치율
const SIMPLIFIED_VALUE_ADDED_RATE = 0.15;
const SIMPLIFIED_PURCHASE_CREDIT_RATE = 0.005; // 매입 세액공제율 (매입금액 × 0.5%)
export const SIMPLIFIED_EXEMPT_THRESHOLD = 48_000_000; // 간이 납부 면제 기준 (연 공급대가)

export type VatInput = {
  taxType: VatTaxType;
  salesAmount: number; // 매출 (부가세 포함 공급대가)
  purchaseAmount: number; // 매입 (부가세 포함, 세금계산서·카드 수취분)
};

export type VatResult = {
  salesVat: number; // 매출세액
  purchaseCredit: number; // 매입세액(공제)
  payable: number; // 납부(환급) 예상액 — 음수면 환급
  isExemptCandidate: boolean; // 간이 납부 면제 구간 여부
};

export function calculateVat(input: VatInput): VatResult {
  if (input.taxType === 'general') {
    const salesVat = Math.round((input.salesAmount * 10) / 110);
    const purchaseCredit = Math.round((input.purchaseAmount * 10) / 110);
    return {
      salesVat,
      purchaseCredit,
      payable: salesVat - purchaseCredit,
      isExemptCandidate: false,
    };
  }

  // 간이과세
  const salesVat = Math.round(input.salesAmount * SIMPLIFIED_VALUE_ADDED_RATE * 0.1);
  const purchaseCredit = Math.round(input.purchaseAmount * SIMPLIFIED_PURCHASE_CREDIT_RATE);
  return {
    salesVat,
    purchaseCredit,
    payable: Math.max(0, salesVat - purchaseCredit), // 간이는 환급 없음
    isExemptCandidate: input.salesAmount < SIMPLIFIED_EXEMPT_THRESHOLD,
  };
}
