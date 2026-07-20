//////////////////////////////////////// #26-2 키워드 2종 비교 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "26-2",
  url: "/keyword-stats",
  recapItems: ["키워드 A 조회", "키워드 B 조회", "숫자로 진입 판정"],
  run: async (p) => {
    const input = p.page.getByLabel("키워드");
    await p.humanType(input, "캠핑랜턴");
    await p.humanClick(p.page.getByRole("button", { name: "분석" }), 0.5);
    await p.waitVisible(p.page.getByText("월간 검색수").first(), 60000);
    // 정차 1 — 키워드 A 결과
    await p.showSection(p.page.getByText("경쟁강도").first(), 2);

    // 키워드 B 재조회
    await input.fill("");
    await p.humanType(input, "해루질랜턴");
    await p.humanClick(p.page.getByRole("button", { name: "분석" }), 0.5);
    await p.waitVisible(p.page.getByText("월간 검색수").first(), 60000);
    // 정차 2 — 키워드 B 결과
    await p.showSection(p.page.getByText("경쟁강도").first(), 2);
    // 정차 3 — 판정
    await p.showSection(p.page.getByText("판정").first(), 2.2);
  },
};
