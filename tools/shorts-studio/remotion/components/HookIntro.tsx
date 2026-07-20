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

////////// 미니 스톱워치 (훅 → 시연 타이머로 이어지는 연결 고리)
const MiniStopwatch = ({ shake }: { shake: number }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 30px",
      borderRadius: 20,
      backgroundColor: COLOR.card,
      border: `2px solid ${COLOR.cardBorder}`,
      boxShadow: "0 8px 24px rgba(17,19,24,0.10)",
      transform: `rotate(${shake}deg)`,
    }}
  >
    <svg width={48} height={48} viewBox="0 0 48 48">
      <line x1="24" y1="4" x2="24" y2="10" stroke={COLOR.ink} strokeWidth="5" strokeLinecap="round" />
      <line x1="18" y1="4" x2="30" y2="4" stroke={COLOR.ink} strokeWidth="5" strokeLinecap="round" />
      <circle cx="24" cy="28" r="16" fill="none" stroke={COLOR.ink} strokeWidth="5" />
      <line x1="24" y1="28" x2="24" y2="18" stroke={COLOR.brand} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
    <span style={{ fontSize: 52, fontWeight: 800, color: COLOR.ink, fontVariantNumeric: "tabular-nums" }}>
      00:00.00
    </span>
  </div>
);

export const HookIntro = ({ hook }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = hook.split("|").map((l) => l.trim());
  const slideIn = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const pop = spring({ frame: frame - Math.round(fps * 0.5), fps, config: { damping: 9, mass: 0.5 } });
  // 스톱워치 등장(1.2초) → 스타트 직전 부르르(2.3초~)
  const watchIn = spring({ frame: frame - Math.round(fps * 1.2), fps, config: { damping: 12 } });
  const shakePhase = frame / fps - 2.3;
  const shake = shakePhase > 0 ? Math.sin(shakePhase * 40) * 6 * Math.max(0, 0.6 - shakePhase) : 0;
  const fadeOut = interpolate(frame / fps, [2.7, 3], [1, 0], {
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
          fontSize: 84,
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
      <div style={{ marginTop: 60, opacity: watchIn, transform: `scale(${0.7 + watchIn * 0.3})` }}>
        <MiniStopwatch shake={shake} />
      </div>
    </AbsoluteFill>
  );
};
