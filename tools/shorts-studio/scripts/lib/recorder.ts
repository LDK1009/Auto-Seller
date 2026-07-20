//////////////////////////////////////// 녹화 러너 ////////////////////////////////////////
// 세로 뷰포트(414×896) 크로미움 컨텍스트에서 시나리오 실행 + webm 녹화 + 이벤트 로그 저장.
import { chromium } from "playwright";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { HumanPage, type DemoEvent } from "./humanize";

// PC 화면 녹화 (16:9) — 세로 프레임에서는 전체↔줌인 연출로 소화 (Cursorful 스타일)
export const VIEWPORT = { width: 1600, height: 900 };
const PUBLIC_REC = resolve(__dirname, "../../public/rec");
const OUT_LOG = resolve(__dirname, "../../out/rec");

export type Scenario = {
  id: string; // 에피소드 번호 (예: "16")
  url: string; // 시작 경로 (BASE_URL 기준)
  run: (p: HumanPage) => Promise<void>;
};

export type RecordResult = {
  videoRelPath: string; // public/ 기준 상대 경로 (staticFile 용)
  durationSec: number;
  events: DemoEvent[];
};

export const BASE_URL = process.env.SHORTS_BASE_URL ?? "https://www.auto-seller.co.kr";

export const record = async (scenario: Scenario): Promise<RecordResult> => {
  mkdirSync(PUBLIC_REC, { recursive: true });
  mkdirSync(OUT_LOG, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: PUBLIC_REC, size: VIEWPORT },
  });
  const page = await context.newPage();
  const human = new HumanPage(page, VIEWPORT);

  const started = Date.now();
  await human.start(`${BASE_URL}${scenario.url}`);
  await scenario.run(human);
  const durationSec = (Date.now() - started) / 1000;

  const video = page.video();
  await context.close(); // 녹화 파일 flush
  await browser.close();

  // 녹화 파일을 에피소드 이름으로 정리
  const rawPath = await video!.path();
  const finalName = `${scenario.id}.webm`;
  renameSync(rawPath, join(PUBLIC_REC, finalName));

  writeFileSync(
    join(OUT_LOG, `${scenario.id}-events.json`),
    JSON.stringify({ durationSec, events: human.events }, null, 2),
    "utf-8",
  );

  return { videoRelPath: `rec/${finalName}`, durationSec, events: human.events };
};
