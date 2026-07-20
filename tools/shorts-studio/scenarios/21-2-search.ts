//////////////////////////////////////// #21-2 도매꾹 인기순 검색 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "21-2",
  url: "/domeggook-search",
  recapItems: ["키워드 검색", "인기순 정렬", "조건(MOQ·배송비) 확인"],
  run: async (p) => {
    const input = p.page.getByLabel("검색어");
    await p.humanType(input, "주방수납");
    await p.humanClick(p.page.getByRole("button", { name: "검색" }).first(), 0.5);

    // 결과 대기
    await p.waitVisible(p.page.getByText(/총 [\d,]+개 상품/).first(), 30000);
    // 정차 1 — 결과 헤더 (인기순 총 개수)
    await p.showSection(p.page.getByText(/총 [\d,]+개 상품/).first(), 2);
    // 정차 2 — 첫 상품 카드 (최소수량·배송비)
    await p.showSection(p.page.getByText(/최소 \d+개/).first(), 2.2);
    // 정차 3 — 필터 (낱개 구매)
    await p.showSection(p.page.getByLabel("낱개 구매").first(), 2);
  },
};
