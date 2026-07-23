//////////////////////////////////////// 24일 롱폼 · 4챕터 — 도매꾹 검색 ////////////////////////////////////////
// 대본 정차역 2개: 개인 구매 가능 / 최소 수량 확인 필요
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "24-ch5",
  url: "/domeggook-search",
  desktop: true,
  run: async (p) => {
    await p.waitVisible(p.page.getByText(/총 [\d,]+개 상품/).first(), 60000);

    // 정차 1 — 인기순 결과 (개인도 살 수 있는 상품들)
    await p.showSection(p.page.getByText(/총 [\d,]+개 상품/).first(), 3.2);
    await p.smoothScrollBy(600, 3);
    await p.hold(2.5);

    // 정차 2 — 최소수량 표기
    await p.showSection(p.page.getByText(/최소 \d+개/).first(), 3.4);
    await p.smoothScrollBy(700, 3);
    await p.hold(3);
    await p.smoothScrollBy(600, 3);
    await p.hold(2.5);
  },
};
