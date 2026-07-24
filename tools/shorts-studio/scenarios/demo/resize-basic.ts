//////////////////////////////////////// 데모 — 규격 일괄 변환 ////////////////////////////////////////
import type { DemoScenario } from "./types";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";

const ASSETS = resolve(__dirname, "../../assets/products");
const files = (limit: number) =>
  readdirSync(ASSETS)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .slice(0, limit)
    .map((f) => resolve(ASSETS, f));

export const demo: DemoScenario = {
  id: "resize-basic",
  title: "이미지 규격 1000x1000으로 한 번에 맞추기",
  url: "/image-resize",
  hookText: "도매처 이미지\n크기가 제각각이죠",
  ctaText: "대표이미지 규격\n일괄 변환",
  scenes: [
    { title: "이미지 올리기", caption: "크기가 제각각인 이미지를 올립니다" },
    { title: "규격 변환", caption: "1000×1000으로 한 번에 맞춥니다" },
    { title: "ZIP으로 받기", caption: "변환된 이미지를 묶어서 받습니다" },
  ],
  run: async (p) => {
    p.markScene();
    await p.page.locator('input[type="file"]').first().setInputFiles(files(6));
    await p.hold(1.2);
    await p.showSection(p.page.getByRole("button", { name: "규격 변환" }).first(), 1.8);

    p.markScene();
    await p.humanClick(p.page.getByRole("button", { name: "규격 변환" }).first(), 1.0);
    await p.waitLoaded(p.page.getByRole("button", { name: "다운로드" }).first(), 60000);
    await p.hold(2.0);

    p.markScene();
    await p.showSection(p.page.getByRole("button", { name: "다운로드" }).first(), 2.4);
    await p.hold(1.2);
  },
};
