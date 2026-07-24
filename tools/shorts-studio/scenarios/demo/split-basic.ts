//////////////////////////////////////// 데모 — 긴 상세 이미지 분할 ////////////////////////////////////////
import type { DemoScenario } from "./types";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";

const ASSETS = resolve(__dirname, "../../assets/ep-split");
const firstFile = () => {
  const f = readdirSync(ASSETS).find((n) => /\.(jpg|jpeg|png|webp)$/i.test(n));
  if (!f) throw new Error("assets/ep-split 에 이미지가 없습니다");
  return resolve(ASSETS, f);
};

export const demo: DemoScenario = {
  id: "split-basic",
  title: "긴 상세 이미지 마켓 규격에 맞게 자르기",
  url: "/image-split",
  hookText: "상세 이미지 길어서\n등록 거부당한 적",
  ctaText: "긴 상세\n자동 분할",
  scenes: [
    { title: "상세 이미지 올리기", caption: "세로로 긴 이미지를 그대로 올립니다" },
    { title: "자동 분할", caption: "마켓 높이 제한에 맞춰 잘립니다" },
    { title: "번호 붙여 받기", caption: "순서대로 번호가 붙어 묶입니다" },
  ],
  run: async (p) => {
    p.markScene();
    await p.page.locator('input[type="file"]').first().setInputFiles([firstFile()]);
    await p.hold(2.5);

    p.markScene();
    await p.humanClick(p.page.getByRole("button", { name: "분할하기" }).first(), 1.0);
    await p.waitLoaded(p.page.getByRole("button", { name: /다운로드/ }).first(), 60000);
    await p.hold(2.0);
    await p.smoothScrollBy(600, 3);

    p.markScene();
    await p.showSection(p.page.getByRole("button", { name: /다운로드/ }).first(), 2.6);
    await p.hold(1.5);
  },
};
