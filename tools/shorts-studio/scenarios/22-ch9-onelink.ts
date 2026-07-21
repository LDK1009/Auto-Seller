//////////////////////////////////////// 22일 롱폼 · 9챕터 — 원링크 등록 시트 ////////////////////////////////////////
// 대본 정차역 3개와 1:1 대응:
//   (정차역) 도매꾹 링크를 넣으면
//   (정차역) 등록 화면 순서 그대로 정보가 나옵니다
//   (정차역) 최소구매수량이라는 게 있어요
import type { Scenario } from "../scripts/lib/recorder";

export const scenario: Scenario = {
  id: "22-ch9",
  url: "/domeggook-import",
  desktop: true,
  run: async (p) => {
    // 정차 1 — 입력창 (링크 하나만 넣으면 된다)
    const input = p.page.getByLabel(/도매꾹 링크·상품번호 또는 검색어/);
    await p.humanType(input, "주방수납");
    await p.humanClick(p.page.getByRole("button", { name: /^(검색|조회)$/ }).first(), 0.5);
    await p.waitVisible(p.page.getByText(/최소 \d+개/).first(), 30000);
    await p.showSection(p.page.getByText(/최소 \d+개/).first(), 2.0);

    // 첫 상품 선택 → 시트 진입
    await p.humanClick(p.page.getByText(/최소 \d+개/).first(), 1.0);
    await p.waitVisible(p.page.getByText("상품 정보").first(), 30000);
    // 추천 카테고리 로딩 완료까지 대기 (실측 — 로딩 구간은 빌드에서 배속 처리)
    await p.page.getByText(/추천 카테고리를 찾는 중/).waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});

    // 정차 2 — 시트가 등록 화면 순서 그대로
    await p.showSection(p.page.getByText("상품 정보").first(), 3.2);

    // 시트를 위에서 아래로 훑는다 — "등록 화면 순서 그대로"를 화면으로 증명하는 구간
    await p.smoothScrollBy(800, 3);
    await p.hold(2);
    await p.smoothScrollBy(800, 3);
    await p.hold(2);

    // 정차 3 — MOQ 함정 안내 (시트 우측 "최소구매" 항목)
    await p.showSection(p.page.getByText("최소구매").first(), 3.2);
    await p.hold(2);
  },
};
