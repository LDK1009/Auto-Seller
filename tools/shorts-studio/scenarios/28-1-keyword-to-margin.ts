//////////////////////////////////////// #28-1 키워드 조회 → 원링크 마진 확인 (4단계 소싱) ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "28-1",
  url: "/keyword-stats",
  recapItems: ["검색량 조회", "경쟁강도 판정", "상품 선택", "마진까지 확인"],
  run: async (p) => {
    const input = p.page.getByLabel("키워드");
    await p.humanType(input, "주방수납");
    await p.humanClick(p.page.getByRole("button", { name: "분석" }), 0.5);
    await p.waitVisible(p.page.getByText("월간 검색수").first(), 60000);
    // 정차 1 — 검색량
    await p.showSection(p.page.getByText("월간 검색수").first(), 2);
    // 정차 2 — 경쟁강도
    await p.showSection(p.page.getByText("경쟁강도").first(), 2);

    // 원링크로 이동해 상품·마진 확인
    await p.page.goto(`${process.env.SHORTS_BASE_URL ?? "https://www.auto-seller.co.kr"}/domeggook-import`, {
      waitUntil: "networkidle",
    });
    const search = p.page.getByLabel(/도매꾹 링크·상품번호 또는 검색어/);
    await p.humanType(search, "주방수납");
    await p.humanClick(p.page.getByRole("button", { name: /^(검색|조회)$/ }).first(), 0.5);
    const firstCard = p.page.getByText(/최소 \d+개/).first();
    await p.waitVisible(firstCard);
    // 정차 3 — 상품 카드
    await p.showSection(firstCard, 2);
    await p.humanClick(firstCard, 1);
    await p.waitVisible(p.page.getByText("상품 정보").first());
    // 정차 4 — 판매가(마진)
    await p.showSection(p.page.getByText("판매가").first(), 2.2);
  },
};
