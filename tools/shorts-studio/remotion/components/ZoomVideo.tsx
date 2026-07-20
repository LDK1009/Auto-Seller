//////////////////////////////////////// 시연 영상 — 전체 화면 ↔ 줌인 강조 (Cursorful 스타일) ////////////////////////////////////////
// PC(16:9) 녹화를 세로 카드에 담는다:
//  - 기본 상태 = 전체 화면 (fit — 페이지 전경 파악)
//  - 클릭 포커스 = 해당 지점으로 부드러운 줌인 (스케일·팬) → hold 후 다시 전체로
import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";
import type { TimerShortProps } from "../schema";

type PropsType = {
  videoSrc: string | null;
  videoStartSec: number;
  focuses: TimerShortProps["focuses"];
  videoAspect?: number; // 녹화 원본 비율 (기본 16:9)
};

const TRANS = 0.55; // 줌 전환 시간 (초)

////////// 시각 → 줌 상태 (전체 1배 ↔ 포커스 지점 scale배)
const zoomAt = (focuses: PropsType["focuses"], nowSec: number) => {
  for (const f of focuses) {
    const start = f.at;
    const end = f.at + f.holdSec;
    if (nowSec >= start - TRANS && nowSec <= end + TRANS) {
      const k =
        nowSec < start
          ? interpolate(nowSec, [start - TRANS, start], [0, 1])
          : nowSec > end
            ? interpolate(nowSec, [end, end + TRANS], [1, 0])
            : 1;
      // easeInOut
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      return { k: e, x: f.x, y: f.y, scale: f.scale };
    }
  }
  return { k: 0, x: 0.5, y: 0.5, scale: 1 };
};

export const ZoomVideo = ({ videoSrc, videoStartSec, focuses, videoAspect = 16 / 9 }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;
  const z = zoomAt(focuses, nowSec);

  if (!videoSrc) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#EEF0F4",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: FONT_STACK,
          color: COLOR.inkDim,
          fontSize: 40,
        }}
      >
        시연 녹화 영역 (videoSrc 미지정)
      </AbsoluteFill>
    );
  }

  const scale = 1 + (z.scale - 1) * z.k;
  // 팬: 포커스 지점을 카드 중앙으로 — origin 이동 방식
  const originX = 50 + (z.x * 100 - 50) * z.k;
  const originY = 50 + (z.y * 100 - 50) * z.k;

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF", justifyContent: "center" }}>
      <div
        style={{
          width: "100%",
          aspectRatio: `${videoAspect}`,
          transform: `scale(${scale})`,
          transformOrigin: `${originX}% ${originY}%`,
        }}
      >
        <OffthreadVideo
          src={videoSrc.startsWith("http") ? videoSrc : staticFile(videoSrc)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    </AbsoluteFill>
  );
};
