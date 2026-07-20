//////////////////////////////////////// 시연 영상 (모바일 세로 녹화) ////////////////////////////////////////
// 폰 카드 안에 세로 녹화를 cover로 채움. 정차역(focus)마다 부드러운 줌인 → 전체 복귀.
import React from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";
import type { TimerShortProps } from "../schema";

type PropsType = {
  videoSrc: string | null;
  videoStartSec: number;
  videoTrimSec?: number;
  videoAvailSec?: number; // 사용 가능한 영상 길이 — 초과 구간은 마지막 프레임 프리즈 (엔딩 오버레이 밑)
  focuses: TimerShortProps["focuses"];
};

const TRANS = 0.8; // 줌 전환 (스르륵)

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
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      return { k: e, x: f.x, y: f.y, scale: f.scale };
    }
  }
  return { k: 0, x: 0.5, y: 0.5, scale: 1 };
};

export const ZoomVideo = ({ videoSrc, videoTrimSec = 0, videoAvailSec, focuses }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;
  const z = zoomAt(focuses, nowSec);
  const availFrames = videoAvailSec ? Math.round(videoAvailSec * fps) - 2 : null;

  if (!videoSrc) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#EEF0F4",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: FONT_STACK,
          color: COLOR.inkDim,
          fontSize: 36,
        }}
      >
        시연 녹화 영역
      </AbsoluteFill>
    );
  }

  const scale = 1 + (z.scale - 1) * z.k;
  const originX = 50 + (z.x * 100 - 50) * z.k;
  const originY = 50 + (z.y * 100 - 50) * z.k;

  const video = (
    <OffthreadVideo
      src={videoSrc.startsWith("http") ? videoSrc : staticFile(videoSrc)}
      startFrom={Math.round(videoTrimSec * fps)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        transformOrigin: `${originX}% ${originY}%`,
        backgroundColor: "#FFFFFF",
      }}
    >
      {availFrames !== null && frame >= availFrames ? (
        <Freeze frame={availFrames}>{video}</Freeze>
      ) : (
        video
      )}
    </AbsoluteFill>
  );
};
