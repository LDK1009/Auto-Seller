//////////////////////////////////////// 컴포지션 등록 ////////////////////////////////////////
// 1080×1920·30fps 세로 숏츠. 길이는 props.durationSec 기반으로 동적 계산.
import { Composition } from "remotion";
import { TimerShort } from "./TimerShort";
import { timerShortSchema } from "./schema";
import { LongForm } from "./longform/LongForm";
import { longformSchema } from "./longform/schema";
import { Thumbnail, thumbnailSchema } from "./longform/Thumbnail";
import { Demo } from "./demo/Demo";
import { demoSchema } from "./demo/schema";
import "pretendard/dist/web/variable/pretendardvariable.css"; // AI티 제거 — 실제 서비스와 동일 폰트

export const FPS = 30;

////////// 샘플 기본값 — 스튜디오 미리보기·A단계 검증용 (에피소드 #1 축약)
const defaultProps = {
  hook: "요즘 스마트스토어 부업, 이 정도로 쉬워졌습니다 — 타이머로 재봤어요",
  captions: [
    { from: 3, to: 8, text: "링크 붙여넣고" },
    { from: 8, to: 15, text: "카테고리, 상품명, 가격까지 자동" },
    { from: 15, to: 21, text: "배경 제거도 클릭 한 번" },
    { from: 21, to: 24, text: "복사하면 끝" },
  ],
  resultLabel: "등록 준비",
  resultTime: "1:12",
  ctaLine: "링크는 프로필에 있어요",
  commentLine: "재보고 싶은 작업은 댓글로 알려주세요",
  recapItems: ["카테고리 자동 추천", "상품명 검사", "판매가 계산", "태그 추천"],
  videoSrc: null,
  videoStartSec: 3,
  videoTrimSec: 0,
  durationSec: 30,
  resultCardSec: 5,
  focuses: [],
  bgmSrc: null,
  sfxDoneSrc: null,
  logoSrc: null,
};

////////// 롱폼 기본값 — 스튜디오 미리보기용 (실제 값은 build-longform.ts가 props로 주입)
const longformDefaults = {
  videoTitle: "",
  durationInFrames: 300,
  lines: [],
  chapters: [],
  captionVariant: 0,
};

export const Root = () => {
  return (
    <>
      <Composition
        id="TimerShort"
        component={TimerShort}
        width={1080}
        height={1920}
        fps={FPS}
        schema={timerShortSchema}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.durationSec * FPS),
        })}
      />
      {/* 롱폼 16:9 — 길이는 오디오 실측으로 계산돼 props.durationInFrames로 들어온다 */}
      <Composition
        id="LongForm"
        component={LongForm}
        width={1920}
        height={1080}
        fps={FPS}
        schema={longformSchema}
        defaultProps={longformDefaults}
        calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames })}
      />
      {/* 데모 영상 — 기능 시연 (세로 1080×1920, 쓰레드·릴스용) */}
      <Composition
        id="Demo"
        component={Demo}
        width={1080}
        height={1920}
        fps={FPS}
        schema={demoSchema}
        defaultProps={{
          videoTitle: "",
          durationInFrames: 300,
          frameDir: "",
          frameCount: 1,
          srcFps: 25,
          srcW: 414,
          srcH: 896,
          segments: [],
          scenes: [],
          focuses: [],
          hook: { srcSec: 0, text: "", durationInFrames: 90 },
          ctaText: "",
        }}
        calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames })}
      />
      {/* 유튜브 썸네일 — remotion still 로 추출 */}
      <Composition
        id="Thumbnail"
        component={Thumbnail}
        width={1280}
        height={720}
        fps={30}
        durationInFrames={1}
        schema={thumbnailSchema}
        defaultProps={{ eyebrow: "스마트스토어 2026", line1: "등록 한도 바뀌었어요", line2: "내 계정은", highlight: "몇 개까지?" }}
      />
    </>
  );
};
