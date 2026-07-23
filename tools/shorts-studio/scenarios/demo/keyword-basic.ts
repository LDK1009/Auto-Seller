//////////////////////////////////////// 데모 — 키워드 분석 (틈새 판정) ////////////////////////////////////////
import type { DemoScenario } from "./types";

export const demo: DemoScenario = {
  id: "keyword-basic",
  title: "팔릴 키워드 숫자로 고르기",
  url: "/keyword-stats",
  scenes: [
    { title: "키워드 입력", caption: "생각해둔 키워드를 넣습니다" },
    { title: "검색량 확인", caption: "한 달에 얼마나 검색되는지 봅니다" },
    { title: "경쟁 확인", caption: "검색수를 등록 상품수로 나눈 값입니다" },
  ],
  run: async (p) => {
    p.markScene();
    await p.humanType(p.page.getByLabel("키워드"), "주방수납");
    await p.humanClick(p.page.getByRole("button", { name: "분석" }).first(), 0.6);
    await p.waitVisible(p.page.getByText("월간 검색수").first(), 60000);
    await p.hold(1.2);

    p.markScene();
    await p.showSection(p.page.getByText("월간 검색수").first(), 2.8);

    p.markScene();
    await p.showSection(p.page.getByText("경쟁강도").first(), 2.8);
    await p.smoothScrollBy(500, 2.5);
    await p.hold(1.5);
  },
};
