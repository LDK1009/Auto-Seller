//////////////////////////////////////// 데모 — 규정 검사 ////////////////////////////////////////
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
  id: "check-basic",
  title: "이미지 규격 맞는지 한 번에 검사",
  url: "/image-check",
  scenes: [
    { title: "이미지 올리기", caption: "확인할 이미지를 한 번에 올립니다" },
    { title: "자동 검사", caption: "해상도·비율·용량을 확인합니다" },
    { title: "변환으로 연결", caption: "안 맞는 것만 바로 고칠 수 있습니다" },
  ],
  run: async (p) => {
    p.markScene();
    await p.page.locator('input[type="file"]').first().setInputFiles(files(8));
    await p.hold(2.5);

    p.markScene();
    await p.waitVisible(p.page.getByRole("button", { name: "규격 변환으로 보내기" }).first(), 60000);
    await p.hold(2.0);
    await p.smoothScrollBy(500, 2.5);

    p.markScene();
    await p.showSection(p.page.getByRole("button", { name: "규격 변환으로 보내기" }).first(), 2.6);
    await p.hold(1.2);
  },
};
