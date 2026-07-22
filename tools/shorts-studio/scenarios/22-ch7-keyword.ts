//////////////////////////////////////// 22일 롱폼 · 7챕터 — 팔릴 상품 고르기 ////////////////////////////////////////
// 대본 정차역 2개와 1:1 대응:
//   (정차역) 검색량은 있는데 등록된 상품이 적은 키워드를 찾는 겁니다
//   (정차역) 검색수 나누기 상품수로 그 비율을 보여줍니다
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "22-ch7",
  url: "/keyword-stats",
  desktop: true,
  run: async (p) => {
    const input = p.page.getByLabel("키워드");
    await p.humanType(input, "주방수납");
    await p.humanClick(p.page.getByRole("button", { name: "분석" }), 0.5);
    await p.waitVisible(p.page.getByText("월간 검색수").first(), 60000);

    // 정차 1 — 검색량 (수요가 있다)
    await p.showSection(p.page.getByText("월간 검색수").first(), 3.5);
    // 정차 2 — 경쟁강도 (검색수÷상품수 비율)
    await p.showSection(p.page.getByText("경쟁강도").first(), 3.5);

    // 나레이션(약 45초)을 채우기 위한 탐색 구간 — 차트를 훑으며 데이터 근거를 보여준다
    await p.smoothScrollBy(700, 3);
    await p.hold(2.5);
    await p.smoothScrollBy(700, 3);
    await p.hold(2.5);
    // 연관 키워드로 후보를 넓히는 장면
    await p.smoothScrollBy(900, 3.5);
    await p.hold(3);
    await p.smoothScrollBy(700, 3);
    await p.hold(3);
  },
};
