//////////////////////////////////////// 메인 컴포지션: 타이머 실측 챌린지 ////////////////////////////////////////
// 구조: 훅(0~videoStartSec) → 시연+타이머 → 결과 카드(마지막 resultCardSec)
import React from "react";
import { Sequence, useVideoConfig } from "remotion";
import type { TimerShortProps } from "./schema";
import { SafeArea } from "./components/SafeArea";
import { Timer } from "./components/Timer";
import { Caption } from "./components/Caption";
import { ResultCard } from "./components/ResultCard";
import { ZoomVideo } from "./components/ZoomVideo";

export const TimerShort = (props: TimerShortProps) => {
  const { fps } = useVideoConfig();
  const totalFrames = Math.round(props.durationSec * fps);
  const resultFrames = Math.round(props.resultCardSec * fps);
  const demoEndSec = props.durationSec - props.resultCardSec;

  // 훅 자막 = 0초~시연 시작까지 표시되는 캡션으로 합성
  const hookCaption = [{ from: 0, to: props.videoStartSec, text: props.hook }];

  return (
    <>
      {/* 훅 + 시연 구간 */}
      <Sequence durationInFrames={totalFrames - resultFrames}>
        <SafeArea
          header={
            <>
              <Timer startSec={props.videoStartSec} frozenAtSec={demoEndSec} />
              <Caption captions={hookCaption} big />
            </>
          }
          footer={<Caption captions={props.captions} />}
        >
          <Sequence from={Math.round(props.videoStartSec * fps)} layout="none">
            <ZoomVideo
              videoSrc={props.videoSrc}
              videoStartSec={props.videoStartSec}
              focuses={props.focuses}
            />
          </Sequence>
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
