//////////////////////////////////////// 데모 — 부가세 (납부 예상액) ////////////////////////////////////////
import type { DemoScenario } from "./types";

export const demo: DemoScenario = {
  id: "vat-basic",
  title: "부가세 신고 전 얼마 나올지 미리",
  url: "/vat-calculator",
  hookText: "부가세 신고 전\n얼마 나올지",
  ctaText: "간이·일반\n납부액 미리 계산",
  scenes: [
    { title: "매출·매입 입력", caption: "번 돈과 증빙 매입을 넣어요" },
    { title: "자동 계산", caption: "과세 유형에 맞게 계산됩니다" },
    { title: "납부 예상액", caption: "낼 부가세가 바로 나옵니다" },
  ],
  run: async (p) => {
    // 씬 1 — 매출·매입
    p.markScene();
    await p.humanType(p.page.getByLabel("매출 (부가세 포함 공급대가)"), "5000000");
    await p.humanType(p.page.getByLabel("매입 (세금계산서·카드 증빙분)"), "2000000");
    await p.hold(1.2);

    // 씬 2 — 잠깐 정차 (자동 계산 결과 뜸)
    p.markScene();
    await p.hold(1.5);

    // 씬 3 — 결과 강조 ("부가세 납부 예상액"은 결과 전용 텍스트)
    p.markScene();
    await p.showSection(p.page.getByText("부가세 납부 예상액").first(), 2.5);
    await p.hold(1.2);
  },
};
