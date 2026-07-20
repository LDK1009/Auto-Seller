//////////////////////////////////////// #26-1 키워드 분석 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "26-1",
  url: "/keyword-stats",
  recapItems: ["월간 검색수 조회", "상품 수 확인", "경쟁강도 판정"],
  run: async (p) => {
    const input = p.page.getByLabel("키워드");
    await p.humanType(input, "캠핑랜턴");
    await p.humanClick(p.page.getByRole("button", { name: "분석" }), 0.5);

    await p.waitVisible(p.page.getByText("월간 검색수").first(), 60000);
    // 정차 1 — 검색수
    await p.showSection(p.page.getByText("월간 검색수").first(), 2);
    // 정차 2 — 상품 수
    await p.showSection(p.page.getByText("상품 수").first(), 2);
    // 정차 3 — 경쟁강도·판정
    await p.showSection(p.page.getByText("경쟁강도").first(), 2.2);
  },
};
