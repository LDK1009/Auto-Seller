//////////////////////////////////////// #29-1 부가세 과세유형 비교 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "29-1",
  url: "/vat-calculator",
  recapItems: ["같은 매출로 비교", "간이과세 세액", "일반과세 세액"],
  run: async (p) => {
    const sales = p.page.getByLabel("매출 (부가세 포함 공급대가)");
    await sales.fill("");
    await p.humanType(sales, "20000000");
    const purchase = p.page.getByLabel("매입 (세금계산서·카드 증빙분)");
    await purchase.fill("");
    await p.humanType(purchase, "12000000");

    // 정차 1 — 간이과세 결과
    await p.showSection(p.page.getByText("부가세 납부 예상액").first(), 2.2);
    // 일반과세로 전환
    await p.humanClick(p.page.getByRole("button", { name: "일반과세" }), 0.6);
    // 정차 2 — 일반과세 결과
    await p.showSection(p.page.getByText("부가세 납부 예상액").first(), 2.2);
    // 정차 3 — 세액 상세 (매출세액·공제)
    await p.showSection(p.page.getByText("매입 공제세액").first(), 2);
  },
};
