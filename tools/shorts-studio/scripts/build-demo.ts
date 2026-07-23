//////////////////////////////////////// 데모 영상 빌더 ////////////////////////////////////////
// 기능 시연 영상 생성. 사용: npm run demo -- nukki-basic  |  npm run demo -- --all
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { record, FFMPEG } from "./lib/recorder";
import type { DemoScenario } from "../scenarios/demo/types";

const FPS = 30;
const STUDIO_ROOT = resolve(__dirname, "..");
const PROPS_DIR = join(STUDIO_ROOT, "out/props");
const OUT_DIR = resolve(STUDIO_ROOT, "../../docs/마케팅/영상/데모");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const sec2frames = (sec: number) => Math.round(sec * FPS);

// id는 파일 경로·셸 명령에 들어가므로 화이트리스트로 제한 (영숫자·하이픈만)
const isSafeId = (id: string) => /^[a-z0-9-]+$/i.test(id);

const buildOne = async (id: string) => {
  if (!isSafeId(id)) throw new Error(`잘못된 id: ${id} (영문·숫자·하이픈만 허용)`);

  ////////// 1) 시나리오 로드
  const scenarioPath = join(STUDIO_ROOT, "scenarios/demo", `${id}.ts`);
  if (!existsSync(scenarioPath)) throw new Error(`시나리오 없음: scenarios/demo/${id}.ts`);
  const { demo } = (await import(pathToFileURL(scenarioPath).href)) as { demo: DemoScenario };

  ////////// 2) 녹화 (세로 모바일 — 쓰레드·릴스 기준)
  console.log(`\n🎬 ${demo.id} — ${demo.title}`);
  const rec = await record({ id: `demo-${demo.id}`, url: demo.url, run: demo.run });
  console.log(`   녹화 ${rec.durationSec.toFixed(1)}초 (로드 ${rec.loadedSec.toFixed(1)}초)`);

  ////////// 3) 프레임 시퀀스 추출 (mp4 seek 오작동 회피 — LONGFORM-PIPELINE.md)
  const trimSec = Math.max(0, rec.loadedSec - 0.3);
  const usableSec = rec.durationSec - trimSec;
  const frameDirName = `demo-${demo.id}-frames`;
  const frameDir = join(STUDIO_ROOT, "public/rec", frameDirName);
  rmSync(frameDir, { recursive: true, force: true });
  mkdirSync(frameDir, { recursive: true });
  execFileSync(
    FFMPEG,
    ["-y", "-ss", trimSec.toFixed(3), "-i", join(STUDIO_ROOT, "public", rec.videoRelPath), "-t", usableSec.toFixed(3), "-q:v", "4", join(frameDir, "%05d.jpg")],
    { stdio: "ignore" },
  );
  const frameCount = readdirSync(frameDir).filter((f) => f.endsWith(".jpg")).length;
  const srcFps = frameCount / usableSec;

  ////////// 4) 씬 타임라인 — markScene() 호출 시점으로 구간 분할
  const sceneMarks = rec.events.filter((e) => e.type === "scene").map((e) => Math.max(0, e.t - trimSec));
  const totalFrames = sec2frames(usableSec);
  if (sceneMarks.length !== demo.scenes.length) {
    console.warn(`   ⚠️ 씬 개수 불일치 — 정의 ${demo.scenes.length} vs markScene ${sceneMarks.length}. 균등 분할로 대체`);
  }
  const bounds =
    sceneMarks.length === demo.scenes.length
      ? sceneMarks
      : demo.scenes.map((_, i) => (usableSec / demo.scenes.length) * i);

  const scenes = demo.scenes.map((s, i) => {
    const from = sec2frames(bounds[i]);
    const to = i + 1 < bounds.length ? sec2frames(bounds[i + 1]) : totalFrames;
    return { title: s.title, caption: s.caption, from, durationInFrames: Math.max(1, to - from) };
  });

  ////////// 5) 강조 링
  const focuses = rec.events
    .filter((e) => e.type === "focus" && e.x !== undefined)
    .map((e) => ({ at: e.t - trimSec, x: e.x!, y: e.y!, w: e.w ?? 0, h: e.h ?? 0, holdSec: e.holdSec ?? 2 }))
    .filter((f) => f.at >= 0);

  ////////// 6) 렌더
  const props = {
    videoTitle: demo.title,
    durationInFrames: totalFrames,
    frameDir: `rec/${frameDirName}`,
    frameCount,
    srcFps: Number(srcFps.toFixed(3)),
    scenes,
    focuses,
  };
  mkdirSync(PROPS_DIR, { recursive: true });
  const propsPath = join(PROPS_DIR, `demo-${demo.id}.json`);
  writeFileSync(propsPath, JSON.stringify(props, null, 2), "utf-8");

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${demo.id}.mp4`);
  console.log(`   ${(totalFrames / FPS).toFixed(1)}초 · 씬 ${scenes.length} · 강조 ${focuses.length} → 렌더`);
  // 경로에 공백·한글이 있어 따옴표로 감싼다. id는 아래 isSafeId()로 검증되므로 인젝션 여지 없음.
  execSync(`npx remotion render Demo "${outPath}" --props="${propsPath}" --browser-executable="${CHROME}" --concurrency=8`, {
    cwd: STUDIO_ROOT,
    stdio: "ignore",
  });
  console.log(`   ✅ ${outPath}`);
};

const main = async () => {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const ids = all
    ? readdirSync(join(STUDIO_ROOT, "scenarios/demo"))
        .filter((f) => f.endsWith(".ts") && f !== "types.ts")
        .map((f) => f.replace(/\.ts$/, ""))
    : args.filter((a) => !a.startsWith("--"));

  if (ids.length === 0) {
    console.error("사용법: npm run demo -- nukki-basic  |  npm run demo -- --all");
    process.exit(1);
  }

  for (const id of ids) {
    try {
      await buildOne(id);
    } catch (e) {
      console.error(`   ❌ ${id} 실패: ${(e as Error).message.slice(0, 200)}`);
    }
  }
  console.log(`\n🎞 완료 — ${ids.length}편 처리`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
