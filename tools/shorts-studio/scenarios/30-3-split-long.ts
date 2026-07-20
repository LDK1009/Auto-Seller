//////////////////////////////////////// #30-3 상세 분할 — 초장문 변주 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";
import { uploadAssets } from "./_lib/upload";

export const scenario: Scenario = {
  id: "30-3",
  url: "/image-split",
  recapItems: ["초장문 이미지 업로드", "규격 높이 자동 분할", "여러 장으로 저장"],
  run: async (p) => {
    await uploadAssets(p, "ep-split", 2);
    await p.hold(0.8);
    // 정차 1 — 프리셋
    await p.showSection(p.page.getByText("2,000px").first(), 2);
    // 분할
    await p.humanClick(p.page.getByRole("button", { name: "분할하기" }), 0.5);
    await p.waitVisible(p.page.getByRole("button", { name: /다운로드/ }), 60000);
    // 정차 2 — 조각 수
    await p.showSection(p.page.getByText(/다운로드 \(총 \d+조각\)/).first(), 2);
    // 정차 3 — 완료 집계
    await p.showSection(p.page.getByText("완료").first(), 2.2);
  },
};
