//////////////////////////////////////// #23-1 마진 계산기 (역산 기본 흐름) ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "23-1",
  url: "/margin-calculator",
  recapItems: ["원가·배송비 입력", "수수료 자동 반영", "목표 마진 역산", "개당 순이익 확인"],
  run: async (p) => {
    await p.humanClick(p.page.getByRole("button", { name: "판매가 역산" }), 0.6);

    const cost = p.page.getByLabel("원가 (매입가·공급가)");
    await cost.fill("");
    await p.humanType(cost, "8900");
    const ship = p.page.getByLabel("실제 나가는 배송비");
    await ship.fill("");
    await p.humanType(ship, "2500");

    // 정차 1 — 입력값 영역
    await p.showSection(p.page.getByLabel("원가 (매입가·공급가)").first(), 2);
    // 정차 2 — 목표 마진
    await p.humanClick(p.page.getByText("마진 20%").first(), 0.5);
    await p.showSection(p.page.getByText("마진 20%").first(), 2);
    // 정차 3 — 결과
    await p.showSection(p.page.getByText(/마진 \d+%를 지키는 최소 판매가/).first(), 2.4);
  },
};
