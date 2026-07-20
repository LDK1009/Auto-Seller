//////////////////////////////////////// 결과 카드 ////////////////////////////////////////
// 엔딩 5초 — 실측 시간 대형 숫자 + CTA + 댓글 유도 (시리즈 고정 엔딩)
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK, SAFE } from "../theme";

type PropsType = {
  resultLabel: string;
  resultTime: string;
  ctaLine: string;
  commentLine: string;
};

export const ResultCard = ({ resultLabel, resultTime, ctaLine, commentLine }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLOR.bg,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT_STACK,
        opacity: fadeIn,
        paddingTop: SAFE.top,
        paddingBottom: SAFE.bottom,
        paddingRight: SAFE.right - 80,
        paddingLeft: 80,
      }}
    >
      <div style={{ fontSize: 56, fontWeight: 700, color: COLOR.textDim, marginBottom: 24 }}>
        {resultLabel}
      </div>
      <div
        style={{
          fontSize: 200,
          fontWeight: 900,
          color: COLOR.accent,
          transform: `scale(${pop})`,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {resultTime}
      </div>
      <div style={{ fontSize: 40, fontWeight: 600, color: COLOR.textDim, marginTop: 16 }}>
        (실측)
      </div>
      <div
        style={{
          marginTop: 80,
          padding: "20px 44px",
          borderRadius: 999,
          backgroundColor: COLOR.brand,
          color: COLOR.text,
          fontSize: 48,
          fontWeight: 800,
        }}
      >
        {ctaLine}
      </div>
      <div style={{ marginTop: 32, fontSize: 38, color: COLOR.textDim }}>{commentLine}</div>
    </AbsoluteFill>
  );
};
