//////////////////////////////////////// 스톱워치 (중앙·대형·벨 애니메이션) ////////////////////////////////////////
// 표시 시간 = 실경과 (프레임 동기). 아이콘이 좌우로 따릉따릉 흔들려 시선 유도.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";

type PropsType = {
  startSec: number;
  frozenAtSec?: number;
  scale?: number; // 훅 구간에서 더 크게 쓰고 싶을 때
};

const format = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

////////// 스톱워치 SVG (이모지 대체 — 직접 드로잉)
const StopwatchIcon = ({ size, wiggleDeg }: { size: number; wiggleDeg: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    style={{ transform: `rotate(${wiggleDeg}deg)`, transformOrigin: "50% 55%" }}
  >
    <line x1="24" y1="4" x2="24" y2="10" stroke={COLOR.ink} strokeWidth="5" strokeLinecap="round" />
    <line x1="18" y1="4" x2="30" y2="4" stroke={COLOR.ink} strokeWidth="5" strokeLinecap="round" />
    <circle cx="24" cy="28" r="16" fill="none" stroke={COLOR.ink} strokeWidth="5" />
    <line x1="24" y1="28" x2="24" y2="18" stroke={COLOR.brand} strokeWidth="4.5" strokeLinecap="round" />
    <line x1="24" y1="28" x2="30" y2="31" stroke={COLOR.brand} strokeWidth="4.5" strokeLinecap="round" />
  </svg>
);

export const Timer = ({ startSec, frozenAtSec, scale = 1 }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;
  const raw = Math.max(0, nowSec - startSec);
  const elapsed = frozenAtSec !== undefined ? Math.min(raw, frozenAtSec - startSec) : raw;
  const running = nowSec >= startSec && elapsed === raw;

  // 따릉따릉 — 진행 중일 때 좌우 ±12° 진동 (2회 흔들고 잠깐 쉼)
  const cycle = (frame % 45) / 45;
  const wiggle = running && cycle < 0.5 ? Math.sin(cycle * Math.PI * 8) * 12 : 0;

  return (
    <div
      style={{
        alignSelf: "center",
        display: "inline-flex",
        alignItems: "center",
        gap: 18 * scale,
        padding: `${18 * scale}px ${40 * scale}px`,
        borderRadius: 24,
        backgroundColor: COLOR.card,
        border: `2px solid ${COLOR.cardBorder}`,
        boxShadow: "0 8px 28px rgba(17,19,24,0.10)",
        fontFamily: FONT_STACK,
      }}
    >
      <StopwatchIcon size={64 * scale} wiggleDeg={wiggle} />
      <span
        style={{
          fontSize: 76 * scale,
          fontWeight: 800,
          color: COLOR.ink,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: -1,
        }}
      >
        {format(elapsed)}
      </span>
    </div>
  );
};
