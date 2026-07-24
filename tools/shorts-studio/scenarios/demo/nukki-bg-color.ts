//////////////////////////////////////// 데모 — 누끼 후 배경색 교체 ////////////////////////////////////////
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
  id: "nukki-bg-color",
  title: "배경 지운 다음 원하는 색으로 채우기",
  url: "/background-removal",
  hookText: "누끼 딴 다음\n배경은 뭘로 채우세요?",
  ctaText: "배경 교체까지\n클릭 한 번",
  scenes: [
    { title: "배경 제거", caption: "먼저 배경을 지웁니다" },
    { title: "배경 교체", caption: "흰 배경이든 컬러든 바로 바꿉니다" },
    { title: "ZIP으로 받기", caption: "바뀐 이미지를 묶어서 받습니다" },
  ],
  run: async (p) => {
    p.markScene();
    await p.page.locator('input[type="file"]').first().setInputFiles(files(2));
    await p.hold(1.5);
    await p.humanClick(p.page.getByRole("button", { name: "배경 제거" }).first(), 0.8);
    await p.waitLoaded(p.page.getByRole("button", { name: "다운로드" }).first(), 240000);
    await p.hold(1.2);

    p.markScene();
    // 배경 선택 모달 → 색상 팝오버 → 추천 색상 적용 (자막이 말하는 동작을 실제로 한다)
    await p.humanClick(p.page.getByRole("button", { name: "배경 선택" }).first(), 0.9);
    await p.humanClick(p.page.getByRole("button", { name: "배경 색상" }).first(), 0.7);
    await p.humanClick(p.page.getByRole("button", { name: "연블루" }).first(), 1.4);
    await p.humanClick(p.page.getByRole("button", { name: "흰색" }).first(), 1.6);
    await p.humanClick(p.page.getByRole("button", { name: "확인" }).first(), 1.2);

    p.markScene();
    await p.showSection(p.page.getByRole("button", { name: "다운로드" }).first(), 2.4);
    await p.hold(1.2);
  },
};
