//////////////////////////////////////// 안전존 레이아웃 ////////////////////////////////////////
// 상단 자막+타이머 존 / 중단 시연 존 / 하단 여백 — 핵심 정보는 세로 중앙 60% × 좌측 85%
import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, SAFE } from "../theme";

type PropsType = {
  header: React.ReactNode; // 훅 자막 + 타이머
  children: React.ReactNode; // 시연 영상
  footer?: React.ReactNode; // 보조 자막 1줄
};

export const SafeArea = ({ header, children, footer }: PropsType) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
      {/* 상단 UI 존 (비움) 아래부터 헤더 */}
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: 40,
          right: SAFE.right + 20,
          height: 300,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          justifyContent: "flex-start",
        }}
      >
        {header}
      </div>

      {/* 시연 존 — 세로 중앙 */}
      <div
        style={{
          position: "absolute",
          top: SAFE.top + 310,
          left: 24,
          right: SAFE.right - 60,
          bottom: SAFE.bottom + 120,
          borderRadius: 28,
          overflow: "hidden",
        }}
      >
        {children}
      </div>

      {/* 하단 보조 자막 (제목·진행바 존 위) */}
      {footer ? (
        <div
          style={{
            position: "absolute",
            bottom: SAFE.bottom + 20,
            left: 40,
            right: SAFE.right + 20,
            height: 90,
            display: "flex",
            alignItems: "center",
          }}
        >
          {footer}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
