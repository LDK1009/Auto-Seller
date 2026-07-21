//////////////////////////////////////// TTS (일레븐랩스) ////////////////////////////////////////
// 문장 배열 → 문장별 mp3 + 실측 길이. 롱폼 타임라인의 기준이 되므로 길이는 반드시 파일에서 측정한다.
// 캐시: 문장 해시로 파일명을 만들어, 대본 한 줄 고쳤다고 전체가 재생성되지 않게 한다.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const AUDIO_DIR = resolve(__dirname, "../../public/tts");
const API_BASE = "https://api.elevenlabs.io/v1/text-to-speech";

// 다국어 모델 — 한국어 지원. Flash는 더 싸지만 억양이 단조로워 나레이션엔 v2를 쓴다.
const MODEL_ID = "eleven_multilingual_v2";

export type Line = {
  text: string;
  audioSrc: string; // public/ 기준 상대 경로 (staticFile 용)
  durationSec: number;
};

////////// 문장 해시 — 텍스트가 같으면 재생성하지 않는다 (크레딧 절약)
const hashOf = (text: string, voiceId: string) =>
  createHash("sha1").update(`${MODEL_ID}:${voiceId}:${text}`).digest("hex").slice(0, 16);

////////// mp3 실측 길이 — Remotion 번들 ffprobe 사용 (별도 의존성 불필요)
const measureSec = (filePath: string): number => {
  const out = execFileSync(
    "npx",
    ["remotion", "ffprobe", filePath, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0"],
    { cwd: resolve(__dirname, "../.."), encoding: "utf-8", shell: true },
  );
  const sec = Number.parseFloat(out.trim().split("\n").pop() ?? "");
  if (!Number.isFinite(sec) || sec <= 0) throw new Error(`오디오 길이 측정 실패: ${filePath} (출력: ${out})`);
  return sec;
};

////////// 일레븐랩스 호출 — 문장 1개 → mp3
const synthesize = async (text: string, voiceId: string, apiKey: string): Promise<Buffer> => {
  const response = await fetch(`${API_BASE}/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      // 나레이션용 — 안정성을 조금 높여 문장 간 톤 편차를 줄인다
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`일레븐랩스 오류 ${response.status}: ${detail.slice(0, 300)}`);
  }
  return Buffer.from(await response.arrayBuffer());
};

////////// 메인 — 문장 배열을 순서대로 처리 (캐시 히트는 즉시 반환)
export const generateNarration = async (texts: string[]): Promise<Line[]> => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY 없음 — .env.local 확인");
  if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID 없음 — .env.local 확인");

  mkdirSync(AUDIO_DIR, { recursive: true });
  const lines: Line[] = [];
  let generated = 0;
  let cached = 0;

  for (const text of texts) {
    const name = `${hashOf(text, voiceId)}.mp3`;
    const filePath = join(AUDIO_DIR, name);

    if (!existsSync(filePath)) {
      const audio = await synthesize(text, voiceId, apiKey);
      writeFileSync(filePath, audio);
      generated += 1;
    } else {
      cached += 1;
    }

    lines.push({ text, audioSrc: `tts/${name}`, durationSec: measureSec(filePath) });
  }

  console.log(`🎙 나레이션 ${lines.length}줄 — 신규 ${generated} / 캐시 ${cached}`);
  return lines;
};
