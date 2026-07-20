//////////////////////////////////////// #31-3 누끼 30장 대량 변주 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";
import { uploadAssets } from "./_lib/upload";

export const scenario: Scenario = {
  id: "31-3",
  url: "/background-removal",
  recapItems: ["30장 한 번에 업로드", "배경 자동 제거", "ZIP 하나로 저장"],
  run: async (p) => {
    await uploadAssets(p, "ep24", 12); // 12장 (30장은 배경제거 5분 초과 — 시연 길이 제한)
    await p.hold(0.8);
    await p.humanClick(p.page.getByRole("button", { name: "배경 제거" }), 0.5);

    await p.waitVisible(p.page.getByText("전체 진행률").first(), 90000);
    // 정차 1 — 진행률
    await p.showSection(p.page.getByText("전체 진행률").first(), 2);
    // 완료 대기
    await p.waitVisible(p.page.getByRole("button", { name: "다운로드" }), 300000);
    // 정차 2 — 완료 집계
    await p.showSection(p.page.getByText("완료").first(), 2);
    // 정차 3 — 다운로드
    await p.showSection(p.page.getByRole("button", { name: "다운로드" }).first(), 2.2);
  },
};
