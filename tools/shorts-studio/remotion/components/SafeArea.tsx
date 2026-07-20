//////////////////////////////////////// 안전존 레이아웃 (모바일 녹화용) ////////////////////////////////////////
// 상단: 타이머(중앙) / 중앙: 폰 비율 시연 카드 / 자막: 카드 하단 오버레이 (숏츠 네이티브 캡션)
import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, SAFE } from "../theme";

type PropsType = {
  header: React.ReactNode;
  children: React.ReactNode; // 시연 (폰 카드)
  caption?: React.ReactNode; // 하단 캡션 오버레이
};

// 폰 카드 규격 — 세로 녹화(414:896)에 맞춘 포트레이트 카드
// 높이 950: 카드 하단(1360)과 자막 상단(~1394) 사이 간격 확보 (겹침 방지)
export const PHONE_CARD = { width: 560, height: 950 };

export const SafeArea = ({ header, children, caption }: PropsType) => {
  const contentCenterX = (SAFE.width - SAFE.right + 40) / 2; // 우측 안전존 감안한 중심
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.canvas }}>
      {/* 상단 타이머 존 */}
      <div
        style={{
          position: "absolute",
          top: SAFE.top + 10,
          left: 0,
          right: SAFE.right - 80,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {header}
      </div>

      {/* 시연 폰 카드 — 세로 비율 유지 */}
      <div
        style={{
          position: "absolute",
          top: SAFE.top + 160,
          left: contentCenterX - PHONE_CARD.width / 2,
          width: PHONE_CARD.width,
          height: PHONE_CARD.height,
          borderRadius: 28,
          overflow: "hidden",
          backgroundColor: COLOR.card,
          border: `2px solid ${COLOR.cardBorder}`,
          boxShadow: "0 18px 48px rgba(17,19,24,0.14)",
        }}
      >
        {children}
      </div>

      {/* 캡션 — 숏츠 네이티브 스타일 (카드 위 하단 오버레이) */}
      {caption ? (
        <div
          style={{
            position: "absolute",
            bottom: SAFE.bottom + 16,
            left: 60,
            right: SAFE.right,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
