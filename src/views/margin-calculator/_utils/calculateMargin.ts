//////////////////////////////////////// 마진 계산 유틸 ////////////////////////////////////////
// 계산 기준:
// - 매출 = 판매가 + 고객 부담 배송비 (마켓 수수료는 통상 배송비 포함 결제금액에 부과)
// - 수수료 = 매출 × 수수료율
// - 총비용 = 원가 + 실제 배송비 + 기타 비용 + 수수료
// - 순이익 = 매출 − 총비용
// - 마진율 = 순이익 ÷ 판매가 × 100 (셀러 관행상 판매가 기준)

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
