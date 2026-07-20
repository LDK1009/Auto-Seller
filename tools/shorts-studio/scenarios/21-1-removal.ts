//////////////////////////////////////// #21-1 누끼 일괄 처리 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";
import { uploadAssets } from "./_lib/upload";

export const scenario: Scenario = {
  id: "21-1",
  url: "/background-removal",
  recapItems: ["여러 장 동시 업로드", "배경 자동 제거", "ZIP 일괄 저장"],
  run: async (p) => {
    await uploadAssets(p, "ep20", 8);
    await p.hold(0.8);
    await p.humanClick(p.page.getByRole("button", { name: "배경 제거" }), 0.5);

    // 정차 1 — 진행률
    await p.waitVisible(p.page.getByText("전체 진행률").first(), 90000);
    await p.showSection(p.page.getByText("전체 진행률").first(), 2);

    // 완료 대기 — 다운로드 버튼 등장
    await p.waitVisible(p.page.getByRole("button", { name: "다운로드" }), 180000);
    // 정차 2 — 완료 집계
    await p.showSection(p.page.getByText("완료").first(), 2);
    // 정차 3 — 다운로드 버튼
    await p.showSection(p.page.getByRole("button", { name: "다운로드" }).first(), 2.2);
  },
};
