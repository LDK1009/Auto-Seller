//////////////////////////////////////// #20-3 마진 계산기 (역산) ////////////////////////////////////////
// 원가·배송비 입력 → 목표 마진 선택 → 판매가 역산 결과
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "20-3",
  url: "/margin-calculator",
  recapItems: ["수수료 자동 반영", "목표 마진 선택", "판매가 역산", "순이익까지 표시"],
  run: async (p) => {
    // 역산 모드
    await p.humanClick(p.page.getByRole("button", { name: "판매가 역산" }), 0.6);

    const cost = p.page.getByLabel("원가 (매입가·공급가)");
    await cost.fill("");
    await p.humanType(cost, "13800");
    const ship = p.page.getByLabel("실제 나가는 배송비");
    await ship.fill("");
    await p.humanType(ship, "3000");

    // 정차 1 — 수수료 프리셋 (자동 반영)
    await p.showSection(p.page.getByText("스마트스토어 5.6%").first(), 2);
    // 정차 2 — 목표 마진 선택
    await p.humanClick(p.page.getByText("마진 20%").first(), 0.5);
    await p.showSection(p.page.getByText("마진 20%").first(), 2);
    // 정차 3 — 역산 결과
    await p.showSection(p.page.getByText(/마진 \d+%를 지키는 최소 판매가/).first(), 2.4);
  },
};
