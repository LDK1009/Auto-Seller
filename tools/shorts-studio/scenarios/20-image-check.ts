//////////////////////////////////////// #5 규정 검사 → 규격 변환 콤보 ////////////////////////////////////////
// 이미지 20장 업로드 → 자동 판정 → 걸린 것만 규격 변환으로 전송 → 1000×1000 일괄 변환 완료
// 정차역 3곳: ①판정 집계 ②1000×1000 프리셋 ③완료 집계
//
// 데모 이미지 (assets/ep20, gitignore — 아래 커맨드로 재생성):
//   비정방형 12장(비율 "주의" 유도): curl -sL "https://picsum.photos/seed/ep20-wide-NN/1200/800.jpg"
//   정방형 8장(적합):               curl -sL "https://picsum.photos/seed/ep20-sq-NN/1000/1000.jpg"
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Scenario } from "../scripts/lib/recorder";

const ASSETS = resolve(__dirname, "../assets/ep20");

export const scenario: Scenario = {
  id: "20",
  url: "/image-check",
  recapItems: ["규정 자동 검사", "변환으로 바로 전송", "1000×1000 일괄 변환", "바로 다운로드"],
  run: async (p) => {
    // 이미지 20장 업로드 (input[type=file]은 숨김 — setInputFiles 직접 주입)
    const files = readdirSync(ASSETS)
      .filter((f) => f.endsWith(".jpg"))
      .map((f) => join(ASSETS, f));
    await p.page.locator('input[type="file"]').setInputFiles(files);

    // 판정 완료 대기 — 주의/부적합 있으면 [규격 변환으로 보내기] 버튼 등장
    await p.waitVisible(p.page.getByRole("button", { name: "규격 변환으로 보내기" }));
    await p.hold(0.8);

    // 정차 1 — 판정 집계 바 (적합/주의/부적합 카운트 + 초기화 버튼이 같은 카드)
    // "주의" 텍스트는 상단 종합 칩에도 있어 조상 오탐 — 집계 바 고유 요소인 초기화 버튼 기준
    await p.showSection(p.page.getByRole("button", { name: "초기화" }).first(), 2);

    // 규격 변환으로 전송 (페이지 이동)
    await p.humanClick(p.page.getByRole("button", { name: "규격 변환으로 보내기" }), 1);

    // 정차 2 — 1000×1000 프리셋 (기본 선택 상태)
    const preset = p.page.getByText("대표 1000×1000").first();
    await p.waitVisible(preset);
    await p.showSection(preset, 2);

    // 일괄 변환 실행 → 완료 대기 ([다운로드] 버튼 = 완료 & 비진행)
    await p.humanClick(p.page.getByRole("button", { name: "규격 변환" }), 0.5);
    await p.waitVisible(p.page.getByRole("button", { name: "다운로드" }), 90000);

    // 정차 3 — 완료 집계
    await p.showSection(p.page.getByText("완료").first(), 2.2);
  },
};
