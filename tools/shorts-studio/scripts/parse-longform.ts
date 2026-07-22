//////////////////////////////////////// 롱폼 대본 파서 ////////////////////////////////////////
// 대본.md → 챕터·문장·화면 지시 구조. 사용: npx tsx scripts/parse-longform.ts 2026-07 22
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const CONTENT_ROOT = resolve(__dirname, "../../../docs/마케팅/컨텐츠");

export type Sentence = {
  text: string; // 나레이션 1줄 = TTS 1호출 = 자막 1줄
  isStation: boolean; // (정차역) 표시 — 화면 강조 시점
  highlightRow?: number; // {행:N} — 표 슬라이드에서 이 문장이 나올 때 강조할 행
};

export type Chapter = {
  index: number; // 1부터
  title: string;
  screen: string; // [화면: xxx] 녹화/이미지/인트로/아웃트로, 또는 [표: id]면 "표:id"
  tableId?: string; // [표: id] 인 경우
  sentences: Sentence[];
};

export type LongformScript = {
  title: string; // 유튜브 제목 = mp4 파일명
  keyword: string; // 조준 검색어
  type: string;
  persona: string;
  shortClips: number[]; // 숏폼으로 뽑을 챕터 번호
  chapters: Chapter[];
};

////////// 프론트매터 — `키: 값` 단순 파싱 (YAML 라이브러리 불필요한 수준)
const parseFrontmatter = (raw: string) => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("프론트매터(---) 없음");
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const sep = line.indexOf(":");
    if (sep < 0) continue;
    meta[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
  }
  return { meta, body: raw.slice(match[0].length) };
};

////////// 숏폼추출: [3, 5] → [3, 5]
const parseClipList = (value?: string): number[] => {
  if (!value) return [];
  return (value.match(/\d+/g) ?? []).map(Number);
};

export const parseLongform = (month: string, day: string): LongformScript => {
  const path = join(CONTENT_ROOT, month, day, "롱폼", "대본.md");
  const { meta, body } = parseFrontmatter(readFileSync(path, "utf-8"));

  const chapters: Chapter[] = [];
  let current: Chapter | null = null;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    ////////// 챕터 헤더 — "## 3. 제목"
    const heading = line.match(/^##\s*(\d+)\.\s*(.+)$/);
    if (heading) {
      current = { index: Number(heading[1]), title: heading[2].trim(), screen: "인트로", sentences: [] };
      chapters.push(current);
      continue;
    }

    ////////// 화면 지시 — "[화면: keyword-stats]"
    const screen = line.match(/^\[화면:\s*(.+?)\]$/);
    if (screen) {
      if (!current) throw new Error(`챕터 밖의 화면 지시: ${line}`);
      current.screen = screen[1].trim();
      continue;
    }

    ////////// 표 지시 — "[표: limit-5]" → 표 슬라이드
    const tableRef = line.match(/^\[표:\s*(.+?)\]$/);
    if (tableRef) {
      if (!current) throw new Error(`챕터 밖의 표 지시: ${line}`);
      current.screen = "슬라이드";
      current.tableId = tableRef[1].trim();
      continue;
    }

    ////////// 나레이션 — 줄 하나가 문장 하나. 앞에 (정차역) 또는 {행:N} 마커 가능
    if (!current) continue; // 헤더 앞 잡소리 무시
    const rowMatch = line.match(/^\{행:\s*(\d+)\}\s*/);
    const highlightRow = rowMatch ? Number(rowMatch[1]) : undefined;
    const afterRow = rowMatch ? line.slice(rowMatch[0].length) : line;
    const isStation = afterRow.startsWith("(정차역)") || highlightRow !== undefined;
    const text = afterRow.replace(/^\(정차역\)\s*/, "").trim();
    if (text) current.sentences.push({ text, isStation, highlightRow });
  }

  if (chapters.length === 0) throw new Error("챕터가 없음 — '## 1. 제목' 형식 확인");

  return {
    title: meta["제목"] ?? "제목없음",
    keyword: meta["검색어"] ?? "",
    type: meta["유형"] ?? "",
    persona: meta["페르소나"] ?? "",
    shortClips: parseClipList(meta["숏폼추출"]),
    chapters,
  };
};

////////// CLI — 구조 확인용 출력
if (require.main === module) {
  const [month = "2026-07", day = "22"] = process.argv.slice(2);
  const script = parseLongform(month, day);
  const total = script.chapters.reduce((sum, c) => sum + c.sentences.length, 0);
  const chars = script.chapters
    .flatMap((c) => c.sentences)
    .reduce((sum, s) => sum + s.text.replace(/\s/g, "").length, 0);

  console.log(`\n📄 ${script.title}`);
  console.log(`   검색어: ${script.keyword} · ${script.type} · ${script.persona}`);
  console.log(`   챕터 ${script.chapters.length} · 문장 ${total} · ${chars}자 (약 ${(chars / 340).toFixed(1)}분)`);
  console.log(`   숏폼추출: 챕터 ${script.shortClips.join(", ")}\n`);
  for (const c of script.chapters) {
    const stations = c.sentences.filter((s) => s.isStation).length;
    console.log(`   ${String(c.index).padStart(2)}. ${c.title.padEnd(26)} [${c.screen}] 문장 ${c.sentences.length}·정차역 ${stations}`);
  }
  console.log();
}
