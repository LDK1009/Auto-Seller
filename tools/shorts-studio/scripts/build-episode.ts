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

// 한국어 직관 표기 — "23초" / "1분 12초"
const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
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

  ////////// 2) 대본 파싱 — 항상 재파싱 (대본 md가 단일 소스, 캐시 금지)
  const propsPath = join(PROPS_DIR, `${month}-${day}.json`);
  execSync(`npx tsx scripts/parse-script.ts ${month} ${day}`, { cwd: STUDIO_ROOT, stdio: "inherit" });
  const props = JSON.parse(readFileSync(propsPath, "utf-8"));

  ////////// 3) 병합 — 녹화 실측값 주입
  const videoStartSec = 3;
  const resultCardSec = 5;
  // 로딩 공백 트림 — 로드 완료 0.3초 전부터 사용 (실측 시간도 작업 구간만)
  const trimSec = Math.max(0, rec.loadedSec - 0.3);
  const demoSec = rec.durationSec - trimSec;
  props.videoSrc = rec.videoRelPath;
  props.videoStartSec = videoStartSec;
  props.videoTrimSec = trimSec;
  props.resultCardSec = resultCardSec;
  props.durationSec = Math.round(videoStartSec + demoSec + resultCardSec);
  props.resultTime = fmt(demoSec); // ⏱ 실측 자동 기입 (로딩 제외 작업 구간)
  // 오디오·로고 — public/ 에 파일 있으면 주입
  props.bgmSrc = existsSync(join(STUDIO_ROOT, "public/audio/bgm.mp3")) ? "audio/bgm.mp3" : null;
  props.sfxDoneSrc = existsSync(join(STUDIO_ROOT, "public/audio/sfx-done.mp3")) ? "audio/sfx-done.mp3" : null;
  props.logoSrc = existsSync(join(STUDIO_ROOT, "public/logo.png")) ? "logo.png" : null;
  // 클릭 이벤트 → 줌 포커스: 줌아웃=전체 화면, 줌인=액션 섹션
  // 규칙: 초기 3초(화면 파악 구간) 줌 금지 · 포커스 간 최소 3초 간격 (스르륵 리듬)
  // 줌 포커스 — 1순위: 정차역(focus 이벤트, showSection이 남김) / 폴백: 클릭 이벤트
  const stations = rec.events.filter((e) => e.type === "focus" && e.x !== undefined);
  const clicks = rec.events.filter((e) => e.type === "click" && e.x !== undefined);
  const sources = stations.length > 0 ? stations : clicks;
  const isStationMode = stations.length > 0;
  const focuses: { at: number; x: number; y: number; scale: number; holdSec: number }[] = [];
  for (const e of sources) {
    const t = e.t - trimSec; // 트림 반영한 영상 시각
    // 정차역은 시나리오가 의도한 강조 지점 — 전부 유지. 간격 필터는 클릭 폴백에만
    if (!isStationMode) {
      if (t < 3) continue;
      const last = focuses[focuses.length - 1];
      if (last && t - (last.at - videoStartSec) < last.holdSec + 2.5) continue;
    }
    focuses.push({ at: videoStartSec + t, x: e.x!, y: e.y!, scale: 1.9, holdSec: e.holdSec ?? 2.2 });
  }
  props.focuses = focuses;
  // 엔딩 리캡 (에피소드별 커스텀은 파서 확장 예정 — 기본값)
  props.recapItems = ["카테고리 자동 추천", "상품명 검사", "판매가 마진 계산", "태그 후보까지"];
  // 자막 배치 — 1순위: 정차역 스냅 (자막 수 = 정차역 수 + 1일 때 1:1 매칭) / 폴백: 비례 재배치
  // 마지막 자막은 엔딩 카드 시작 직전에 끝냄 — durationSec 반올림 오차로 카드와 겹치는 것 방지
  const cardStartSec = props.durationSec - resultCardSec;
  const realDemoEnd = Math.min(videoStartSec + demoSec, cardStartSec - 0.1);
  const stationTimes = stations.map((e) => videoStartSec + (e.t - trimSec));
  type Cap = { from: number; to: number; text: string };
  if (stationTimes.length > 0 && props.captions.length === stationTimes.length + 1) {
    props.captions = (props.captions as Cap[]).map((c, i) => ({
      text: c.text,
      from: i === 0 ? videoStartSec : stationTimes[i - 1],
      to: i === 0 ? stationTimes[0] : i < stationTimes.length ? stationTimes[i] : realDemoEnd,
    }));
    console.log(`   자막 ${props.captions.length}줄 → 정차역 ${stationTimes.length}곳에 스냅`);
  } else {
    const scriptDemoEnd = 24;
    props.captions = (props.captions as Cap[]).map((c) => ({
      ...c,
      from: c.from <= videoStartSec ? c.from : videoStartSec + ((c.from - videoStartSec) / (scriptDemoEnd - videoStartSec)) * (realDemoEnd - videoStartSec),
      to: videoStartSec + ((c.to - videoStartSec) / (scriptDemoEnd - videoStartSec)) * (realDemoEnd - videoStartSec),
    }));
    console.log(`   자막 비례 배치 (정차역 ${stationTimes.length} vs 자막 ${props.captions.length} — 스냅 조건 불일치)`);
  }
  writeFileSync(propsPath, JSON.stringify(props, null, 2), "utf-8");

  ////////// 4) 렌더 — 완성본은 컨텐츠 폴더(원고 옆)에 저장, 대표는 폴더에서 바로 예약 업로드
  const contentDir = resolve(STUDIO_ROOT, `../../docs/마케팅/컨텐츠/${month}/${day}`);
  mkdirSync(contentDir, { recursive: true });
  const outPath = join(contentDir, "숏츠.mp4");
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
