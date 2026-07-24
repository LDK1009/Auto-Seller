//////////////////////////////////////// 데모 — 이미지 여러 장 배경 제거 ////////////////////////////////////////
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
  id: "nukki-basic",
  title: "이미지 여러 장 배경 제거",
  url: "/background-removal",
  hookText: "배경 지우는 데\n몇 시간씩 쓰고 계신가요?",
  ctaText: "이미지 여러 장,\n한 번에 배경 제거",
  scenes: [
    { title: "이미지 올리기", caption: "가공할 상품 사진을 한 번에 올립니다" },
    { title: "배경 제거", caption: "버튼 한 번이면 전부 처리됩니다" },
    { title: "내려받기", caption: "완성된 이미지를 묶어서 받습니다" },
  ],
  run: async (p) => {
    // 씬 1 — 업로드
    p.markScene();
    await p.page.locator('input[type="file"]').first().setInputFiles(files(4));
    await p.hold(2.5);
    await p.showSection(p.page.getByRole("button", { name: "배경 제거" }).first(), 2.2);

    // 씬 2 — 처리
    p.markScene();
    await p.humanClick(p.page.getByRole("button", { name: "배경 제거" }).first(), 1.0);
    await p.waitLoaded(p.page.getByRole("button", { name: "다운로드" }).first(), 240000);
    await p.hold(2.0);

    // 씬 3 — 다운로드
    p.markScene();
    await p.showSection(p.page.getByRole("button", { name: "다운로드" }).first(), 2.6);
    await p.hold(1.5);
  },
};
