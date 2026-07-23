//////////////////////////////////////// 데모 영상 합성 (1080×1920) ////////////////////////////////////////
// 기능 시연 — 광고가 아니라 설명서. 타이머·결과카드·BGM 없음.
// 화면(프레임 시퀀스) + 좌상단 씬 제목 + 하단 자막 + 강조 링.
import { AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";
import type { DemoProps } from "./schema";

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

////////// 강조 링 — 조작 대상 영역을 감싸고 바깥을 살짝 눌러 시선을 모은다
const FocusRing: React.FC<{ focus: DemoProps["focuses"][number] }> = ({ focus }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const nowSec = frame / fps;
  const start = focus.at;
  const end = focus.at + focus.holdSec;
  if (nowSec < start - 0.3 || nowSec > end + 0.3) return null;

  const appear = spring({ frame: Math.round((nowSec - start + 0.3) * fps), fps, config: { damping: 14 } });
  const fadeOut = interpolate(nowSec, [end, end + 0.3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const boxW = (focus.w || 0.5) * width;
  const boxH = (focus.h || 0.12) * height;
  return (
    <div
      style={{
        position: "absolute",
        left: focus.x * width - boxW / 2,
        top: focus.y * height - boxH / 2,
        width: boxW,
        height: boxH,
        border: `6px solid ${COLOR.brand}`,
        borderRadius: 16,
        boxShadow: "0 0 0 9999px rgba(17,19,24,0.30)",
        opacity: appear * fadeOut,
        transform: `scale(${1.1 - appear * 0.1})`,
      }}
    />
  );
};

////////// 좌상단 씬 제목 — 지금 뭘 하는 단계인지 상시 표시
const SceneTitle: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp", easing: EASE });
  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        left: 52,
        opacity: appear,
        transform: `translateX(${(1 - appear) * -14}px)`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        backgroundColor: "rgba(255,255,255,0.94)",
        padding: "14px 24px 14px 18px",
        borderRadius: 14,
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ width: 8, height: 40, borderRadius: 4, backgroundColor: COLOR.brand }} />
      <div style={{ fontFamily: FONT_STACK, fontSize: 44, fontWeight: 800, color: COLOR.ink }}>{text}</div>
    </div>
  );
};

////////// 하단 자막 — 한 동작 = 한 줄
const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp", easing: EASE });
  return (
    // 하단 여백을 크게 둬 화면 콘텐츠를 가리지 않는다 (안전존: 하단 420px)
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 130 }}>
      <div
        style={{
          opacity: appear,
          transform: `translateY(${(1 - appear) * 10}px)`,
          fontFamily: FONT_STACK,
          fontSize: 44,
          fontWeight: 700,
          color: "#fff",
          backgroundColor: "rgba(17,19,24,0.88)",
          padding: "18px 34px",
          borderRadius: 18,
          maxWidth: "88%",
          textAlign: "center",
          lineHeight: 1.36,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const Demo: React.FC<DemoProps> = ({ frameDir, frameCount, srcFps, scenes, focuses }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 컴포지션 시각 → 원본 프레임 번호. 끝을 넘으면 마지막 프레임 정지.
  const srcFrame = Math.min(frameCount, Math.max(1, Math.round((frame / fps) * srcFps) + 1));

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.canvas }}>
      {/* 녹화(414×896)를 세로 프레임 폭에 꽉 채운다. contain이면 좌우가 비어 답답하다. */}
      <Img
        src={staticFile(`${frameDir}/${String(srcFrame).padStart(5, "0")}.jpg`)}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
      />

      {focuses.map((f, i) => (
        <FocusRing key={i} focus={f} />
      ))}

      {scenes.map((scene, i) => (
        <Sequence key={i} from={scene.from} durationInFrames={scene.durationInFrames} name={scene.title}>
          <SceneTitle text={scene.title} />
          <Caption text={scene.caption} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
