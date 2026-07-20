//////////////////////////////////////// #25-3 워터마크 일괄 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";
import { uploadAssets } from "./_lib/upload";

export const scenario: Scenario = {
  id: "25-3",
  url: "/watermark",
  recapItems: ["스토어명 입력", "위치·투명도 설정", "일괄 적용 완료"],
  run: async (p) => {
    await uploadAssets(p, "ep20", 6);
    await p.hold(0.8);
    const text = p.page.getByLabel("워터마크 문구");
    await text.fill("");
    await p.humanType(text, "오토셀러스토어");
    // 정차 1 — 설정 영역
    await p.showSection(p.page.getByLabel("워터마크 문구").first(), 2);
    // 적용
    await p.humanClick(p.page.getByRole("button", { name: "워터마크 적용" }), 0.5);
    await p.waitVisible(p.page.getByRole("button", { name: "다운로드" }), 90000);
    // 정차 2 — 완료 집계
    await p.showSection(p.page.getByText("완료").first(), 2);
    // 정차 3 — 다운로드
    await p.showSection(p.page.getByRole("button", { name: "다운로드" }).first(), 2.2);
  },
};
