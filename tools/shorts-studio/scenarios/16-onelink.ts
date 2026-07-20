//////////////////////////////////////// #1 원링크 풀 플로우 ////////////////////////////////////////
// 검색 → 첫 상품 카드 → 시트 등장 → 정차역 4곳 (카테고리·상품명·판매가·태그)
// 통스크롤 금지 — 강조 대상마다 showSection으로 정차 (줌·자막 싱크 기준점)
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "16",
  url: "/domeggook-import",
  run: async (p) => {
    const input = p.page.getByLabel(/도매꾹 링크·상품번호 또는 검색어/);
    await p.humanType(input, "캠핑랜턴");
    await p.humanClick(p.page.getByRole("button", { name: /^(검색|조회)$/ }).first(), 0.5);

    // 첫 카드 클릭 (카드 캡션 "최소 N개" — 클릭은 카드로 버블링)
    const firstCard = p.page.getByText(/최소 \d+개/).first();
    await p.waitVisible(firstCard);
    await p.humanClick(firstCard, 1);

    // 등록 시트 등장 (실측 핵심 대기)
    await p.waitVisible(p.page.getByText("상품 정보").first());
    await p.hold(1.2);

    // 정차역 — 시트의 강조 섹션들을 하나씩 보여주기
    await p.showSection(p.page.getByText("카테고리").first(), 2);
    await p.showSection(p.page.getByText("상품명").first(), 2);
    await p.showSection(p.page.getByText("판매가").first(), 2.2);
    await p.showSection(p.page.getByText("검색설정").first(), 2);
  },
};
