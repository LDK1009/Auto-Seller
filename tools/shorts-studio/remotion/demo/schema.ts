//////////////////////////////////////// 데모 영상 props ////////////////////////////////////////
// 기능 시연. PC뷰(가로) 녹화를 세로 프레임에 담되, 강조 구간은 줌인해서 꽉 채운다.
import { z } from "zod";

export const focusSchema = z.object({
  at: z.number(), // 출력 타임라인 기준 초 (로딩 트림 반영 후)
  x: z.number(), // 0~1 중심
  y: z.number(),
  w: z.number(), // 0~1 박스 크기
  h: z.number(),
  holdSec: z.number(),
});

export const demoSchema = z.object({
  videoTitle: z.string(),
  durationInFrames: z.number(),
  // 녹화 프레임 시퀀스 (jpg) — 로딩 구간은 segments로 걷어낸다
  frameDir: z.string(),
  frameCount: z.number(),
  srcFps: z.number(),
  srcW: z.number(), // 녹화 뷰포트 크기 — contain 여백 계산에 필요 (좌표 정확도)
  srcH: z.number(),
  // 유효 구간 — [원본시작초, 원본끝초]. 로딩 구간이 빠진 채로 이어붙는다
  segments: z.array(z.object({ from: z.number(), to: z.number() })),
  // 씬 (좌상단 제목 + 하단 자막)
  scenes: z.array(
    z.object({ title: z.string(), caption: z.string(), from: z.number(), durationInFrames: z.number() }),
  ),
  focuses: z.array(focusSchema),
  // 오프닝 훅 — 첫 3초에 보여줄 구간(원본 초) + 문구
  hook: z.object({ srcSec: z.number(), text: z.string(), durationInFrames: z.number() }),
  ctaText: z.string(),
});

export type DemoProps = z.infer<typeof demoSchema>;
