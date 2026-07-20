//////////////////////////////////////// #27-1 경쟁강도 — 넓은 키워드 → 좁힌 키워드 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "27-1",
  url: "/keyword-stats",
  recapItems: ["넓은 키워드 조회", "한 단계 좁혀 재조회", "경쟁강도 대비"],
  run: async (p) => {
    const input = p.page.getByLabel("키워드");
    await p.humanType(input, "캠핑용품");
    await p.humanClick(p.page.getByRole("button", { name: "분석" }), 0.5);
    await p.waitVisible(p.page.getByText("월간 검색수").first(), 60000);
    // 정차 1 — 넓은 키워드 (상품 수 과다)
    await p.showSection(p.page.getByText("상품 수").first(), 2);

    await input.fill("");
    await p.humanType(input, "차박용품");
    await p.humanClick(p.page.getByRole("button", { name: "분석" }), 0.5);
    await p.waitVisible(p.page.getByText("월간 검색수").first(), 60000);
    // 정차 2 — 좁힌 키워드 결과
    await p.showSection(p.page.getByText("경쟁강도").first(), 2);
    // 정차 3 — 판정
    await p.showSection(p.page.getByText("판정").first(), 2.2);
  },
};
