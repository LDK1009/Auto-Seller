//////////////////////////////////////// 데모 — 규정 검사 ////////////////////////////////////////
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
  id: "check-basic",
  title: "이미지 규격 맞는지 한 번에 검사",
  url: "/image-check",
  hookText: "규격 안 맞아서\n등록 막힌 적 있죠",
  ctaText: "대표이미지 규격\n한 번에 검사",
  scenes: [
    { title: "이미지 올리기", caption: "확인할 이미지를 한 번에 올립니다" },
    { title: "자동 검사", caption: "해상도·비율·용량을 확인합니다" },
    { title: "변환으로 연결", caption: "안 맞는 것만 바로 고칩니다" },
  ],
  run: async (p) => {
    p.markScene();
    await p.page.locator('input[type="file"]').first().setInputFiles(files(8));
    await p.hold(2.5);

    // 검사 결과 카드가 뜨는 것으로 완료 판정 ([규격 변환으로 보내기] 버튼은
    // 부적합 항목이 있을 때만 노출돼 대기 대상으로 부적합)
    p.markScene();
    await p.waitLoaded(p.page.getByText(/적합|주의|부적합/).first(), 60000);
    await p.hold(1.2);
    await p.smoothScrollBy(400, 1.5);

    p.markScene();
    await p.showSection(p.page.getByText(/적합|주의|부적합/).first(), 2.4);
    await p.hold(1.0);
  },
};
