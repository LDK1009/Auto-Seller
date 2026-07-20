//////////////////////////////////////// 시연 영상 (모바일 세로 녹화) ////////////////////////////////////////
// 폰 카드 안에 세로 녹화를 cover로 채움 (줌 없음 — 모바일 뷰라 판독 가능).
// 정차역(focus)마다 해당 섹션에 강조 테두리 링이 스르륵 나타났다 사라진다.
import React from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";
import type { TimerShortProps } from "../schema";
import { PHONE_CARD } from "./SafeArea";

type PropsType = {
  videoSrc: string | null;
  videoStartSec: number;
  videoTrimSec?: number;
  videoAvailSec?: number; // 사용 가능한 영상 길이 — 초과 구간은 마지막 프레임 프리즈 (엔딩 오버레이 밑)
  focuses: TimerShortProps["focuses"];
};

// 녹화 원본 뷰포트 — scripts/lib/recorder.ts VIEWPORT와 동일해야 좌표 매핑이 맞음
const SOURCE = { width: 414, height: 896 };
const RING_FADE = 0.35; // 링 등장/퇴장 (초)
const RING_PAD = 10; // 박스 주변 여백 (px)

////////// 정차역 강조 링 — 녹화 좌표(0~1) → 카드 px 로 cover 매핑
const HighlightRing = ({ focus, nowSec }: { focus: TimerShortProps["focuses"][number]; nowSec: number }) => {
  const { fps } = useVideoConfig();
  const start = focus.at;
  const end = focus.at + focus.holdSec;
  if (nowSec < start - RING_FADE || nowSec > end + RING_FADE) return null;

  // cover 배치 — 가로가 꽉 차고(414→560) 세로는 넘친 만큼 위아래 크롭
  const coverScale = PHONE_CARD.width / SOURCE.width;
  const dispHeight = SOURCE.height * coverScale;
  const cropTop = (dispHeight - PHONE_CARD.height) / 2;

  // 박스 크기 없으면(클릭 폴백) 기본 링
  const boxW = (focus.w || 0.7) * PHONE_CARD.width;
  const boxH = (focus.h || 0.12) * dispHeight;
  const centerX = focus.x * PHONE_CARD.width;
  const centerY = focus.y * dispHeight - cropTop;

  // 등장: 살짝 크게 → 정착 (스프링) / 퇴장: 페이드
  const inSpring = spring({ frame: Math.round((nowSec - start + RING_FADE) * fps), fps, config: { damping: 13 } });
  const fadeIn = interpolate(nowSec, [start - RING_FADE, start], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(nowSec, [end, end + RING_FADE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = Math.min(fadeIn, fadeOut);
  const settle = 1.08 - inSpring * 0.08; // 1.08 → 1.0

  return (
    <div
      style={{
        position: "absolute",
        left: centerX - boxW / 2 - RING_PAD,
        top: centerY - boxH / 2 - RING_PAD,
        width: boxW + RING_PAD * 2,
        height: boxH + RING_PAD * 2,
        border: `5px solid ${COLOR.brand}`,
        borderRadius: 18,
        boxShadow: `0 0 0 4px rgba(99,102,241,0.18), 0 6px 20px rgba(99,102,241,0.25)`,
        opacity,
        transform: `scale(${settle})`,
        pointerEvents: "none",
      }}
    />
  );
};

export const ZoomVideo = ({ videoSrc, videoTrimSec = 0, videoAvailSec, focuses }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;
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

  const video = (
    <OffthreadVideo
      src={videoSrc.startsWith("http") ? videoSrc : staticFile(videoSrc)}
      startFrom={Math.round(videoTrimSec * fps)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      {availFrames !== null && frame >= availFrames ? (
        <Freeze frame={availFrames}>{video}</Freeze>
      ) : (
        video
      )}
      {focuses.map((f, i) => (
        <HighlightRing key={i} focus={f} nowSec={nowSec} />
      ))}
    </AbsoluteFill>
  );
};
