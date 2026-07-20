//////////////////////////////////////// 에피소드 빌더 (원커맨드) ////////////////////////////////////////
// 녹화 → 대본 파싱 결과와 병합 → 렌더. 사용: npm run episode -- 16 [2026-07]
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { record } from "./lib/recorder";

const STUDIO_ROOT = resolve(__dirname, "..");
const PROPS_DIR = join(STUDIO_ROOT, "out/props");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"; // 이 PC 우회 (README)

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const main = async () => {
  const [day, month = "2026-07"] = process.argv.slice(2);
  if (!day) {
    console.error("사용법: npm run episode -- 16 [2026-07]");
    process.exit(1);
  }

  ////////// 1) 시나리오 로드 + 녹화
  const scenarioPath = join(STUDIO_ROOT, "scenarios");
  const files = require("node:fs").readdirSync(scenarioPath) as string[];
  const file = files.find((f) => f.startsWith(`${day}-`));
  if (!file) throw new Error(`시나리오 없음: scenarios/${day}-*.ts`);
  const { scenario } = await import(pathToFileURL(join(scenarioPath, file)).href);
  console.log(`🎬 녹화 시작: ${file} (${process.env.SHORTS_BASE_URL ?? "production"})`);
  const rec = await record(scenario);
  console.log(`   완료 — ${rec.durationSec.toFixed(1)}초, 이벤트 ${rec.events.length}개`);

  ////////// 2) 대본 파싱 (없으면 실행)
  const propsPath = join(PROPS_DIR, `${month}-${day}.json`);
  if (!existsSync(propsPath)) {
    execSync(`npx tsx scripts/parse-script.ts ${month} ${day}`, { cwd: STUDIO_ROOT, stdio: "inherit" });
  }
  const props = JSON.parse(readFileSync(propsPath, "utf-8"));

  ////////// 3) 병합 — 녹화 실측값 주입
  const videoStartSec = 3;
  const resultCardSec = 5;
  props.videoSrc = rec.videoRelPath;
  props.videoStartSec = videoStartSec;
  props.resultCardSec = resultCardSec;
  props.durationSec = Math.round(videoStartSec + rec.durationSec + resultCardSec);
  props.resultTime = fmt(rec.durationSec); // ⏱ 실측 자동 기입 (녹화 실경과)
  // 오디오 — public/audio/ 에 파일 있으면 주입 (bgm.mp3 · sfx-done.mp3)
  props.bgmSrc = existsSync(join(STUDIO_ROOT, "public/audio/bgm.mp3")) ? "audio/bgm.mp3" : null;
  props.sfxDoneSrc = existsSync(join(STUDIO_ROOT, "public/audio/sfx-done.mp3")) ? "audio/sfx-done.mp3" : null;
  // 클릭 이벤트 → 줌 포커스 (영상 시작 오프셋 반영)
  props.focuses = rec.events
    .filter((e) => e.type === "click" && e.x !== undefined)
    .map((e) => ({ at: videoStartSec + e.t, x: e.x, y: e.y, scale: 1.6, holdSec: 1.6 }));
  // 자막 타임라인을 실측 길이에 맞게 비율 재배치 (대본 기준 24초 → 실제 길이)
  const scriptDemoEnd = 24;
  const realDemoEnd = videoStartSec + rec.durationSec;
  props.captions = props.captions.map((c: { from: number; to: number; text: string }) => ({
    ...c,
    from: c.from <= videoStartSec ? c.from : videoStartSec + ((c.from - videoStartSec) / (scriptDemoEnd - videoStartSec)) * (realDemoEnd - videoStartSec),
    to: videoStartSec + ((c.to - videoStartSec) / (scriptDemoEnd - videoStartSec)) * (realDemoEnd - videoStartSec),
  }));
  writeFileSync(propsPath, JSON.stringify(props, null, 2), "utf-8");

  ////////// 4) 렌더
  mkdirSync(join(STUDIO_ROOT, "out"), { recursive: true });
  const outPath = `out/${month}-${day}-숏츠.mp4`;
  console.log(`🎞 렌더: ${outPath}`);
  execSync(
    `npx remotion render TimerShort "${outPath}" --props="${propsPath}" --browser-executable="${CHROME}"`,
    { cwd: STUDIO_ROOT, stdio: "inherit" },
  );
  console.log(`✅ 완성: ${outPath} (실측 ${props.resultTime})`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
