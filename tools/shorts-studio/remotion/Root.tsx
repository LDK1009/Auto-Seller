//////////////////////////////////////// 컴포지션 등록 ////////////////////////////////////////
// 1080×1920·30fps 세로 숏츠. 길이는 props.durationSec 기반으로 동적 계산.
import { Composition } from "remotion";
import { TimerShort } from "./TimerShort";
import { timerShortSchema } from "./schema";
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
  ctaLine: "무료·무가입 — 오토셀러",
  commentLine: "재보고 싶은 작업, 댓글로",
  videoSrc: null,
  videoStartSec: 3,
  durationSec: 30,
  resultCardSec: 5,
  focuses: [],
  bgmSrc: null,
  sfxDoneSrc: null,
};

export const Root = () => {
  return (
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
  );
};
