//////////////////////////////////////// 자막 ////////////////////////////////////////
// 타임라인 배열에서 현재 초에 해당하는 문장 1개 표시 — 화면당 1문장 원칙
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";
import type { TimerShortProps } from "../schema";

type PropsType = {
  captions: TimerShortProps["captions"];
  big?: boolean; // 훅용 대형 모드
};

export const Caption = ({ captions, big = false }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;

  const current = captions.find((c) => nowSec >= c.from && nowSec < c.to);
  if (!current) return null;

  // 등장 페이드+슬라이드 (0.25초)
  const local = nowSec - current.from;
  const t = interpolate(local, [0, 0.25], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * 20}px)`,
        fontFamily: FONT_STACK,
        fontSize: big ? 64 : 54,
        lineHeight: 1.3,
        fontWeight: 800,
        color: COLOR.text,
        textShadow: "0 4px 24px rgba(0,0,0,0.6)",
        wordBreak: "keep-all",
      }}
    >
      {current.text}
    </div>
  );
};
