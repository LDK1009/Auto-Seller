//////////////////////////////////////// ROAS 계산 유틸 ////////////////////////////////////////
// 손익분기 ROAS = 판매가 ÷ 개당 순이익 × 100
// (광고 매출 중 순이익 비율이 광고비를 정확히 메우는 지점 — 이보다 낮으면 광고가 적자)

export type RoasInput = {
  sellingPrice: number; // 판매가
  profitPerUnit: number; // 개당 순이익 (마진 계산기 결과)
  adSpend: number; // 광고비 (시뮬레이션용, 0이면 생략)
  adRevenue: number; // 광고 매출 (시뮬레이션용, 0이면 생략)
};

export type RoasResult = {
  breakEvenRoas: number | null; // 손익분기 ROAS (%)
  currentRoas: number | null; // 현재 ROAS (%) — 광고비·매출 입력 시
  adProfit: number | null; // 광고 손익 (원) — 광고 매출의 순이익 − 광고비
  isProfitable: boolean | null;
};

export function calculateRoas(input: RoasInput): RoasResult {
  const breakEvenRoas =
    input.sellingPrice > 0 && input.profitPerUnit > 0
      ? (input.sellingPrice / input.profitPerUnit) * 100
      : null;

  const hasSimulation = input.adSpend > 0 && input.adRevenue > 0;
  const currentRoas = hasSimulation ? (input.adRevenue / input.adSpend) * 100 : null;

  // 광고 매출 → 판매 수량 → 순이익 환산 후 광고비 차감
  const adProfit =
    hasSimulation && input.sellingPrice > 0
      ? (input.adRevenue / input.sellingPrice) * input.profitPerUnit - input.adSpend
      : null;

  return {
    breakEvenRoas,
    currentRoas,
    adProfit,
    isProfitable: adProfit !== null ? adProfit >= 0 : null,
  };
}
