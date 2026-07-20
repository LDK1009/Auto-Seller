//////////////////////////////////////// #29-3 마진 계산 (MOQ 묶음 변주) ////////////////////////////////////////
// 최소구매수량 3 상품 — 원가 = 도매가 × 3 기준 역산
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "29-3",
  url: "/margin-calculator",
  recapItems: ["묶음 원가(×3) 입력", "목표 마진 선택", "묶음 판매가 역산"],
  run: async (p) => {
    await p.humanClick(p.page.getByRole("button", { name: "판매가 역산" }), 0.6);

    // 도매가 4,600 × 3 = 13,800
    const cost = p.page.getByLabel("원가 (매입가·공급가)");
    await cost.fill("");
    await p.humanType(cost, "13800");
    const ship = p.page.getByLabel("실제 나가는 배송비");
    await ship.fill("");
    await p.humanType(ship, "3000");

    // 정차 1 — 묶음 원가 입력
    await p.showSection(p.page.getByLabel("원가 (매입가·공급가)").first(), 2);
    // 정차 2 — 목표 마진
    await p.humanClick(p.page.getByText("마진 20%").first(), 0.5);
    await p.showSection(p.page.getByText("마진 20%").first(), 2);
    // 정차 3 — 묶음 판매가 결과
    await p.showSection(p.page.getByText(/마진 \d+%를 지키는 최소 판매가/).first(), 2.4);
  },
};
