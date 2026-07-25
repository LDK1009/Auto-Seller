//////////////////////////////////////// 마진 계산 유틸 (전역 공유) ////////////////////////////////////////
// 사용처: 마진 계산기(정방향·역산) + 원링크 등록 준비 패키지(추천 판매가) — 2개 라우트 공유로 shared 승격.
//
// 계산 기준:
// - 매출 = 판매가 + 고객 부담 배송비 (마켓 수수료는 통상 배송비 포함 결제금액에 부과)
// - 수수료 = 매출 × 수수료율
// - 총비용 = 원가 + 실제 배송비 + 기타 비용 + 수수료
// - 순이익 = 매출 − 총비용
// - 마진율 = 순이익 ÷ 판매가 × 100 (셀러 관행상 판매가 기준)

//////////////////// 정방향: 판매가 → 순이익 ////////////////////

export type MarginInput = {
  sellingPrice: number; // 판매가
  costPrice: number; // 원가(매입가)
  feeRate: number; // 수수료율 (%)
  shippingCharge: number; // 고객에게 받는 배송비
  shippingCost: number; // 실제 나가는 배송비
  otherCost: number; // 기타 비용 (포장재·광고 등)
};

export type MarginResult = {
  revenue: number; // 매출 (판매가+배송비 수입)
  feeAmount: number; // 수수료액
  totalCost: number; // 총비용
  profit: number; // 순이익
  marginRate: number; // 마진율 (판매가 기준 %)
  costMarkup: number; // 원가 대비 수익률 (%)
};

export function calculateMargin(input: MarginInput): MarginResult {
  const revenue = input.sellingPrice + input.shippingCharge;
  const feeAmount = Math.round((revenue * input.feeRate) / 100);
  const totalCost = input.costPrice + input.shippingCost + input.otherCost + feeAmount;
  const profit = revenue - totalCost;

  const marginRate = input.sellingPrice > 0 ? (profit / input.sellingPrice) * 100 : 0;
  const costMarkup = input.costPrice > 0 ? (profit / input.costPrice) * 100 : 0;

  return { revenue, feeAmount, totalCost, profit, marginRate, costMarkup };
}

//////////////////// 역산: 목표 마진율 → 최소 판매가 ////////////////////
// 유도:
// - 순이익 = (P + 받는배송비) − [원가 + 나가는배송비 + 기타 + (P + 받는배송비) × f]
// - 목표: 순이익 = P × m  (f = 수수료율/100, m = 목표마진율/100)
// - 정리: P = (고정비 − 받는배송비 × (1 − f)) / (1 − f − m)
// - 손익분기 판매가는 m = 0 대입

// 역산 판매가 올림 단위 (원) — 최소가 보장을 위해 항상 올림
export const PRICE_ROUND_UNIT = 10;

export type ReversePriceInput = {
  costPrice: number; // 원가(공급가)
  targetMarginRate: number; // 목표 마진율 (판매가 기준 %)
  feeRate: number; // 수수료율 (%)
  shippingCharge: number; // 고객에게 받는 배송비
  shippingCost: number; // 실제 나가는 배송비
  otherCost: number; // 기타 비용
};

export type ReversePriceResult =
  | { achievable: false; reason: string }
  | {
      achievable: true;
      recommendedPrice: number; // 목표 마진 달성 최소 판매가 (10원 올림)
      breakEvenPrice: number; // 손익분기 판매가 (순이익 0)
      marginAtPrice: MarginResult; // 추천가 기준 실제 내역 (올림 반영)
    };

// 지정 단위로 올림 (셀러 가격 관행 — 최소가 보장을 위해 항상 올림)
function ceilToUnit(value: number, unit: number): number {
  return Math.ceil(value / unit) * unit;
}

export function calculateReversePrice(input: ReversePriceInput): ReversePriceResult {
  const feeRatio = input.feeRate / 100;
  const marginRatio = input.targetMarginRate / 100;

  const denominator = 1 - feeRatio - marginRatio;
  if (denominator <= 0) {
    return {
      achievable: false,
      reason: '수수료율과 목표 마진율을 합치면 100%를 넘어 판매가로 만들 수 없어요. 목표 마진율을 낮춰보세요.',
    };
  }

  const fixedCost = input.costPrice + input.shippingCost + input.otherCost;
  const shippingContribution = input.shippingCharge * (1 - feeRatio); // 받는 배송비가 메워주는 몫

  const rawPrice = (fixedCost - shippingContribution) / denominator;
  const recommendedPrice = Math.max(0, ceilToUnit(rawPrice, PRICE_ROUND_UNIT));

  const rawBreakEven = (fixedCost - shippingContribution) / (1 - feeRatio);
  const breakEvenPrice = Math.max(0, ceilToUnit(rawBreakEven, PRICE_ROUND_UNIT));

  // 올림된 추천가 기준으로 실제 순이익·마진율 재계산 (표시용 — 목표치보다 약간 높게 나온다)
  const marginAtPrice = calculateMargin({
    sellingPrice: recommendedPrice,
    costPrice: input.costPrice,
    feeRate: input.feeRate,
    shippingCharge: input.shippingCharge,
    shippingCost: input.shippingCost,
    otherCost: input.otherCost,
  });

  return { achievable: true, recommendedPrice, breakEvenPrice, marginAtPrice };
}
