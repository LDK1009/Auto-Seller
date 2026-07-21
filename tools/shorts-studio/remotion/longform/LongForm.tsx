//////////////////////////////////////// 롱폼 합성 (1920×1080) ////////////////////////////////////////
// 오디오가 타임라인을 지배한다 — 문장별 실측 길이로 프레임이 이미 계산돼 props로 들어온다.
// AI 티 방지: 자막은 강조 문장만 · 등속 금지(easing) · 인트로 카드 없음 (규칙: docs/마케팅/MARKETING.md)
import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";
import type { Chapter, Line, LongformProps } from "./schema";

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

//////////////////////////////////////// 화면 ////////////////////////////////////////

////////// 긴 캡처 이미지 — 챕터 길이에 맞춰 세로 스크롤 (등속 금지)
const ImageScreen: React.FC<{ src: string; scroll: boolean; durationInFrames: number }> = ({ src, scroll, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  // 캡처는 1655~1905px 폭. 화면 폭에 맞춰 확대했을 때의 실제 높이를 알 수 없으므로
  // objectFit: cover + translateY 비율로 처리한다 (이미지 원본 비율 무관하게 동작).
  const progress = scroll ? interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp", easing: EASE }) : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.canvas, overflow: "hidden" }}>
      <Img
        src={staticFile(src)}
        style={{
          width: width * 0.92,
          marginLeft: width * 0.04,
          // 스크롤: 이미지가 화면보다 길 때 위→아래로 흐른다. 짧으면 progress가 무의미해 그대로 보임.
          transform: `translateY(${scroll ? -progress * 100 : 0}%)`,
          position: "absolute",
          top: scroll ? 0 : "50%",
          ...(scroll ? {} : { transform: "translateY(-50%)" }),
        }}
      />
    </AbsoluteFill>
  );
};

////////// 실시간 녹화 — 나레이션보다 짧으면 마지막 프레임 정지, 길면 배속
const VideoScreen: React.FC<{ src: string; trimSec: number; playbackRate: number }> = ({ src, trimSec, playbackRate }) => (
  <AbsoluteFill style={{ backgroundColor: COLOR.canvas }}>
    <OffthreadVideo
      src={staticFile(src)}
      startFrom={Math.round(trimSec * 30)}
      playbackRate={playbackRate}
      muted
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  </AbsoluteFill>
);

const ChapterScreen: React.FC<{ chapter: Chapter }> = ({ chapter }) => {
  const { screen, durationInFrames } = chapter;
  if (screen.kind === "image") return <ImageScreen src={screen.src} scroll={screen.scroll} durationInFrames={durationInFrames} />;
  if (screen.kind === "video") return <VideoScreen src={screen.src} trimSec={screen.trimSec} playbackRate={screen.playbackRate} />;
  return null; // hold — 직전 화면 유지 (인트로 카드 금지)
};

//////////////////////////////////////// 자막 ////////////////////////////////////////

////////// 강조 문장만 표시. 위치는 편별 변주(captionVariant)로 템플릿 티 제거
const Caption: React.FC<{ text: string; variant: number }> = ({ text, variant }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp", easing: EASE });
  const bottomByVariant = [96, 120, 144][variant % 3];
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bottomByVariant }}>
      <div
        style={{
          opacity,
          fontFamily: FONT_STACK,
          fontSize: 46,
          fontWeight: 700,
          color: COLOR.ink,
          backgroundColor: "rgba(255,255,255,0.92)",
          padding: "14px 30px",
          borderRadius: 14,
          maxWidth: "78%",
          textAlign: "center",
          lineHeight: 1.35,
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

//////////////////////////////////////// 루트 ////////////////////////////////////////

export const LongForm: React.FC<LongformProps> = ({ lines, chapters, captionVariant }) => (
  <AbsoluteFill style={{ backgroundColor: COLOR.canvas }}>
    {/* 화면 — 챕터 단위. hold 챕터는 렌더하지 않아 직전 화면이 그대로 남는다 */}
    {chapters.map((chapter) => (
      <Sequence key={chapter.index} from={chapter.from} durationInFrames={chapter.durationInFrames} name={`ch${chapter.index} ${chapter.title}`}>
        <ChapterScreen chapter={chapter} />
      </Sequence>
    ))}

    {/* 나레이션 + 자막 — 문장 단위 */}
    {lines.map((line: Line, i: number) => (
      <Sequence key={i} from={line.from} durationInFrames={line.durationInFrames} name={line.text.slice(0, 16)}>
        <Audio src={staticFile(line.audioSrc)} />
        {line.showCaption ? <Caption text={line.text} variant={captionVariant} /> : null}
      </Sequence>
    ))}
  </AbsoluteFill>
);
