//////////////////////////////////////// 훅 인트로 (0~3초) ////////////////////////////////////////
// 3초 시선 확보: 키워드 형광펜 하이라이트 팝 + 타이머 스타트 카운트다운 느낌
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK, SAFE } from "../theme";

type PropsType = {
  hook: string; // "|"로 줄 구분, "**단어**"는 하이라이트
};

////////// "**하이라이트**" 마크업 파싱
const renderLine = (line: string, popScale: number) => {
  const parts = line.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith("**")) {
      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            background: `linear-gradient(transparent 55%, ${COLOR.highlight} 55%)`,
            transform: `scale(${popScale})`,
            padding: "0 6px",
          }}
        >
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export const HookIntro = ({ hook }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = hook.split("|").map((l) => l.trim());
  const slideIn = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const pop = spring({ frame: frame - Math.round(fps * 0.5), fps, config: { damping: 9, mass: 0.5 } });
  const fadeOut = interpolate(frame / fps, [2.6, 3], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLOR.canvas,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: SAFE.top,
        paddingBottom: SAFE.bottom,
        paddingLeft: 60,
        paddingRight: SAFE.right,
        fontFamily: FONT_STACK,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          fontSize: 88,
          lineHeight: 1.28,
          fontWeight: 900,
          color: COLOR.ink,
          textAlign: "center",
          wordBreak: "keep-all",
          transform: `translateY(${(1 - slideIn) * 60}px)`,
          opacity: slideIn,
        }}
      >
        {lines.map((line, i) => (
          <div key={i}>{renderLine(line, 0.9 + pop * 0.1)}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
