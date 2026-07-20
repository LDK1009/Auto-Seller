//////////////////////////////////////// #1 원링크 풀 플로우 ////////////////////////////////////////
// 검색 → 첫 상품 카드 클릭 → 시트 등장 → 시트 훑기 (검색 경유라 상품번호 하드코딩 불필요)
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "16",
  url: "/domeggook-import",
  run: async (p) => {
    const input = p.page.getByLabel(/도매꾹 링크·상품번호 또는 검색어/);
    await p.humanType(input, "캠핑랜턴");

    // 스마트 인풋 버튼 — 키워드 입력 시 "검색" 라벨
    await p.humanClick(p.page.getByRole("button", { name: /^(검색|조회)$/ }).first(), 0.5);

    // 결과 카드 등장 대기 → 첫 카드 클릭 (카드 고유 캡션 "최소 N개" — 클릭은 카드로 버블링)
    const firstCard = p.page.getByText(/최소 \d+개/).first();
    await p.waitVisible(firstCard);
    await p.humanClick(firstCard, 1);

    // 등록 시트 등장 (실측 핵심 구간 — 대기도 실시간)
    await p.waitVisible(p.page.getByText("상품 정보").first());
    await p.hold(1);

    // 시트 훑기 — 카테고리→판매자 코드 방향 스크롤
    await p.smoothScrollBy(2200, 5);
    await p.hold(1.2);
  },
};
