//////////////////////////////////////// 데모 — 텍스트 워터마크 일괄 ////////////////////////////////////////
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
  id: "watermark-text",
  title: "여러 장에 워터마크 한 번에 넣기",
  url: "/watermark",
  hookText: "공들인 이미지,\n그대로 퍼가더라고요",
  ctaText: "워터마크\n여러 장 한 번에",
  scenes: [
    { title: "이미지 올리기", caption: "워터마크를 넣을 이미지를 올립니다" },
    { title: "문구 입력", caption: "넣고 싶은 문구를 적습니다" },
    { title: "일괄 적용", caption: "올린 이미지 전부에 들어갑니다" },
  ],
  run: async (p) => {
    p.markScene();
    await p.page.locator('input[type="file"]').first().setInputFiles(files(4));
    await p.hold(2.0);

    p.markScene();
    await p.humanType(p.page.getByLabel("워터마크 문구"), "오토셀러스토어");
    await p.hold(1.5);

    p.markScene();
    await p.humanClick(p.page.getByRole("button", { name: "워터마크 적용" }).first(), 1.0);
    await p.waitLoaded(p.page.getByRole("button", { name: "다운로드" }).first(), 60000);
    await p.hold(2.0);
    await p.showSection(p.page.getByRole("button", { name: "다운로드" }).first(), 2.2);
  },
};
