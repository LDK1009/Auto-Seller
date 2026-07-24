//////////////////////////////////////// 데모 영상 합성 (1080×1920) ////////////////////////////////////////
// PC뷰 녹화를 세로 프레임에 담되, 강조 구간은 스프링 줌인으로 꽉 채운다.
// 원칙 (2026-07-24 피드백):
//   ① 첫 3초 훅 — 하이라이트 장면 먼저  ② 시선이 갈 곳을 항상 지정  ③ 로딩 구간 삭제
//   ④ 템포 빠르게  ⑤ 씬 제목 크게  ⑥ 끝에 CTA  ⑦ 모든 움직임은 스프링
import { AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";
import type { DemoProps, focusSchema } from "./schema";
import type { z } from "zod";

type Focus = z.infer<typeof focusSchema>;
const EASE = Easing.bezier(0.4, 0, 0.2, 1);

//////////////////////////////////////// 프레임 선택 ////////////////////////////////////////

////////// 출력 시각 → 원본 프레임 번호. 로딩 구간(segments 사이)은 건너뛴다.
const pickSrcFrame = (outSec: number, segments: DemoProps["segments"], srcFps: number, frameCount: number) => {
  let remain = outSec;
  for (const seg of segments) {
    const len = seg.to - seg.from;
    if (remain <= len) return Math.min(frameCount, Math.max(1, Math.round((seg.from + remain) * srcFps) + 1));
    remain -= len;
  }
  return frameCount; // 끝을 넘으면 마지막 프레임 유지
};

//////////////////////////////////////// 화면 (줌 포함) ////////////////////////////////////////

// contain 배치 결과 — 실제 이미지가 프레임 안 어디에 얼마 크기로 놓이는지.
// 링 좌표(0~1은 녹화 화면 기준)를 프레임 픽셀로 옮기려면 이 값이 필요하다. 어긋남의 근본 원인.
const layout = (srcW: number, srcH: number, frameW: number, frameH: number) => {
  const s = Math.min(frameW / srcW, frameH / srcH);
  const w = srcW * s;
  const h = srcH * s;
  return { left: (frameW - w) / 2, top: (frameH - h) / 2, w, h };
};

// 기본 배율 — 녹화 화면 하단은 대개 빈 공간이라 살짝 확대해 콘텐츠를 키운다.
// 원점을 위쪽(35%)에 두어 상단 컨트롤 영역이 잘리지 않게 한다.
const BASE_SCALE = 1.22;
const BASE_ORIGIN_Y = 0.35;

////////// 강조 구간이면 그 영역으로 스프링 줌인. 화면·링에 같은 변환을 쓴다.
const useZoom = (focuses: Focus[], nowSec: number, fps: number) => {
  const active = focuses.find((f) => nowSec >= f.at - 0.3 && nowSec <= f.at + f.holdSec + 0.3);
  if (!active) return { scale: BASE_SCALE, ox: 0.5, oy: BASE_ORIGIN_Y };

  const inP = spring({ frame: Math.round((nowSec - (active.at - 0.3)) * fps), fps, config: { damping: 24, mass: 0.6, stiffness: 100 } });
  const outStart = active.at + active.holdSec;
  const outP = nowSec > outStart ? spring({ frame: Math.round((nowSec - outStart) * fps), fps, config: { damping: 24, mass: 0.6, stiffness: 100 } }) : 0;
  const amount = inP * (1 - outP);

  // 강조 박스가 화면 폭의 72%를 차지하도록 (최대 2.8배)
  const target = Math.min(2.8, Math.max(BASE_SCALE + 0.15, 0.72 / Math.max(0.1, active.w)));
  return {
    scale: BASE_SCALE + (target - BASE_SCALE) * amount,
    ox: 0.5 + (active.x - 0.5) * amount, // 확대 원점을 강조 영역으로 이동
    oy: BASE_ORIGIN_Y + (active.y - BASE_ORIGIN_Y) * amount,
  };
};

type Zoom = ReturnType<typeof useZoom>;

const Screen: React.FC<{ frameDir: string; srcFrame: number; zoom: Zoom }> = ({ frameDir, srcFrame, zoom }) => (
  <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
    <Img
      src={staticFile(`${frameDir}/${String(srcFrame).padStart(5, "0")}.jpg`)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        transform: `scale(${zoom.scale})`,
        transformOrigin: `${zoom.ox * 100}% ${zoom.oy * 100}%`,
      }}
    />
  </AbsoluteFill>
);

////////// 강조 링 — 화면과 동일한 contain 배치 + 줌 변환을 적용해야 대상 위에 정확히 얹힌다
const FocusRing: React.FC<{ focus: Focus; zoom: Zoom; srcW: number; srcH: number }> = ({ focus, zoom, srcW, srcH }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const nowSec = frame / fps;
  if (nowSec < focus.at - 0.2 || nowSec > focus.at + focus.holdSec + 0.25) return null;

  const appear = spring({ frame: Math.round((nowSec - focus.at + 0.2) * fps), fps, config: { damping: 15 } });
  const fadeOut = interpolate(nowSec, [focus.at + focus.holdSec, focus.at + focus.holdSec + 0.25], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 1) contain 배치에서의 위치 → 2) 줌 변환(transform-origin 기준 확대) 적용
  const L = layout(srcW, srcH, width, height);
  const rawX = L.left + focus.x * L.w;
  const rawY = L.top + focus.y * L.h;
  const originX = zoom.ox * width;
  const originY = zoom.oy * height;
  const cx = originX + (rawX - originX) * zoom.scale;
  const cy = originY + (rawY - originY) * zoom.scale;
  const boxW = focus.w * L.w * zoom.scale;
  const boxH = focus.h * L.h * zoom.scale;

  return (
    <div
      style={{
        position: "absolute",
        left: cx - boxW / 2,
        top: cy - boxH / 2,
        width: boxW,
        height: boxH,
        border: `7px solid ${COLOR.brand}`,
        borderRadius: 16,
        boxShadow: "0 0 0 9999px rgba(17,19,24,0.38)",
        opacity: appear * fadeOut,
      }}
    />
  );
};

