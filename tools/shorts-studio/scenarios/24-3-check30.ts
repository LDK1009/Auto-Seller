//////////////////////////////////////// #24-3 규정 검사 30장 변주 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";
import { uploadAssets } from "./_lib/upload";

export const scenario: Scenario = {
  id: "24-3",
  url: "/image-check",
  recapItems: ["30장 일괄 검사", "적합·주의 자동 판정", "사유까지 표시"],
  run: async (p) => {
    await uploadAssets(p, "ep24");
    await p.waitVisible(p.page.getByRole("button", { name: "규격 변환으로 보내기" }), 60000);
    await p.hold(0.8);
    // 정차 1 — 판정 집계 바
    await p.showSection(p.page.getByRole("button", { name: "초기화" }).first(), 2);
    // 정차 2 — 개별 판정 사유 (비율 항목)
    await p.showSection(p.page.getByText("비율").first(), 2);
    // 정차 3 — 변환 전송 버튼
    await p.showSection(p.page.getByRole("button", { name: "규격 변환으로 보내기" }).first(), 2.2);
  },
};
