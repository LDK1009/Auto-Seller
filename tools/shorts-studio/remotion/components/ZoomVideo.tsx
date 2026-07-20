//////////////////////////////////////// 시연 영상 (줌·팬) ////////////////////////////////////////
// 녹화 파일 재생 + 포커스 좌표(플레이라이트 이벤트 로그)로 줌인·복귀 애니메이션.
// videoSrc 없으면 플레이스홀더 (A단계 검증용).
import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";
import type { TimerShortProps } from "../schema";

type PropsType = {
  videoSrc: string | null;
  videoStartSec: number;
  focuses: TimerShortProps["focuses"];
};

////////// 현재 초의 줌 상태 계산 — 포커스 구간이면 해당 좌표로 확대, 아니면 1배
const useZoom = (focuses: PropsType["focuses"], nowSec: number) => {
  const TRANS = 0.4; // 줌 전환 시간
  for (const f of focuses) {
    const start = f.at;
    const end = f.at + f.holdSec;
    if (nowSec >= start - TRANS && nowSec <= end + TRANS) {
      const idx =
        nowSec < start
          ? interpolate(nowSec, [start - TRANS, start], [0, 1])
          : nowSec > end
            ? interpolate(nowSec, [end, end + TRANS], [1, 0])
            : 1;
      return {
        scale: 1 + (f.scale - 1) * idx,
        // 확대 중심을 포커스 좌표로 이동 (0~1 상대 좌표)
        originX: f.x * 100,
        originY: f.y * 100,
      };
    }
  }
  return { scale: 1, originX: 50, originY: 50 };
};

export const ZoomVideo = ({ videoSrc, videoStartSec, focuses }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;
  const zoom = useZoom(focuses, nowSec);

  if (!videoSrc) {
    // 플레이스홀더 — 녹화 파일 연결 전 프레임 확인용
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#1B1E27",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: FONT_STACK,
          color: COLOR.textDim,
          fontSize: 44,
          border: `2px dashed ${COLOR.brand}`,
          borderRadius: 28,
        }}
      >
        시연 녹화 영역 (videoSrc 미지정)
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${zoom.scale})`,
        transformOrigin: `${zoom.originX}% ${zoom.originY}%`,
      }}
    >
      <OffthreadVideo
        src={videoSrc.startsWith("http") ? videoSrc : staticFile(videoSrc)}
        startFrom={0}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        // 컴포지션 videoStartSec 이전엔 Sequence로 감싸서 등장 (TimerShort에서 처리)
      />
    </AbsoluteFill>
  );
};
