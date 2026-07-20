//////////////////////////////////////// 메인 컴포지션: 타이머 실측 챌린지 ////////////////////////////////////////
// 훅(풀스크린) → 시연(폰 카드 + 타이머 + 캡션) → 엔딩 스탬프 오버레이 (화면 흐름 유지)
import React from "react";
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import type { TimerShortProps } from "./schema";
import { SafeArea } from "./components/SafeArea";
import { Timer } from "./components/Timer";
import { Caption } from "./components/Caption";
import { ResultCard } from "./components/ResultCard";
import { ZoomVideo } from "./components/ZoomVideo";
import { HookIntro } from "./components/HookIntro";

export const TimerShort = (props: TimerShortProps) => {
  const { fps } = useVideoConfig();
  const totalFrames = Math.round(props.durationSec * fps);
  const resultFrames = Math.round(props.resultCardSec * fps);
  const hookFrames = Math.round(props.videoStartSec * fps);
  const demoEndSec = props.durationSec - props.resultCardSec;

  return (
    <>
      {props.bgmSrc ? (
        <Audio
          src={staticFile(props.bgmSrc)}
          volume={(f) =>
            interpolate(f, [0, 15, totalFrames - 40, totalFrames - 5], [0, 0.16, 0.16, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
      {props.sfxDoneSrc ? (
        <Sequence from={totalFrames - resultFrames} layout="none">
          <Audio src={staticFile(props.sfxDoneSrc)} volume={0.8} />
        </Sequence>
      ) : null}

      {/* 훅 (풀스크린) */}
      <Sequence durationInFrames={hookFrames}>
        <HookIntro hook={props.hook} />
      </Sequence>

      {/* 시연 — 엔딩 스탬프가 이 위에 얹히도록 끝까지 유지 (화면 뚝 끊김 방지) */}
      <Sequence from={hookFrames} durationInFrames={totalFrames - hookFrames}>
        <SafeArea
          header={<Timer startSec={0} frozenAtSec={demoEndSec - props.videoStartSec} />}
          caption={
            <Caption
              captions={props.captions.map((c) => ({
                ...c,
                from: c.from - props.videoStartSec,
                to: c.to - props.videoStartSec,
              }))}
            />
          }
        >
          <ZoomVideo
            videoSrc={props.videoSrc}
            videoStartSec={props.videoStartSec}
            videoTrimSec={props.videoTrimSec}
            videoAvailSec={demoEndSec - props.videoStartSec}
            focuses={props.focuses.map((f) => ({ ...f, at: f.at - props.videoStartSec }))}
          />
        </SafeArea>
      </Sequence>

      {/* 엔딩 스탬프 오버레이 */}
      <Sequence from={totalFrames - resultFrames} durationInFrames={resultFrames}>
        <ResultCard
          resultLabel={props.resultLabel}
          resultTime={props.resultTime}
          ctaLine={props.ctaLine}
          commentLine={props.commentLine}
          logoSrc={props.logoSrc}
          recapItems={props.recapItems}
        />
      </Sequence>
    </>
  );
};
