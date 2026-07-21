//////////////////////////////////////// 녹화 러너 ////////////////////////////////////////
// 세로 뷰포트(414×896) 크로미움 컨텍스트에서 시나리오 실행 + webm 녹화 + 이벤트 로그 저장.
import { chromium } from "playwright";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { HumanPage, type DemoEvent } from "./humanize";

// 모바일 뷰 녹화 (9:16 근접) — 숏츠 판독성·시청자 화면 재현감 (2026-07-20 확정)
// 캡처는 뷰포트 동일 크기 (확대 캡처는 좌상단 고정 버그 — 리모션에서 업스케일로 소화)
export const VIEWPORT = { width: 414, height: 896 };
const PUBLIC_REC = resolve(__dirname, "../../public/rec");
const OUT_LOG = resolve(__dirname, "../../out/rec");

export type Scenario = {
  id: string; // 에피소드 번호 (예: "16")
  url: string; // 시작 경로 (BASE_URL 기준)
  recapItems?: string[]; // 엔딩 리캡 (에피소드별 "한 일" 체크 목록)
  run: (p: HumanPage) => Promise<void>;
};

export type RecordResult = {
  videoRelPath: string; // public/ 기준 상대 경로 (staticFile 용)
  durationSec: number;
  loadedSec: number; // 로딩 완료 시각 — 앞부분 트림 기준
  events: DemoEvent[];
};

// 기본은 로컬 dev 서버 — 자동화가 프로덕션 GA를 오염시키지 않도록 (2026-07-21).
// 프로덕션 대상이 꼭 필요하면 SHORTS_BASE_URL=https://www.auto-seller.co.kr 로 명시.
export const BASE_URL = process.env.SHORTS_BASE_URL ?? "http://localhost:3000";

// 자동화 트래픽이 GA에 잡히지 않도록 애널리틱스 요청 차단 (로컬도 NEXT_PUBLIC_GA_ID가 있어 gtag가 붙음)
export const ANALYTICS_BLOCK = [
  "**googletagmanager.com/**",
  "**google-analytics.com/**",
  "**analytics.google.com/**",
];

export const record = async (scenario: Scenario): Promise<RecordResult> => {
  mkdirSync(PUBLIC_REC, { recursive: true });
  mkdirSync(OUT_LOG, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: PUBLIC_REC, size: VIEWPORT },
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
  });
  // 애널리틱스 차단 — 자동화 트래픽이 GA 지표를 오염시키지 않도록
  for (const pattern of ANALYTICS_BLOCK) await context.route(pattern, (route) => route.abort());

  // 비디오 녹화는 페이지 생성 시점부터 시작 — 이벤트 시각은 이 기준으로 기록해야 영상과 싱크됨
  const recStart = Date.now();
  const page = await context.newPage();
  const human = new HumanPage(page, VIEWPORT);
  human.markRecordStart(recStart);

  await human.start(`${BASE_URL}${scenario.url}`);
  await scenario.run(human);
  await human.hold(2); // 종료 버퍼 — 화면 뚝 끊김 방지
  const durationSec = (Date.now() - recStart) / 1000;

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

  return { videoRelPath: `rec/${finalName}`, durationSec, loadedSec: human.loadedSec, events: human.events };
};
