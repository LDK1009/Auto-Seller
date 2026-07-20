//////////////////////////////////////// 자막 (중앙 정렬) ////////////////////////////////////////
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";
import type { TimerShortProps } from "../schema";

type PropsType = {
  captions: TimerShortProps["captions"];
};

export const Caption = ({ captions }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;

  const current = captions.find((c) => nowSec >= c.from && nowSec < c.to);
  if (!current) return null;

  const local = nowSec - current.from;
  const t = interpolate(local, [0, 0.22], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * 16}px)`,
        fontFamily: FONT_STACK,
        fontSize: 56,
        lineHeight: 1.3,
        fontWeight: 800,
        color: COLOR.ink,
        wordBreak: "keep-all",
        textAlign: "center",
        width: "100%",
      }}
    >
      {current.text}
    </div>
  );
};
