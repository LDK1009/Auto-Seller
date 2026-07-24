//////////////////////////////////////// 데모 — 누끼 후 배경색 교체 ////////////////////////////////////////
import type { DemoScenario } from "./types";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";

const ASSETS = resolve(__dirname, "../../assets/ep20");
const files = (limit: number) =>
  readdirSync(ASSETS)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .slice(0, limit)
    .map((f) => resolve(ASSETS, f));

export const demo: DemoScenario = {
  id: "nukki-bg-color",
  title: "배경 지운 다음 원하는 색으로 채우기",
  url: "/background-removal",
  hookText: "배경 지운 다음이\n더 고민이죠",
  ctaText: "배경 교체까지\n클릭 한 번",
  scenes: [
    { title: "배경 제거", caption: "먼저 배경을 지웁니다" },
    { title: "배경 고르기", caption: "지운 자리에 원하는 색을 넣습니다" },
    { title: "내려받기", caption: "바뀐 이미지를 묶어서 받습니다" },
  ],
  run: async (p) => {
    p.markScene();
    await p.page.locator('input[type="file"]').first().setInputFiles(files(2));
    await p.hold(1.5);
    await p.humanClick(p.page.getByRole("button", { name: "배경 제거" }).first(), 0.8);
    await p.waitLoaded(p.page.getByRole("button", { name: "다운로드" }).first(), 240000);
    await p.hold(1.2);

    p.markScene();
    // 결과 이미지를 눌러 편집 패널 열기 → 배경색 선택
    await p.smoothScrollBy(500, 2);
    await p.hold(2.5);

    p.markScene();
    await p.showSection(p.page.getByRole("button", { name: "다운로드" }).first(), 2.4);
    await p.hold(1.2);
  },
};
