//////////////////////////////////////// #31-2 시즌 키워드 조회 (8월 준비) ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "31-2",
  url: "/keyword-stats",
  recapItems: ["시즌 키워드 조회", "수요·경쟁 확인", "선점 타이밍 판정"],
  run: async (p) => {
    const input = p.page.getByLabel("키워드");
    await p.humanType(input, "신학기가방");
    await p.humanClick(p.page.getByRole("button", { name: "분석" }), 0.5);
    await p.waitVisible(p.page.getByText("월간 검색수").first(), 60000);
    // 정차 1 — 검색량
    await p.showSection(p.page.getByText("월간 검색수").first(), 2);
    // 정차 2 — 경쟁강도
    await p.showSection(p.page.getByText("경쟁강도").first(), 2);
    // 정차 3 — 판정
    await p.showSection(p.page.getByText("판정").first(), 2.2);
  },
};
