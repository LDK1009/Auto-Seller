//////////////////////////////////////// #23-2 광고 손익 (ROAS) ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "23-2",
  url: "/roas-calculator",
  recapItems: ["광고비·매출 입력", "손익분기 ROAS 계산", "광고 손익 판정"],
  run: async (p) => {
    const price = p.page.getByLabel("판매가");
    await price.fill("");
    await p.humanType(price, "18900");
    const profit = p.page.getByLabel("개당 순이익 (마진 계산기 결과)");
    await profit.fill("");
    await p.humanType(profit, "3800");
    const adCost = p.page.getByLabel("광고비");
    await adCost.fill("");
    await p.humanType(adCost, "100000");
    const adRevenue = p.page.getByLabel("광고 매출 (광고로 발생한 매출)");
    await adRevenue.fill("");
    await p.humanType(adRevenue, "420000");

    // 정차 1 — 입력 영역
    await p.showSection(p.page.getByLabel("광고비").first(), 2);
    // 정차 2 — 손익분기 ROAS
    await p.showSection(p.page.getByText("손익분기 ROAS").first(), 2.2);
    // 정차 3 — 광고 손익 판정
    await p.showSection(p.page.getByText("광고 손익").first(), 2.2);
  },
};
