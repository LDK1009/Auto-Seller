//////////////////////////////////////// 데모 영상 props ////////////////////////////////////////
// 기능 시연용. 숏츠(타이머·결과카드·BGM)와 달리 담백하게 — 화면 + 씬제목 + 자막 + 강조만.
import { z } from "zod";

export const demoSchema = z.object({
  videoTitle: z.string(),
  durationInFrames: z.number(),
  // 녹화를 jpg 프레임 시퀀스로 (OffthreadVideo seek 오작동 회피 — LONGFORM-PIPELINE.md 참조)
  frameDir: z.string(),
  frameCount: z.number(),
  srcFps: z.number(),
  // 씬 — 좌상단 제목이 구간마다 바뀐다
  scenes: z.array(
    z.object({
      title: z.string(),
      caption: z.string(),
      from: z.number(),
      durationInFrames: z.number(),
    }),
  ),
  // 강조 링 — 녹화 focus 이벤트 좌표
  focuses: z.array(
    z.object({ at: z.number(), x: z.number(), y: z.number(), w: z.number(), h: z.number(), holdSec: z.number() }),
  ),
});

export type DemoProps = z.infer<typeof demoSchema>;
