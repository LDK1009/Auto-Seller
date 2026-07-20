//////////////////////////////////////// #22-3 규격 맞추기 단독 (1000×1000) ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";
import { uploadAssets } from "./_lib/upload";

export const scenario: Scenario = {
  id: "22-3",
  url: "/image-resize",
  recapItems: ["사이즈 제각각 업로드", "1000×1000 프리셋", "일괄 변환 완료"],
  run: async (p) => {
    await uploadAssets(p, "ep20", 10);
    await p.hold(0.8);
    // 정차 1 — 1000×1000 프리셋 (기본 선택)
    await p.showSection(p.page.getByText("대표 1000×1000").first(), 2);
    // 변환 실행
    await p.humanClick(p.page.getByRole("button", { name: "규격 변환" }), 0.5);
    await p.waitVisible(p.page.getByRole("button", { name: "다운로드" }), 90000);
    // 정차 2 — 완료 집계
    await p.showSection(p.page.getByText("완료").first(), 2);
    // 정차 3 — 다운로드
    await p.showSection(p.page.getByRole("button", { name: "다운로드" }).first(), 2.2);
  },
};
