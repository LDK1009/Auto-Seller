//////////////////////////////////////// 결과 카드 (라이트 대자보) ////////////////////////////////////////
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK, SAFE } from "../theme";

type PropsType = {
  resultLabel: string;
  resultTime: string;
  ctaLine: string;
  commentLine: string;
  logoSrc?: string | null;
};

export const ResultCard = ({ resultLabel, resultTime, ctaLine, commentLine, logoSrc }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11, mass: 0.6 } });
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const lower = spring({ frame: frame - Math.round(fps * 0.6), fps, config: { damping: 14 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLOR.canvas,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT_STACK,
        opacity: fadeIn,
        paddingTop: SAFE.top,
        paddingBottom: SAFE.bottom,
        paddingRight: SAFE.right - 80,
        paddingLeft: 80,
        textAlign: "center",
      }}
    >
      {logoSrc ? (
        <Img src={staticFile(logoSrc)} style={{ height: 72, marginBottom: 36, objectFit: "contain" }} />
      ) : null}
      <div style={{ fontSize: 54, fontWeight: 700, color: COLOR.inkDim, marginBottom: 20 }}>
        {resultLabel}
      </div>
      <div
        style={{
          fontSize: 230,
          fontWeight: 900,
          color: COLOR.ink,
          transform: `scale(${pop})`,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          letterSpacing: -4,
        }}
      >
        {resultTime}
      </div>
      <div
        style={{
          marginTop: 20,
          display: "inline-block",
          background: `linear-gradient(transparent 55%, ${COLOR.highlight} 55%)`,
          fontSize: 42,
          fontWeight: 800,
          color: COLOR.ink,
          padding: "0 10px",
        }}
      >
        실측입니다
      </div>
      <div style={{ opacity: lower, transform: `translateY(${(1 - lower) * 30}px)` }}>
        <div
          style={{
            marginTop: 70,
            padding: "22px 48px",
            borderRadius: 18,
            backgroundColor: COLOR.brand,
            color: "#fff",
            fontSize: 46,
            fontWeight: 800,
            boxShadow: "0 10px 30px rgba(99,102,241,0.35)",
          }}
        >
          {ctaLine}
        </div>
        <div style={{ marginTop: 28, fontSize: 36, color: COLOR.inkDim }}>{commentLine}</div>
      </div>
    </AbsoluteFill>
  );
};
