//////////////////////////////////////// 데모 — 마진 계산 (순이익) ////////////////////////////////////////
import type { DemoScenario } from "./types";

export const demo: DemoScenario = {
  id: "margin-basic",
  title: "이 상품 남는 장사인지 30초 계산",
  url: "/margin-calculator",
  hookText: "이 상품\n남는 장사일까",
  ctaText: "수수료·배송까지\n진짜 순이익 계산",
  scenes: [
    { title: "판매가·원가 입력", caption: "팔 값과 떼올 값을 넣습니다" },
    { title: "수수료·배송비", caption: "실제로 빠지는 것까지 넣어요" },
    { title: "진짜 순이익", caption: "남는 게 얼마인지 바로 나옵니다" },
  ],
  run: async (p) => {
    // 씬 1 — 판매가·원가
    p.markScene();
    await p.humanType(p.page.getByLabel("판매가"), "15000");
    await p.humanType(p.page.getByLabel("원가 (매입가·공급가)"), "6000");
    await p.hold(1.0);

    // 씬 2 — 수수료·배송비 (진짜 비용)
    p.markScene();
    await p.humanType(p.page.getByLabel("수수료율 (스마트스토어 기준)"), "6");
    await p.humanType(p.page.getByLabel("고객에게 받는 배송비"), "3000");
    await p.humanType(p.page.getByLabel("실제 나가는 배송비"), "3000");
    await p.hold(1.2);

    // 씬 3 — 결과 강조 ("개당 순이익"은 결과 패널 전용 텍스트. 상단 설명문의 "순이익" 오매치 회피)
    p.markScene();
    await p.showSection(p.page.getByText("개당 순이익").first(), 2.5);
    await p.hold(1.2);
  },
};
