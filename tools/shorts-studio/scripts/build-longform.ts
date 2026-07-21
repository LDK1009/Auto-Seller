//////////////////////////////////////// 롱폼 빌더 (원커맨드) ////////////////////////////////////////
// 대본 파싱 → TTS → 녹화 → 타임라인 조립 → 렌더. 사용: npm run longform -- 22 [2026-07]
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseLongform } from "./parse-longform";
import { generateNarration } from "./lib/tts";
import { record } from "./lib/recorder";

const FPS = 30;
const STUDIO_ROOT = resolve(__dirname, "..");
const PROPS_DIR = join(STUDIO_ROOT, "out/props");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// 문장 간 간격 — 균일하면 AI 티가 난다 (규칙: MARKETING.md)
const GAP_DEFAULT = 0.35;
const GAP_AFTER_STATION = 0.8;
const GAP_AFTER_CHAPTER = 1.0;
// 화면이 먼저 보이고 말이 뒤따른다 — 챕터 첫 문장 지연
const CHAPTER_LEAD_IN = 0.8;

const sec2frames = (sec: number) => Math.round(sec * FPS);

////////// 화면 지시 → 소스 결정. smartstore-* 는 정적 캡처, 그 외는 녹화 시나리오
const isImageScreen = (screen: string) => screen.startsWith("smartstore-");
const isHoldScreen = (screen: string) => screen === "인트로";

