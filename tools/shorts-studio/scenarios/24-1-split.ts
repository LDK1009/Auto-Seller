//////////////////////////////////////// #24-1 상세 이미지 분할 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";
import { uploadAssets } from "./_lib/upload";

export const scenario: Scenario = {
  id: "24-1",
  url: "/image-split",
  recapItems: ["긴 상세 이미지 업로드", "규격 높이 분할", "ZIP 저장"],
  run: async (p) => {
    await uploadAssets(p, "ep-split", 1);
    await p.hold(0.8);
    // 정차 1 — 분할 높이 프리셋
    await p.showSection(p.page.getByText("2,000px").first(), 2);
    // 분할 실행
    await p.humanClick(p.page.getByRole("button", { name: "분할하기" }), 0.5);
    await p.waitVisible(p.page.getByRole("button", { name: /다운로드/ }), 60000);
    // 정차 2 — 분할 결과 (조각 수)
    await p.showSection(p.page.getByText(/다운로드 \(총 \d+조각\)/).first(), 2);
    // 정차 3 — 완료 집계
    await p.showSection(p.page.getByText("완료").first(), 2.2);
  },
};
