//////////////////////////////////////// 엔딩 — 화면 위 스탬프 + 리캡 ////////////////////////////////////////
// 광고 카드로 끊지 않고, 마지막 화면 위에 반투명 오버레이 → 실측 스탬프 쾅 → 한 일 체크 리캡
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK, SAFE } from "../theme";

type PropsType = {
  resultLabel: string;
  resultTime: string;
  ctaLine: string;
  commentLine: string;
  logoSrc?: string | null;
  recapItems?: string[];
};

export const ResultCard = ({ resultLabel, resultTime, ctaLine, commentLine, logoSrc, recapItems = [] }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const backdrop = interpolate(frame, [0, 10], [0, 0.9], { extrapolateRight: "clamp" });
  // 스탬프 — 크게 나타나서 쾅 내려찍힘 (오버슛)
  const stamp = spring({ frame: frame - 4, fps, config: { damping: 9, mass: 0.5, stiffness: 180 } });
  const stampScale = interpolate(stamp, [0, 1], [2.2, 1]);

  return (
    <AbsoluteFill style={{ fontFamily: FONT_STACK }}>
      {/* 반투명 백드롭 — 마지막 화면이 비쳐 보임 (흐름 유지) */}
      <AbsoluteFill style={{ backgroundColor: `rgba(247,247,245,${backdrop})` }} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingTop: SAFE.top,
          paddingBottom: SAFE.bottom,
          paddingRight: SAFE.right - 80,
          paddingLeft: 80,
        }}
      >
        {/* 실측 스탬프 */}
        <div
          style={{
            transform: `scale(${stampScale}) rotate(-6deg)`,
            opacity: Math.min(1, stamp * 1.4),
            border: `10px solid ${COLOR.ink}`,
            borderRadius: 20,
            padding: "18px 44px",
            textAlign: "center",
            backgroundColor: "rgba(255,255,255,0.85)",
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 800, color: COLOR.inkDim }}>{resultLabel}</div>
          <div
            style={{
              fontSize: 170,
              fontWeight: 900,
              color: COLOR.ink,
              lineHeight: 1.05,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -3,
            }}
          >
            {resultTime}
          </div>
          <div
            style={{
              display: "inline-block",
              background: `linear-gradient(transparent 55%, ${COLOR.highlight} 55%)`,
              fontSize: 36,
              fontWeight: 800,
              color: COLOR.ink,
              padding: "0 8px",
            }}
          >
            직접 재봤어요
          </div>
        </div>

        {/* 한 일 리캡 — 한 줄씩 등장 */}
        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 18 }}>
          {recapItems.map((item, i) => {
            const s = spring({ frame: frame - 16 - i * 7, fps, config: { damping: 13 } });
            return (
              <div
                key={i}
                style={{
                  opacity: s,
                  transform: `translateX(${(1 - s) * -24}px)`,
                  fontSize: 42,
                  fontWeight: 700,
                  color: COLOR.ink,
                }}
              >
                <span style={{ color: COLOR.brand, marginRight: 14 }}>✓</span>
                {item}
              </div>
            );
          })}
        </div>

        {/* CTA — 크리에이터 톤, 작게 */}
        <div
          style={{
            marginTop: 60,
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: spring({ frame: frame - 40, fps, config: { damping: 14 } }),
          }}
        >
          {logoSrc ? <Img src={staticFile(logoSrc)} style={{ height: 44, objectFit: "contain" }} /> : null}
          <span style={{ fontSize: 38, fontWeight: 700, color: COLOR.ink }}>{ctaLine}</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 32,
            color: COLOR.inkDim,
            opacity: spring({ frame: frame - 50, fps, config: { damping: 14 } }),
          }}
        >
          {commentLine}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
