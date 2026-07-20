//////////////////////////////////////// 메인 컴포지션: 타이머 실측 챌린지 ////////////////////////////////////////
// 훅(0~3s, 풀스크린 타이포) → 시연(전체↔줌 리듬 + 중앙 타이머) → 결과 카드(끝 5s)
// 오디오: bgm(전체)·sfx 시작/완료 — 파일이 있을 때만 (build-episode가 주입)
import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
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
      {/* BGM — 전체 (은은하게) */}
      {props.bgmSrc ? <Audio src={staticFile(props.bgmSrc)} volume={0.18} /> : null}
      {/* 완료 효과음 — 결과 카드 진입 */}
      {props.sfxDoneSrc ? (
        <Sequence from={totalFrames - resultFrames} layout="none">
          <Audio src={staticFile(props.sfxDoneSrc)} volume={0.8} />
        </Sequence>
      ) : null}

      {/* 훅 (풀스크린) */}
      <Sequence durationInFrames={hookFrames}>
        <HookIntro hook={props.hook} />
      </Sequence>

      {/* 시연 구간 */}
      <Sequence from={hookFrames} durationInFrames={totalFrames - resultFrames - hookFrames}>
        {/* Sequence 내부 프레임은 0부터 — 절대 시각 컴포넌트(Timer/Caption/Zoom)는 오프셋 반영 */}
        <SafeArea
          header={<Timer startSec={0} frozenAtSec={demoEndSec - props.videoStartSec} />}
          footer={
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
            focuses={props.focuses.map((f) => ({ ...f, at: f.at - props.videoStartSec }))}
          />
        </SafeArea>
      </Sequence>

      {/* 결과 카드 */}
      <Sequence from={totalFrames - resultFrames} durationInFrames={resultFrames}>
        <ResultCard
          resultLabel={props.resultLabel}
          resultTime={props.resultTime}
          ctaLine={props.ctaLine}
          commentLine={props.commentLine}
        />
      </Sequence>
    </>
  );
};
