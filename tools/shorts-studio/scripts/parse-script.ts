//////////////////////////////////////// 대본 파서 ////////////////////////////////////////
// docs/마케팅/컨텐츠/YYYY-MM/DD/숏츠.md → 컴포지션 props JSON
// 사용: npm run parse -- 2026-07 16  →  out/props/2026-07-16.json
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const CONTENT_ROOT = resolve(__dirname, "../../../docs/마케팅/컨텐츠");
const OUT_DIR = resolve(__dirname, "../out/props");

////////// 자막 타임라인 표 파싱 — "| 3~8 | 링크 붙여넣고 |"
const parseCaptions = (md: string) => {
  const captions: { from: number; to: number; text: string }[] = [];
  const rowRe = /^\|\s*(\d+)~(\d+)\s*\|\s*(.+?)\s*\|/gm;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(md))) {
    captions.push({ from: Number(m[1]), to: Number(m[2]), text: m[3] });
  }
  return captions;
};

////////// 훅 — "자막: **"..."**" (내부 **하이라이트** 마크업 보존 위해 탐욕 매치)
const parseHook = (md: string) => {
  const m = md.match(/자막:\s*\*\*"?(.+)"?\*\*/);
  return m ? m[1].replace(/"$/, "") : "타이머 켜고 재봤습니다";
};

////////// 결과 카드 — **"라벨, [실측: mm:ss]"** 형태에서 라벨 추출
const parseResult = (md: string) => {
  const section = md.split("## 결과 카드")[1] ?? "";
  const m = section.match(/\*\*"(.+?),?\s*\[실측[^\]]*\]"\*\*/);
  return m ? m[1].replace(/,$/, "") : "실측 결과";
};

const main = () => {
  const [month, day, scriptName = "숏츠"] = process.argv.slice(2);
  if (!month || !day) {
    console.error("사용법: npm run parse -- 2026-07 20 [숏츠2]");
    process.exit(1);
  }
  const mdPath = join(CONTENT_ROOT, month, day, `${scriptName}.md`);
  const md = readFileSync(mdPath, "utf-8");

  const props = {
    hook: parseHook(md),
    captions: parseCaptions(md),
    resultLabel: parseResult(md),
    resultTime: "0:00", // ⚠️ 촬영 실측값으로 교체 필수 (금지 체크 — 창작 금지)
    ctaLine: "링크는 프로필에 있어요", // 크리에이터 톤 (STYLE.md — 광고체 금지)
    commentLine: "재보고 싶은 작업은 댓글로 알려주세요",
    videoSrc: null as string | null, // 녹화 파일 경로 연결 (Phase B에서 자동)
    videoStartSec: 3,
    durationSec: 30,
    resultCardSec: 5,
    focuses: [] as unknown[],
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${month}-${day}-${scriptName}.json`);
  writeFileSync(outPath, JSON.stringify(props, null, 2), "utf-8");
  console.log(`✅ ${outPath}`);
  console.log(`   훅: ${props.hook}`);
  console.log(`   자막 ${props.captions.length}줄 / 결과 라벨: ${props.resultLabel}`);
};

main();
