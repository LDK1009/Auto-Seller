//////////////////////////////////////// 24일 롱폼 · 5챕터 — 최소수량 확인 ////////////////////////////////////////
// 대본 정차역 3개: 링크 입력 / 최소수량 표시 / 묶음 기준 판매가 재계산
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "24-ch6",
  url: "/domeggook-import",
  desktop: true,
  run: async (p) => {
    // 정차 1 — 링크·검색어 입력
    const input = p.page.getByLabel(/도매꾹 링크·상품번호 또는 검색어/);
    await p.humanType(input, "주방수납");
    await p.humanClick(p.page.getByRole("button", { name: /^(검색|조회)$/ }).first(), 0.5);
    await p.waitVisible(p.page.getByText(/최소 \d+개/).first(), 30000);
    await p.showSection(p.page.getByText(/최소 \d+개/).first(), 3.0);

    // 상품 선택 → 시트
    await p.humanClick(p.page.getByText(/최소 \d+개/).first(), 1.0);
    await p.waitVisible(p.page.getByText("상품 정보").first(), 30000);
    await p.page.getByText(/추천 카테고리를 찾는 중/).waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});

    // 정차 2 — 최소구매수량 항목
    await p.showSection(p.page.getByText("최소구매").first(), 3.4);
    await p.smoothScrollBy(700, 3);
    await p.hold(2);

    // 정차 3 — 판매가 (묶음 원가 역산)
    await p.showSection(p.page.getByText("판매가").first(), 3.4);
    await p.smoothScrollBy(600, 3);
    await p.hold(2.5);
  },
};
