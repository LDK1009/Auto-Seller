//////////////////////////////////////// 데모 — 원링크 전체 흐름 ////////////////////////////////////////
// 플래그십. 검색 → 상품 선택 → 시트 전체 → 복사까지.
import type { DemoScenario } from "./types";

export const demo: DemoScenario = {
  id: "onelink-full",
  title: "도매꾹 링크 하나로 등록 준비 끝내기",
  url: "/domeggook-import",
  hookText: "등록 폼 12칸\n매번 손으로 채우시죠",
  ctaText: "도매꾹 링크 하나로\n등록 준비 끝",
  scenes: [
    { title: "상품 찾기", caption: "도매꾹 링크나 검색어를 넣습니다" },
    { title: "상품 선택", caption: "후보 중에서 올릴 상품을 고릅니다" },
    { title: "등록 정보 생성", caption: "스마트스토어 폼 순서 그대로 나옵니다" },
    { title: "MOQ 확인", caption: "묶음 상품이면 원가를 다시 잡아줍니다" },
    { title: "복사해서 붙여넣기", caption: "위에서 아래로 옮기면 등록 끝" },
  ],
  run: async (p) => {
    // 씬 1 — 검색
    p.markScene();
    await p.humanType(p.page.getByLabel(/도매꾹 링크·상품번호 또는 검색어/), "주방수납");
    await p.humanClick(p.page.getByRole("button", { name: /^(검색|조회)$/ }).first(), 0.5);
    await p.waitLoaded(p.page.getByText(/최소 \d+개/).first(), 30000);
    await p.hold(1.5);

    // 씬 2 — 선택
    p.markScene();
    await p.showSection(p.page.getByText(/최소 \d+개/).first(), 2.2);
    await p.humanClick(p.page.getByText(/최소 \d+개/).first(), 1.0);
    await p.waitLoaded(p.page.getByText("상품 정보").first(), 30000);
    await p.page.getByText(/추천 카테고리를 찾는 중/).waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
    await p.hold(1.5);

    // 씬 3 — 시트 훑기
    p.markScene();
    await p.showSection(p.page.getByText("상품 정보").first(), 2.4);
    await p.smoothScrollBy(700, 3);
    await p.hold(1.5);
    await p.smoothScrollBy(700, 3);
    await p.hold(1.5);

    // 씬 4 — 최소수량
    p.markScene();
    await p.showSection(p.page.getByText("최소구매").first(), 2.6);
    await p.hold(1.0);
    await p.showSection(p.page.getByText("판매가").first(), 2.4);

    // 씬 5 — 복사
    p.markScene();
    await p.smoothScrollBy(600, 2.5);
    await p.hold(2.0);
  },
};
