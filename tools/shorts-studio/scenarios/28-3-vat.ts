//////////////////////////////////////// #28-3 부가세 계산 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "28-3",
  url: "/vat-calculator",
  recapItems: ["과세유형 선택", "매출·매입 입력", "예상 부가세 확인"],
  run: async (p) => {
    // 정차 1 — 과세유형 (기본 간이)
    await p.showSection(p.page.getByRole("button", { name: "간이과세" }).first(), 2);

    const sales = p.page.getByLabel("매출 (부가세 포함 공급대가)");
    await sales.fill("");
    await p.humanType(sales, "12000000");
    const purchase = p.page.getByLabel("매입 (세금계산서·카드 증빙분)");
    await purchase.fill("");
    await p.humanType(purchase, "7000000");

    // 정차 2 — 입력 영역
    await p.showSection(p.page.getByLabel("매출 (부가세 포함 공급대가)").first(), 2);
    // 정차 3 — 결과
    await p.showSection(p.page.getByText("부가세 납부 예상액").first(), 2.4);
  },
};