// 앱의 public/marketing → 스튜디오 public/marketing 으로 복사하며 렌더용으로 축소.
// 원본 PNG(최대 1905×7951)를 매 프레임 디코딩하면 렌더가 5배 가까이 느려진다 → 폭 맞춤 + JPEG.
const RENDER_IMG_WIDTH = 1766; // 화면 폭 1920의 92% (LongForm.tsx와 일치)
const prepareImages = async (screens: string[]) => {
  const sharp = require("sharp");
  const srcDir = resolve(STUDIO_ROOT, "../../public/marketing");
  const outDir = join(STUDIO_ROOT, "public/marketing");
  mkdirSync(outDir, { recursive: true });
  for (const screen of screens) {
    const src = join(srcDir, `${screen}.png`);
    if (!existsSync(src)) throw new Error(`캡처 없음: public/marketing/${screen}.png`);
    const out = join(outDir, `${screen}.jpg`);
    const meta = await sharp(src).metadata();
    await sharp(src)
      .resize({ width: Math.min(RENDER_IMG_WIDTH, meta.width ?? RENDER_IMG_WIDTH), withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toFile(out);
  }
  console.log(`🖼  캡처 ${screens.length}장 렌더용 변환 (폭 ${RENDER_IMG_WIDTH}, JPEG)`);
};

const main = async () => {
  const [day, month = "2026-07"] = process.argv.slice(2);
  if (!day) {
    console.error("사용법: npm run longform -- 22 [2026-07]");
    process.exit(1);
  }

  ////////// 1) 대본 파싱
  const script = parseLongform(month, day);
  const allSentences = script.chapters.flatMap((c) => c.sentences);
  console.log(`📄 ${script.title}`);
  console.log(`   챕터 ${script.chapters.length} · 문장 ${allSentences.length}`);

  ////////// 2) TTS — 문장별 mp3 + 실측 길이 (해시 캐시)
  const narration = await generateNarration(allSentences.map((s) => s.text));

  ////////// 2-1) 캡처 이미지 준비 — 앱 public → 스튜디오 public (렌더용 축소)
  const imageScreens = [...new Set(script.chapters.map((c) => c.screen).filter(isImageScreen))];
  if (imageScreens.length > 0) await prepareImages(imageScreens);

  ////////// 3) 녹화 — 영상 화면이 필요한 챕터만
  const videoChapters = script.chapters.filter((c) => !isImageScreen(c.screen) && !isHoldScreen(c.screen) && c.screen !== "슬라이드");
  type Rec = { videoRelPath: string; durationSec: number; loadedSec: number; events: { type: string; t: number; x?: number; y?: number; w?: number; h?: number; holdSec?: number }[] };
  const recordings = new Map<string, Rec>();
  // 우리 서비스 화면 판정 — 이 경로들은 실제 도구. URL 배지 + 강조 링을 붙인다
  const OUR_SERVICE = new Set(["keyword-stats", "domeggook-import", "domeggook-search", "margin-calculator", "roas-calculator", "vat-calculator", "image-check", "image-resize", "watermark", "image-split", "excel-import", "background-removal"]);
  const scenarioDir = join(STUDIO_ROOT, "scenarios");
  const scenarioFiles = readdirSync(scenarioDir);

  for (const chapter of videoChapters) {
    const prefix = `${day}-ch${chapter.index}-`;
    const file = scenarioFiles.find((f) => f.startsWith(prefix));
    if (!file) throw new Error(`시나리오 없음: scenarios/${prefix}*.ts (챕터 ${chapter.index} "${chapter.title}")`);
    const { scenario } = await import(pathToFileURL(join(scenarioDir, file)).href);
    console.log(`🎬 녹화 ch${chapter.index}: ${file}`);
    const rec = await record(scenario);
    recordings.set(chapter.screen, rec);
    console.log(`   ${rec.durationSec.toFixed(1)}초 (로드 ${rec.loadedSec.toFixed(1)}초)`);
  }

  ////////// 4) 타임라인 조립 — 오디오 길이 누적이 기준
  let cursorSec = 0;
  let narrationIndex = 0;
  const lines: unknown[] = [];
  const chapters: unknown[] = [];

  for (const [chapterOrder, chapter] of script.chapters.entries()) {
    const chapterStartSec = cursorSec + (chapterOrder === 0 ? 0 : CHAPTER_LEAD_IN);
    cursorSec = chapterStartSec;

    for (const [sentenceOrder, sentence] of chapter.sentences.entries()) {
      const audio = narration[narrationIndex];
      narrationIndex += 1;
      const isLastOfChapter = sentenceOrder === chapter.sentences.length - 1;

      lines.push({
        text: sentence.text,
        audioSrc: audio.audioSrc,
        from: sec2frames(cursorSec),
        durationInFrames: sec2frames(audio.durationSec),
        isStation: sentence.isStation,
        // 전문장 자막 (2026-07-22 대표 판정 — 강조만 표시는 지루·정보 약함)
        showCaption: true,
      });

      const gap = isLastOfChapter ? GAP_AFTER_CHAPTER : sentence.isStation ? GAP_AFTER_STATION : GAP_DEFAULT;
      cursorSec += audio.durationSec + gap;
    }

    ////////// 화면 소스 — 챕터 길이에 맞춰 배속/스크롤 결정
    const chapterFrames = sec2frames(cursorSec - chapterStartSec);
    const chapterSec = chapterFrames / FPS;
    let screen: Record<string, unknown>;

    if (chapter.screen === "아웃트로") {
      // 마무리 챕터 — 정차역 문장을 요약 줄로. 없으면 앞 문장들에서 짧은 것 3개
      const summary = chapter.sentences.filter((s) => s.isStation).map((s) => s.text);
      screen = { kind: "outro", summary: summary.length ? summary : chapter.sentences.slice(0, 3).map((s) => s.text) };
    } else if (isHoldScreen(chapter.screen)) {
      screen = { kind: "hold" };
    } else if (chapter.screen === "슬라이드") {
      // 이미지·녹화 없는 개념 설명 챕터 — 정차역 문장을 불릿으로 자동 구성
      const bullets = chapter.sentences.filter((s) => s.isStation).map((s) => s.text);
      screen = { kind: "slide", heading: chapter.title, bullets: bullets.length ? bullets : [chapter.sentences[0]?.text ?? ""] };
    } else if (isImageScreen(chapter.screen)) {
      // full 캡처(세로 7951px)만 스크롤. 섹션 조각은 정지 표시
      screen = { kind: "image", src: `marketing/${chapter.screen}.jpg`, scroll: chapter.screen.endsWith("-full") };
    } else {
      const rec = recordings.get(chapter.screen)!;
      const trimSec = Math.max(0, rec.loadedSec - 0.3); // 로딩 공백 제거
      const usableSec = rec.durationSec - trimSec;
      // 녹화가 길면 배속으로 압축. 짧으면 늦춰서 늘리되 0.7배까지만 — 그 이하는 부자연스럽다.
      const raw = usableSec / chapterSec;
      const playbackRate = Number(Math.max(0.7, raw).toFixed(3));
      // 정차역(focus) 이벤트 → 화면 시각으로 변환. 원본시각 t → (t-trim)/배속 이 화면상 위치
      const focuses = rec.events
        .filter((e) => e.type === "focus" && e.x !== undefined)
        .map((e) => ({
          at: (e.t - trimSec) / playbackRate,
          x: e.x!,
          y: e.y!,
          w: e.w ?? 0,
          h: e.h ?? 0,
          holdSec: (e.holdSec ?? 2) / playbackRate,
        }))
        .filter((f) => f.at >= 0);
      screen = { kind: "video", src: rec.videoRelPath, trimSec, playbackRate, isOurService: OUR_SERVICE.has(chapter.screen), focuses };
      const covered = usableSec / playbackRate;
      const freeze = chapterSec - covered;
      console.log(
        `   ch${chapter.index} 화면 ${usableSec.toFixed(1)}초 / 나레이션 ${chapterSec.toFixed(1)}초 → 배속 ${playbackRate}` +
          (freeze > 1 ? `  ⚠️ 정지 ${freeze.toFixed(1)}초` : ""),
      );
      if (freeze > 5) {
        console.warn(
          `   ⚠️ ch${chapter.index} 시나리오가 짧다 — ${freeze.toFixed(0)}초간 정지 화면. scenarios/${day}-ch${chapter.index}-*.ts 에 조작·정차를 추가할 것`,
        );
      }
    }

    chapters.push({
      index: chapter.index,
      title: chapter.title,
      from: sec2frames(chapterStartSec),
      durationInFrames: chapterFrames,
      screen,
    });
  }

  ////////// 4-1) hold 챕터 흡수 — Sequence는 끝나면 언마운트되므로 "직전 화면 유지"가 저절로 되지 않는다.
  // 앞 챕터의 화면 Sequence를 hold 구간만큼 연장한다. 맨 앞 hold는 뒤 챕터 화면을 앞으로 당긴다.
  type Ch = { index: number; title: string; from: number; durationInFrames: number; screen: Record<string, unknown> };
  const merged: Ch[] = [];
  for (const raw of chapters as Ch[]) {
    if ((raw.screen as { kind: string }).kind !== "hold") {
      merged.push({ ...raw });
      continue;
    }
    const prev = merged[merged.length - 1];
    if (prev) {
      prev.durationInFrames += raw.durationInFrames; // 앞 화면을 계속 보여준다
    } else {
      // 첫 챕터가 hold — 뒤에서 처음 나오는 실제 화면을 앞으로 당긴다
      const next = (chapters as Ch[]).find((c) => (c.screen as { kind: string }).kind !== "hold");
      if (next) merged.push({ ...raw, screen: next.screen });
    }
  }
  console.log(`   화면 Sequence ${chapters.length} → ${merged.length} (hold 흡수)`);

  const durationInFrames = sec2frames(cursorSec) + FPS; // 끝 여백 1초
  // 편별 자막 위치 변주 — 제목 해시 기반(결정적). Math.random 금지: 재렌더 시 결과가 달라진다
  const captionVariant = Number.parseInt(createHash("sha1").update(script.title).digest("hex").slice(0, 2), 16) % 3;

  const props = { videoTitle: script.title, durationInFrames, lines, chapters: merged, captionVariant };
  mkdirSync(PROPS_DIR, { recursive: true });
  const propsPath = join(PROPS_DIR, `${month}-${day}-롱폼.json`);
  writeFileSync(propsPath, JSON.stringify(props, null, 2), "utf-8");

  const totalMin = durationInFrames / FPS / 60;
  console.log(`\n⏱  총 ${totalMin.toFixed(1)}분 (${durationInFrames}프레임) · 자막 ${lines.filter((l: any) => l.showCaption).length}줄`);

  ////////// 5) 렌더
  const contentDir = resolve(STUDIO_ROOT, `../../docs/마케팅/컨텐츠/${month}/${day}/롱폼`);
  mkdirSync(contentDir, { recursive: true });
  const sanitize = (s: string) => s.replace(/[?/:*"<>|]/g, "").trim();
  const outPath = join(contentDir, `${sanitize(script.title)}.mp4`);
  console.log(`🎞  렌더: ${outPath}  (예상 ${(totalMin * 3.6).toFixed(0)}분)\n`);

  // concurrency: 16코어 기준 8. 더 올리면 1920×1080 탭이 메모리를 먹어 오히려 느려진다
  execSync(
    `npx remotion render LongForm "${outPath}" --props="${propsPath}" --browser-executable="${CHROME}" --concurrency=8`,
    { cwd: STUDIO_ROOT, stdio: "inherit" },
  );
  console.log(`\n✅ 완성: ${outPath}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
