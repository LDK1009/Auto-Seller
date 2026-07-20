//////////////////////////////////////// 컴포지션 props 스키마 ////////////////////////////////////////
// 대본(숏츠.md) 파서의 출력 = 이 스키마의 JSON. 렌더 시 --props 로 주입.
import { z } from "zod";

////////// 자막 한 줄 (초 단위 구간)
export const captionSchema = z.object({
  from: z.number(), // 시작 초
  to: z.number(), // 끝 초
  text: z.string(),
});

////////// 줌 포커스 (플레이라이트 이벤트 로그 기반 — Phase B에서 채움, 없으면 전체 화면)
export const focusSchema = z.object({
  at: z.number(), // 초
  x: z.number(), // 0~1 (영상 내 상대 좌표)
  y: z.number(),
  scale: z.number().default(2), // 줌 배율
  holdSec: z.number().default(2),
});

export const timerShortSchema = z.object({
  hook: z.string(), // 훅 자막 (0~3초)
  captions: z.array(captionSchema),
  resultLabel: z.string(), // 결과 카드 라벨 (예: "등록 준비")
  resultTime: z.string(), // 실측 시간 표기 (예: "1:12") — 촬영 실측값
  ctaLine: z.string().default("무료·무가입 — 오토셀러"),
  commentLine: z.string().default("재보고 싶은 작업, 댓글로"),
  videoSrc: z.string().nullable().default(null), // 시연 녹화 파일 (public/ 기준 또는 절대 경로). null = 플레이스홀더
  videoStartSec: z.number().default(3), // 시연 영상이 시작되는 컴포지션 시각
  durationSec: z.number().default(30), // 전체 길이
  resultCardSec: z.number().default(5), // 끝의 결과 카드 길이
  focuses: z.array(focusSchema).default([]),
  // 오디오 (public/ 기준 경로, 파일 있을 때만 build-episode가 주입)
  bgmSrc: z.string().nullable().default(null),
  sfxDoneSrc: z.string().nullable().default(null),
});

export type TimerShortProps = z.infer<typeof timerShortSchema>;
