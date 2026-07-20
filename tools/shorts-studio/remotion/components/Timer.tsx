//////////////////////////////////////// 스톱워치 오버레이 ////////////////////////////////////////
// 영상 경과 시간과 프레임 동기 — 실측 원칙: 표시 시간 = 실제 경과 시간
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";

type PropsType = {
  startSec: number; // 타이머 0이 되는 컴포지션 시각 (시연 시작)
  frozenAtSec?: number; // 결과 구간에서 멈출 시각 (없으면 계속)
};

const format = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

export const Timer = ({ startSec, frozenAtSec }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;
  const raw = Math.max(0, nowSec - startSec);
  const elapsed =
    frozenAtSec !== undefined ? Math.min(raw, frozenAtSec - startSec) : raw;

  return (
    <div
      style={{
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 28px",
        borderRadius: 999,
        backgroundColor: COLOR.timerBg,
        border: `3px solid ${COLOR.brand}`,
        fontFamily: FONT_STACK,
      }}
    >
      <span style={{ fontSize: 40 }}>⏱</span>
      <span
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: COLOR.text,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 1,
        }}
      >
        {format(elapsed)}
      </span>
    </div>
  );
};
