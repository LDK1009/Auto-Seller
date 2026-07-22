//////////////////////////////////////// 롱폼 props 스키마 ////////////////////////////////////////
import { z } from "zod";

////////// 나레이션 1줄 = TTS 1호출 = (강조 시) 자막 1줄
export const lineSchema = z.object({
  text: z.string(),
  audioSrc: z.string(), // public/ 기준 (tts/xxx.mp3)
  from: z.number(), // 시작 프레임
  durationInFrames: z.number(),
  isStation: z.boolean(), // 정차역 — 화면 강조 시점
  showCaption: z.boolean(), // 롱폼 자막 표시 여부 (AI 티 방지: 강조 문장만)
});

////////// 화면 소스 4종
export const screenSchema = z.discriminatedUnion("kind", [
  // 정적 이미지 — 긴 캡처는 스크롤, 짧으면 켄번스(줌·팬)
  z.object({ kind: z.literal("image"), src: z.string(), scroll: z.boolean() }),
  // 실시간 녹화 — 길이 안 맞으면 배속/정지로 흡수. isOurService면 URL 배지 + 강조 링
  z.object({
    kind: z.literal("video"),
    src: z.string(),
    trimSec: z.number(),
    playbackRate: z.number(),
    isOurService: z.boolean().default(false),
    focuses: z
      .array(z.object({ at: z.number(), x: z.number(), y: z.number(), w: z.number(), h: z.number(), holdSec: z.number() }))
      .default([]),
  }),
  // 표 슬라이드 — 원본 표를 코드로 재현. highlights[]는 나레이션 문장별로 강조할 행 인덱스
  z.object({
    kind: z.literal("slide"),
    heading: z.string(),
    tableId: z.string(),
    // 문장 프레임 구간마다 강조할 행 — [{ from, to, row }]
    highlights: z.array(z.object({ from: z.number(), to: z.number(), row: z.number() })).default([]),
  }),
  // 아웃트로 — 핵심 요약 3줄 + 구독·댓글 CTA (갑자기 끝나는 느낌 방지)
  z.object({ kind: z.literal("outro"), summary: z.array(z.string()) }),
  // 화면 없음 — 직전 화면 유지 (인트로 카드 금지 규칙)
  z.object({ kind: z.literal("hold") }),
]);

export const chapterSchema = z.object({
  index: z.number(),
  title: z.string(),
  from: z.number(),
  durationInFrames: z.number(),
  screen: screenSchema,
});

export const longformSchema = z.object({
  videoTitle: z.string(),
  durationInFrames: z.number(),
  lines: z.array(lineSchema),
  chapters: z.array(chapterSchema),
  captionVariant: z.number(), // 편별 자막 위치 변주 (0-2) — 제목 해시 기반 결정적
});

export type LongformProps = z.infer<typeof longformSchema>;
export type Line = z.infer<typeof lineSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
