//////////////////////////////////////// 데모 — 광고 손익 (손익분기 ROAS) ////////////////////////////////////////
import type { DemoScenario } from "./types";

export const demo: DemoScenario = {
  id: "roas-basic",
  title: "광고 켜면 남을지 30초 확인",
  url: "/roas-calculator",
  hookText: "광고 켜면\n남을까 밑질까",
  ctaText: "손익분기 ROAS\n숫자로 확인",
  scenes: [
    { title: "판매가·순이익 입력", caption: "팔 값과 개당 남는 걸 넣어요" },
    { title: "광고비·광고매출", caption: "광고에 쓴 돈과 나온 매출을 넣어요" },
    { title: "광고 손익", caption: "이 광고가 남는지 바로 나옵니다" },
  ],
  run: async (p) => {
    // 씬 1 — 판매가·개당 순이익 (마진 계산기 결과를 이어받는 흐름)
    p.markScene();
    await p.humanType(p.page.getByLabel("판매가"), "15000");
    await p.humanType(p.page.getByLabel("개당 순이익 (마진 계산기 결과)"), "8000");
    await p.hold(1.0);

    // 씬 2 — 광고비·광고매출
    p.markScene();
    await p.humanType(p.page.getByLabel("광고비"), "100000");
    await p.humanType(p.page.getByLabel("광고 매출 (광고로 발생한 매출)"), "500000");
    await p.hold(1.2);

    // 씬 3 — 결과 강조. 결과 패널이 길어 "현재 ROAS"(값 근처)를 잡아야
    // 손익분기·현재·판정이 한 화면에 들어온다 (헤더만 잡으면 값이 하단에 잘림)
    p.markScene();
    await p.showSection(p.page.getByText("현재 ROAS").first(), 2.5);
    await p.hold(1.2);
  },
};
