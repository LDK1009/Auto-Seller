//////////////////////////////////////// #30-2 규격 맞추기 — 500×500 프리셋 변주 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";
import { uploadAssets } from "./_lib/upload";

export const scenario: Scenario = {
  id: "30-2",
  url: "/image-resize",
  recapItems: ["프리셋 전환", "여백 맞춤 (잘림 없음)", "일괄 변환 완료"],
  run: async (p) => {
    await uploadAssets(p, "ep20", 8);
    await p.hold(0.8);
    // 프리셋 전환 + 정차 1
    await p.humanClick(p.page.getByText("최소 500×500").first(), 0.6);
    await p.showSection(p.page.getByText("최소 500×500").first(), 2);
    // 정차 2 — 여백 맞춤 (기본)
    await p.showSection(p.page.getByText("여백 맞춤 (전체 보존)").first(), 2);
    // 변환
    await p.humanClick(p.page.getByRole("button", { name: "규격 변환" }), 0.5);
    await p.waitVisible(p.page.getByRole("button", { name: "다운로드" }), 90000);
    // 정차 3 — 완료
    await p.showSection(p.page.getByText("완료").first(), 2.2);
  },
};
