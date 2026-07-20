//////////////////////////////////////// 자막 — 숏츠 네이티브 캡션체 ////////////////////////////////////////
// 반투명 박스 + 흰 글씨, 화면당 1문장 (광고체 대형 타이포 금지 — 스타일 가이드)
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_STACK } from "../theme";
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
  const t = interpolate(local, [0, 0.2], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * 12}px)`,
        fontFamily: FONT_STACK,
        fontSize: 46,
        lineHeight: 1.35,
        fontWeight: 700,
        color: "#FFFFFF",
        backgroundColor: "rgba(17,19,24,0.62)",
        padding: "14px 30px",
        borderRadius: 16,
        wordBreak: "keep-all",
        textAlign: "center",
        maxWidth: 820,
      }}
    >
      {current.text}
    </div>
  );
};
