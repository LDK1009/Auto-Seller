//////////////////////////////////////// 데모 영상 빌더 ////////////////////////////////////////
// 기능 시연 영상 생성. 사용: npm run demo -- nukki-basic  |  npm run demo -- --all
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { record, FFMPEG, VIEWPORT_TALL } from "./lib/recorder";
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

  ////////// 2) 녹화 — PC뷰 기본 (줌으로 영역을 채운다)
  console.log(`\n🎬 ${demo.id} — ${demo.title}`);
  const rec = await record({ id: `demo-${demo.id}`, url: demo.url, tall: true, run: demo.run });
  console.log(`   녹화 ${rec.durationSec.toFixed(1)}초 (로드 ${rec.loadedSec.toFixed(1)}초)`);

  ////////// 3) 프레임 시퀀스 추출 (mp4 seek 오작동 회피 — LONGFORM-PIPELINE.md)
  const trimSec = Math.max(0, rec.loadedSec - 0.3);
  const rawSec = rec.durationSec - trimSec;
  const frameDirName = `demo-${demo.id}-frames`;
  const frameDir = join(STUDIO_ROOT, "public/rec", frameDirName);
  rmSync(frameDir, { recursive: true, force: true });
  mkdirSync(frameDir, { recursive: true });
  execFileSync(
    FFMPEG,
    ["-y", "-ss", trimSec.toFixed(3), "-i", join(STUDIO_ROOT, "public", rec.videoRelPath), "-t", rawSec.toFixed(3), "-q:v", "4", join(frameDir, "%05d.jpg")],
    { stdio: "ignore" },
  );
  const frameCount = readdirSync(frameDir).filter((f) => f.endsWith(".jpg")).length;
  const srcFps = frameCount / rawSec;

  ////////// 4) 로딩 구간 제거 — 시청자는 기다려주지 않는다
  const rel = (t: number) => Math.max(0, t - trimSec);
  const loads: { from: number; to: number }[] = [];
  let openAt: number | null = null;
  for (const e of rec.events) {
    if (e.type === "loadStart") openAt = rel(e.t);
    else if (e.type === "loadEnd" && openAt !== null) {
      // 0.4초는 남겨 화면 전환이 뚝 끊기지 않게
      if (rel(e.t) - openAt > 0.6) loads.push({ from: openAt + 0.2, to: rel(e.t) - 0.2 });
      openAt = null;
    }
  }
  const segments: { from: number; to: number }[] = [];
  let cursor = 0;
  for (const load of loads) {
    if (load.from > cursor) segments.push({ from: cursor, to: load.from });
    cursor = load.to;
  }
  if (cursor < rawSec) segments.push({ from: cursor, to: rawSec });
  const usableSec = segments.reduce((sum, s) => sum + (s.to - s.from), 0);
  const cutSec = rawSec - usableSec;
  if (cutSec > 0.5) console.log(`   ✂️ 로딩 ${cutSec.toFixed(1)}초 제거 (${rawSec.toFixed(1)} → ${usableSec.toFixed(1)}초)`);

  // 원본 시각 → 출력 시각 (제거된 구간 반영)
  const toOut = (srcSec: number) => {
    let acc = 0;
    for (const seg of segments) {
      if (srcSec < seg.from) return acc;
      if (srcSec <= seg.to) return acc + (srcSec - seg.from);
      acc += seg.to - seg.from;
    }
    return acc;
  };

  ////////// 5) 씬 타임라인
  const rawMarks = rec.events.filter((e) => e.type === "scene").map((e) => rel(e.t)); // 원본 시각
  const sceneMarks = rawMarks.map(toOut); // 출력 시각
  const bodyFrames = sec2frames(usableSec);
  if (sceneMarks.length !== demo.scenes.length) {
    console.warn(`   ⚠️ 씬 개수 불일치 — 정의 ${demo.scenes.length} vs markScene ${sceneMarks.length}. 균등 분할로 대체`);
  }
  const bounds = sceneMarks.length === demo.scenes.length ? sceneMarks : demo.scenes.map((_, i) => (usableSec / demo.scenes.length) * i);

  const scenes = demo.scenes.map((s, i) => {
    const from = sec2frames(bounds[i]);
    const to = i + 1 < bounds.length ? sec2frames(bounds[i + 1]) : bodyFrames;
    return { title: s.title, caption: s.caption, from, durationInFrames: Math.max(1, to - from) };
  });

  ////////// 6) 강조 링 (출력 시각 기준)
  const focuses = rec.events
    .filter((e) => e.type === "focus" && e.x !== undefined)
    .map((e) => ({ at: toOut(rel(e.t)), x: e.x!, y: e.y!, w: e.w ?? 0.3, h: e.h ?? 0.12, holdSec: e.holdSec ?? 1.3 }))
    .filter((f) => f.at >= 0);

  ////////// 7) 오프닝 훅 — 결과 장면을 앞에 붙여 3초 안에 붙잡는다
  const hookSceneIdx = demo.hookAtScene ?? demo.scenes.length - 1;
  // 훅은 원본 시각 기준 (프레임 파일을 직접 고르므로). 결과가 보이는 시점 = 마지막 씬 + 여유
  const hookSrcSec = (rawMarks[Math.min(hookSceneIdx, rawMarks.length - 1)] ?? 0) + 1.2;
  const HOOK_FRAMES = 90; // 3초
  const CTA_FRAMES = 60;

  ////////// 8) 렌더
  const props = {
    videoTitle: demo.title,
    durationInFrames: HOOK_FRAMES + bodyFrames + CTA_FRAMES,
    frameDir: `rec/${frameDirName}`,
    frameCount,
    srcFps: Number(srcFps.toFixed(3)),
    srcW: VIEWPORT_TALL.width,
    srcH: VIEWPORT_TALL.height,
    segments,
    scenes,
    focuses,
    hook: { srcSec: hookSrcSec, text: demo.hookText, durationInFrames: HOOK_FRAMES },
    ctaText: demo.ctaText,
  };
  mkdirSync(PROPS_DIR, { recursive: true });
  const propsPath = join(PROPS_DIR, `demo-${demo.id}.json`);
  writeFileSync(propsPath, JSON.stringify(props, null, 2), "utf-8");

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${demo.id}.mp4`);
  console.log(`   ${(props.durationInFrames / FPS).toFixed(1)}초 (훅3 + 본편${(bodyFrames / FPS).toFixed(0)} + CTA2) · 씬 ${scenes.length} · 강조 ${focuses.length} → 렌더`);
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