//////////////////////////////////////// 오버레이 ////////////////////////////////////////

////////// 좌상단 씬 제목 — 크게. 작으면 안 보인다
const SceneTitle: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 18 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 54,
        left: 44,
        right: 44,
        opacity: appear,
        transform: `translateY(${(1 - appear) * -18}px)`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        backgroundColor: COLOR.brand,
        padding: "22px 30px",
        borderRadius: 18,
        boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ fontFamily: FONT_STACK, fontSize: 60, fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>{text}</div>
    </div>
  );
};

////////// 하단 자막
const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 20 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 150 }}>
      <div
        style={{
          opacity: appear,
          transform: `translateY(${(1 - appear) * 14}px)`,
          fontFamily: FONT_STACK,
          fontSize: 52,
          fontWeight: 800,
          color: "#fff",
          backgroundColor: "rgba(17,19,24,0.9)",
          padding: "22px 38px",
          borderRadius: 20,
          maxWidth: "90%",
          textAlign: "center",
          lineHeight: 1.32,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

////////// 오프닝 훅 — 첫 3초. 결과 장면 + 큰 문구로 붙잡는다
const Hook: React.FC<{ frameDir: string; srcFrame: number; text: string }> = ({ frameDir, srcFrame, text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  // 살짝 줌아웃되며 등장 — 정지 화면보다 시선을 끈다
  const scale = interpolate(pop, [0, 1], [BASE_SCALE + 0.16, BASE_SCALE + 0.04]);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.canvas, overflow: "hidden" }}>
      <Img
        src={staticFile(`${frameDir}/${String(srcFrame).padStart(5, "0")}.jpg`)}
        style={{ width: "100%", height: "100%", objectFit: "contain", transform: `scale(${scale})`, transformOrigin: `50% ${BASE_ORIGIN_Y * 100}%` }}
      />
      <AbsoluteFill style={{ backgroundColor: "rgba(17,19,24,0.45)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 70px" }}>
        <div
          style={{
            opacity: pop,
            transform: `scale(${0.9 + pop * 0.1})`,
            fontFamily: FONT_STACK,
            fontSize: 88,
            fontWeight: 900,
            color: "#fff",
            textAlign: "center",
            lineHeight: 1.24,
            textShadow: "0 6px 30px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

////////// 엔딩 CTA — 어디로 가면 되는지
const Cta: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: "rgba(17,19,24,0.92)" }}>
      <div style={{ opacity: appear, transform: `translateY(${(1 - appear) * 20}px)`, textAlign: "center", fontFamily: FONT_STACK }}>
        <div style={{ fontSize: 62, fontWeight: 900, color: "#fff", lineHeight: 1.3, marginBottom: 34 }}>{text}</div>
        <div style={{ fontSize: 46, fontWeight: 800, color: "#fff", backgroundColor: COLOR.brand, padding: "20px 44px", borderRadius: 999, display: "inline-block" }}>
          프로필 링크에서 바로
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, color: "rgba(255,255,255,0.72)", marginTop: 26 }}>auto-seller.co.kr</div>
      </div>
    </AbsoluteFill>
  );
};

//////////////////////////////////////// 루트 ////////////////////////////////////////

const Body: React.FC<DemoProps> = ({ frameDir, frameCount, srcFps, srcW, srcH, segments, scenes, focuses }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSec = frame / fps;
  const srcFrame = pickSrcFrame(nowSec, segments, srcFps, frameCount);
  const zoom = useZoom(focuses, nowSec, fps);

  return (
    <AbsoluteFill>
      <Screen frameDir={frameDir} srcFrame={srcFrame} zoom={zoom} />
      {focuses.map((f, i) => (
        <FocusRing key={i} focus={f} zoom={zoom} srcW={srcW} srcH={srcH} />
      ))}
      {scenes.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.durationInFrames} name={s.title}>
          <SceneTitle text={s.title} />
          <Caption text={s.caption} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const Demo: React.FC<DemoProps> = (props) => {
  const { hook, ctaText, durationInFrames } = props;
  const CTA_FRAMES = 60; // 2초
  const bodyFrames = durationInFrames - hook.durationInFrames - CTA_FRAMES;

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.canvas }}>
      <Sequence durationInFrames={hook.durationInFrames} name="훅">
        <Hook frameDir={props.frameDir} srcFrame={Math.max(1, Math.round(hook.srcSec * props.srcFps))} text={hook.text} />
      </Sequence>

      <Sequence from={hook.durationInFrames} durationInFrames={bodyFrames} name="본편">
        <Body {...props} />
      </Sequence>

      <Sequence from={hook.durationInFrames + bodyFrames} durationInFrames={CTA_FRAMES} name="CTA">
        <Cta text={ctaText} />
      </Sequence>
    </AbsoluteFill>
  );
};
