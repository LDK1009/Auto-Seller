//////////////////////////////////////// 안전존 레이아웃 ////////////////////////////////////////
// 라이트 캔버스 — 상단: 타이머(중앙) / 중단: 시연 카드 / 하단: 자막(중앙)
import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, SAFE } from "../theme";

type PropsType = {
  header: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export const SafeArea = ({ header, children, footer }: PropsType) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.canvas }}>
      {/* 상단 — 타이머 존 (수평 중앙) */}
      <div
        style={{
          position: "absolute",
          top: SAFE.top + 20,
          left: 0,
          right: SAFE.right - 80,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {header}
      </div>

      {/* 시연 카드 존 */}
      <div
        style={{
          position: "absolute",
          top: SAFE.top + 240,
          left: 28,
          right: SAFE.right - 68,
          bottom: SAFE.bottom + 150,
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: COLOR.card,
          border: `2px solid ${COLOR.cardBorder}`,
          boxShadow: "0 18px 48px rgba(17,19,24,0.12)",
        }}
      >
        {children}
      </div>

      {/* 하단 자막 (수평 중앙) */}
      {footer ? (
        <div
          style={{
            position: "absolute",
            bottom: SAFE.bottom + 24,
            left: 40,
            right: SAFE.right - 40,
            height: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {footer}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
