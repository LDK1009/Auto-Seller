//////////////////////////////////////// 시연 영상 (모바일 세로 녹화) ////////////////////////////////////////
// 폰 카드 안에 세로 녹화를 cover로 채움. 정차역(focus)마다 부드러운 줌인 → 전체 복귀.
import React from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";
import type { TimerShortProps } from "../schema";

type PropsType = {
  videoSrc: string | null;
  videoStartSec: number;
  videoTrimSec?: number;
  videoAvailSec?: number; // 사용 가능한 영상 길이 — 초과 구간은 마지막 프레임 프리즈 (엔딩 오버레이 밑)
  focuses: TimerShortProps["focuses"];
};

const TRANS = 0.8; // 줌 전환 (스르륵)

// 카메라 키프레임 — 정차역이 가까우면(줌아웃+줌인 시간 부족) 줌 유지한 채 다음 지점으로 팬
// 기존 방식은 앞 정차역 줌아웃이 끝나는 순간 다음 정차역 구간으로 넘어가며 k가 0→1로 점프(뚜둑 끊김)
type CamKey = { t: number; k: number; x: number; y: number; scale: number };

const buildKeys = (focuses: PropsType["focuses"]): CamKey[] => {
  const keys: CamKey[] = [];
  focuses.forEach((f, i) => {
    const prev = focuses[i - 1];
    const next = focuses[i + 1];
    const end = f.at + f.holdSec;
    const prevLinked = prev !== undefined && f.at - (prev.at + prev.holdSec) < TRANS * 2;
    const nextLinked = next !== undefined && next.at - end < TRANS * 2;
    if (!prevLinked) {
      keys.push({ t: f.at - TRANS, k: 0, x: f.x, y: f.y, scale: f.scale });
      keys.push({ t: f.at, k: 1, x: f.x, y: f.y, scale: f.scale });
    }
    if (nextLinked) {
      // 팬 연결 — 머묾 후 다음 정차역 도착 시각까지 0.8초 이동 (줌 유지)
      const panStart = Math.max(f.at + 0.2, next!.at - TRANS);
      keys.push({ t: panStart, k: 1, x: f.x, y: f.y, scale: f.scale });
      keys.push({ t: next!.at, k: 1, x: next!.x, y: next!.y, scale: next!.scale });
    } else {
      keys.push({ t: end, k: 1, x: f.x, y: f.y, scale: f.scale });
      keys.push({ t: end + TRANS, k: 0, x: f.x, y: f.y, scale: f.scale });
    }
  });
  return keys;
};

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const zoomAt = (focuses: PropsType["focuses"], nowSec: number) => {
  const keys = buildKeys(focuses);
  if (keys.length === 0 || nowSec <= keys[0].t) return { k: 0, x: 0.5, y: 0.5, scale: 1 };
  const last = keys[keys.length - 1];
  if (nowSec >= last.t) return { k: last.k, x: last.x, y: last.y, scale: last.scale };
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (nowSec >= keys[i].t && nowSec < keys[i + 1].t) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const p = easeInOut(interpolate(nowSec, [a.t, b.t], [0, 1]));
  return {
    k: a.k + (b.k - a.k) * p,
    x: a.x + (b.x - a.x) * p,
    y: a.y + (b.y - a.y) * p,
    scale: a.scale + (b.scale - a.scale) * p,
  };
};

export const ZoomVideo = ({ videoSrc, videoTrimSec = 0, videoAvailSec, focuses }: PropsType) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;
  const z = zoomAt(focuses, nowSec);
  const availFrames = videoAvailSec ? Math.round(videoAvailSec * fps) - 2 : null;

  if (!videoSrc) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#EEF0F4",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: FONT_STACK,
          color: COLOR.inkDim,
          fontSize: 36,
        }}
      >
        시연 녹화 영역
      </AbsoluteFill>
    );
  }

  const scale = 1 + (z.scale - 1) * z.k;
  const originX = 50 + (z.x * 100 - 50) * z.k;
  const originY = 50 + (z.y * 100 - 50) * z.k;

  const video = (
    <OffthreadVideo
      src={videoSrc.startsWith("http") ? videoSrc : staticFile(videoSrc)}
      startFrom={Math.round(videoTrimSec * fps)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        transformOrigin: `${originX}% ${originY}%`,
        backgroundColor: "#FFFFFF",
      }}
    >
      {availFrames !== null && frame >= availFrames ? (
        <Freeze frame={availFrames}>{video}</Freeze>
      ) : (
        video
      )}
    </AbsoluteFill>
  );
};
