//////////////////////////////////////// #27-3 누끼 + 배경 교체 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";
import { uploadAssets } from "./_lib/upload";

export const scenario: Scenario = {
  id: "27-3",
  url: "/background-removal",
  recapItems: ["배경 자동 제거", "배경 교체 선택", "저장까지 한 번에"],
  run: async (p) => {
    await uploadAssets(p, "ep20", 3);
    await p.hold(0.8);
    await p.humanClick(p.page.getByRole("button", { name: "배경 제거" }), 0.5);
    await p.waitVisible(p.page.getByRole("button", { name: "다운로드" }), 180000);

    // 정차 1 — 제거 완료
    await p.showSection(p.page.getByText("완료").first(), 2);
    // 배경 선택 모달
    await p.humanClick(p.page.getByRole("button", { name: "배경 선택" }), 0.8);
    // 정차 2 — 배경 검색 UI
    await p.showSection(p.page.getByPlaceholder(/무료 배경 이미지 검색/).first(), 2.2);
    // 모달 확정
    await p.humanClick(p.page.getByRole("button", { name: "확인" }), 0.8);
    // 정차 3 — 다운로드
    await p.showSection(p.page.getByRole("button", { name: "다운로드" }).first(), 2);
  },
};
