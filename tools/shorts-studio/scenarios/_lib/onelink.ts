//////////////////////////////////////// 원링크 시나리오 팩토리 ////////////////////////////////////////
// 검색 → 첫 카드 → 시트 → 정차역 목록. 에피소드마다 검색어·정차역만 다름 (상품 로테이션 규칙)
import type { Scenario } from "../../scripts/lib/recorder";

export type Station = {
  target: string | RegExp; // getByText 대상 (섹션 라벨 또는 경고 문구)
  hold?: number;
};

export const makeOnelink = (
  id: string,
  keyword: string,
  stations: Station[],
  recapItems: string[],
): Scenario => ({
  id,
  url: "/domeggook-import",
  recapItems,
  run: async (p) => {
    const input = p.page.getByLabel(/도매꾹 링크·상품번호 또는 검색어/);
    await p.humanType(input, keyword);
    await p.humanClick(p.page.getByRole("button", { name: /^(검색|조회)$/ }).first(), 0.5);

    const firstCard = p.page.getByText(/최소 \d+개/).first();
    await p.waitVisible(firstCard);
    await p.humanClick(firstCard, 1);

    await p.waitVisible(p.page.getByText("상품 정보").first());
    await p.hold(1.2);

    for (const s of stations) {
      await p.showSection(p.page.getByText(s.target).first(), s.hold ?? 2);
    }
  },
});

////////// 표준 정차역 프리셋
export const FULL_FLOW: Station[] = [
  { target: "카테고리" },
  { target: "상품명" },
  { target: "판매가", hold: 2.2 },
  { target: "검색설정" },
];

export const FULL_RECAP = ["카테고리 자동 추천", "상품명 검사", "판매가 마진 계산", "태그 후보까지"];
