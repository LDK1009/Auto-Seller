//////////////////////////////////////// 롱폼 합성 (1920×1080) ////////////////////////////////////////
// 오디오가 타임라인을 지배한다 — 문장별 실측 길이로 프레임이 이미 계산돼 props로 들어온다.
// AI 티 방지 (규칙: docs/마케팅/MARKETING.md):
//   전문장 자막 · 등속 금지(easing) · 화면 전환 크로스페이드 · 정지 이미지엔 켄번스(줌·팬) + 강조
import { AbsoluteFill, Audio, Easing, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT_STACK } from "../theme";
import { TABLES as SLIDE_TABLES } from "./slideData";
import type { Chapter, Line, LongformProps } from "./schema";

const EASE = Easing.bezier(0.4, 0, 0.2, 1);
const FADE = 12; // 챕터 전환 크로스페이드 프레임 (0.4초)

////////// 사람 스크롤 리듬 — 3구간으로 나눠 "내려가다 멈칫, 다시" 를 스프링 감속으로.
// 등속(linear) 대신 각 구간을 spring으로 이어 관성·정지감을 준다.
const humanScrollProgress = (frame: number, fps: number, durationInFrames: number): number => {
  const stops = [0, 0.42, 0.72, 1]; // 목적지 비율 (멈칫하는 지점들)
  const seg = (durationInFrames - fps) / (stops.length - 1); // 마지막 1초는 멈춤 여백
  const idx = Math.min(stops.length - 2, Math.floor(frame / seg));
  const local = spring({ frame: frame - idx * seg, fps, config: { damping: 26, mass: 0.9, stiffness: 55 }, durationInFrames: Math.round(seg) });
  return interpolate(local, [0, 1], [stops[idx], stops[idx + 1]]);
};

//////////////////////////////////////// 화면 ////////////////////////////////////////

////////// 정적 이미지 — 지루함 방지: 항상 켄번스(느린 줌·팬)를 준다.
// scroll=true(긴 full 캡처)면 세로 이동, false면 완만한 확대.
const ImageScreen: React.FC<{ src: string; scroll: boolean; durationInFrames: number }> = ({ src, scroll, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();

  if (scroll) {
    // 긴 캡처: 사람 스크롤 리듬(스프링 감속)으로 위→아래. 폭을 꽉 채워 글씨를 키운다.
    const p = humanScrollProgress(frame, fps, durationInFrames);
    const y = interpolate(p, [0, 1], [0, -78]); // % — 이미지 하단까지
    return (
      <AbsoluteFill style={{ backgroundColor: COLOR.canvas, overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ width, position: "absolute", top: 0, transform: `translateY(${y}%)` }} />
      </AbsoluteFill>
    );
  }

  // 짧은 캡처: 1.0→1.08배 완만 확대 + 미세 팬 (정지 화면 지루함 제거)
  const p = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp", easing: EASE });
  const scale = interpolate(p, [0, 1], [1.0, 1.08]);
  const panX = interpolate(p, [0, 1], [0, -2]);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.canvas, justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
      <Img
        src={staticFile(src)}
        style={{ width: width * 0.9, transform: `scale(${scale}) translateX(${panX}%)`, transformOrigin: "center 30%" }}
      />
    </AbsoluteFill>
  );
};

////////// 녹화 화면 위 강조 링 — 정차역 시점에 해당 영역을 감싸 시선 유도
// contain 매핑: 1920×1080 화면에 원본(가로 녹화)이 꽉 차므로 좌표(0~1)를 그대로 화면 비율로 환산
const FocusRing: React.FC<{ focus: { at: number; x: number; y: number; w: number; h: number; holdSec: number } }> = ({ focus }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // at은 빌더가 화면 시각(트림 반영, 1.0배)으로 변환해 넘김
  const nowSec = frame / fps;
  const start = focus.at;
  const end = focus.at + focus.holdSec;
  if (nowSec < start - 0.3 || nowSec > end + 0.3) return null;

  const appear = spring({ frame: Math.round((nowSec - start + 0.3) * fps), fps, config: { damping: 14 } });
  const fadeOut = interpolate(nowSec, [end, end + 0.3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const boxW = (focus.w || 0.5) * width;
  const boxH = (focus.h || 0.12) * height;
  const left = focus.x * width - boxW / 2;
  const top = focus.y * height - boxH / 2;
  const settle = 1.1 - appear * 0.1;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: boxW,
        height: boxH,
        border: `5px solid ${COLOR.brand}`,
        borderRadius: 14,
        boxShadow: `0 0 0 9999px rgba(17,19,24,0.28)`, // 바깥을 살짝 어둡게 — 링 안으로 시선 집중
        opacity: appear * fadeOut,
        transform: `scale(${settle})`,
      }}
    />
  );
};

////////// 서비스 URL 배지 — 우리 도구 화면일 때 상단 중앙 상시 노출
const ServiceBadge: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 40,
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(17,19,24,0.82)",
      color: "#fff",
      fontFamily: FONT_STACK,
      fontSize: 34,
      fontWeight: 700,
      padding: "12px 28px",
      borderRadius: 999,
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}
  >
    <span style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: COLOR.brand }} />
    auto-seller.co.kr · 프로필 링크
  </div>
);

////////// 실시간 녹화 — 1.0배 재생. videoFrames 이후는 마지막 프레임 정지(Freeze)로 seek 에러 방지
const VideoScreen: React.FC<{ src: string; trimSec: number; videoFrames: number; isOurService: boolean; focuses: { at: number; x: number; y: number; w: number; h: number; holdSec: number }[] }> = ({ src, trimSec, videoFrames, isOurService, focuses }) => {
  const frame = useCurrentFrame();
  const startFrom = Math.round(trimSec * 30);
  const past = frame >= videoFrames - 1; // 영상 끝 도달 → 정지
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.canvas }}>
      <Freeze frame={videoFrames - 1} active={past}>
        <OffthreadVideo src={staticFile(src)} startFrom={startFrom} muted style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </Freeze>
      {focuses.map((f, i) => (
        <FocusRing key={i} focus={f} />
      ))}
      {isOurService ? <ServiceBadge /> : null}
    </AbsoluteFill>
  );
};

////////// 아웃트로 — 핵심 요약 + 구독 유도 (갑자기 끝나는 느낌 제거)
const OutroScreen: React.FC<{ summary: string[] }> = ({ summary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.ink, justifyContent: "center", padding: "0 160px", fontFamily: FONT_STACK }}>
      <div style={{ color: COLOR.brand, fontSize: 40, fontWeight: 800, marginBottom: 48 }}>오늘 정리</div>
      {summary.map((s, i) => {
        const appear = interpolate(frame, [i * 12, i * 12 + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
        return (
          <div key={i} style={{ opacity: appear, transform: `translateY(${(1 - appear) * 16}px)`, fontSize: 52, fontWeight: 700, color: "#fff", lineHeight: 1.5, marginBottom: 26 }}>
            {s}
          </div>
        );
      })}
      {(() => {
        const cta = interpolate(frame, [summary.length * 12 + 6, summary.length * 12 + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
        return (
          <div style={{ opacity: cta, marginTop: 60, fontSize: 40, fontWeight: 600, color: COLOR.inkDim }}>
            도움이 됐다면 구독, 궁금한 건 댓글로 — 자세한 건 프로필 링크(auto-seller.co.kr)
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};

////////// 아이콘 — SVG (외부 리소스 없이 인라인). 시선 포인트
const Icon: React.FC<{ name: string; size?: number }> = ({ name, size = 40 }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "warning")
    return (
      <svg {...common} stroke="#E8590C"><path d="M12 3L2 20h20L12 3z" /><line x1="12" y1="10" x2="12" y2="14" /><circle cx="12" cy="17.5" r="0.6" fill="#E8590C" stroke="#E8590C" /></svg>
    );
  if (name === "check")
    return <svg {...common} stroke={COLOR.brand}><path d="M20 6L9 17l-5-5" /></svg>;
  return <svg {...common} stroke={COLOR.inkDim}><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><circle cx="12" cy="8" r="0.6" fill={COLOR.inkDim} stroke={COLOR.inkDim} /></svg>; // info
};

////////// 표 슬라이드 — 원본 표를 코드로 재현. 말하는 행에 형광펜 + 헤더 순차 등장
const SlideScreen: React.FC<{ heading: string; tableId: string; highlights: { from: number; to: number; row: number }[] }> = ({ heading, tableId, highlights }) => {
  const frame = useCurrentFrame();
  const table = SLIDE_TABLES[tableId];
  if (!table) return <AbsoluteFill style={{ backgroundColor: COLOR.canvas }} />;

  const activeRow = highlights.find((h) => frame >= h.from && frame < h.to)?.row ?? -1;
  const headIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp", easing: EASE });

  // 행이 많으면 자동 축소 — 5행 표도 자막 영역(하단) 위에 다 들어오게
  const many = table.rows.length >= 5;
  const cellPadV = many ? 14 : 20;
  const cellFont = many ? 32 : 38;
  const headFont = many ? 27 : 30;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.canvas, padding: "56px 130px 210px", fontFamily: FONT_STACK, justifyContent: "flex-start" }}>
      <div style={{ fontSize: 52, fontWeight: 800, color: COLOR.ink, marginBottom: 26, opacity: headIn, transform: `translateY(${(1 - headIn) * 12}px)` }}>{heading}</div>

      {/* 표 — 원본 그대로 */}
      <div style={{ borderRadius: 16, overflow: "hidden", border: `2px solid ${COLOR.cardBorder}`, boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${table.columns.length}, 1fr)`, backgroundColor: "#F1F2F4" }}>
          {table.columns.map((c, i) => (
            <div key={i} style={{ padding: `14px 18px`, fontSize: headFont, fontWeight: 700, color: COLOR.inkDim, textAlign: "center" }}>{c}</div>
          ))}
        </div>
        {table.rows.map((row, ri) => {
          const on = ri === activeRow;
          const rowIn = interpolate(frame, [14 + ri * 6, 24 + ri * 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
          return (
            <div key={ri} style={{ display: "grid", gridTemplateColumns: `repeat(${table.columns.length}, 1fr)`, backgroundColor: on ? COLOR.highlight : ri % 2 ? "#FbFbFc" : "#fff", opacity: rowIn, borderTop: `1px solid ${COLOR.cardBorder}` }}>
              {row.map((cell, ci) => (
                <div key={ci} style={{ padding: `${cellPadV}px 18px`, fontSize: ci === 0 ? cellFont + 4 : cellFont, fontWeight: ci === 0 ? 800 : 600, color: COLOR.ink, textAlign: "center" }}>{cell}</div>
              ))}
            </div>
          );
        })}
      </div>

      {/* 조건 — 아이콘 + 문구, 순차 등장 */}
      {table.notes?.map((n, i) => {
        const noteIn = interpolate(frame, [30 + table.rows.length * 6 + i * 12, 42 + table.rows.length * 6 + i * 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: i === 0 ? 26 : 16, opacity: noteIn, transform: `translateX(${(1 - noteIn) * 20}px)` }}>
            <Icon name={n.icon} size={36} />
            <div style={{ fontSize: 36, fontWeight: 600, color: COLOR.ink }}>{n.text}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

////////// 인트로 — 오프닝 1회. 제목 크게 + 검색어 태그. 잔잔한 등장
const IntroScreen: React.FC<{ title: string; keyword: string }> = ({ title, keyword }) => {
  const frame = useCurrentFrame();
  const titleIn = interpolate(frame, [4, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const kwIn = interpolate(frame, [18, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.canvas, justifyContent: "center", padding: "0 160px", fontFamily: FONT_STACK }}>
      <div style={{ opacity: kwIn, marginBottom: 32 }}>
        <span style={{ fontSize: 34, fontWeight: 700, color: "#fff", backgroundColor: COLOR.brand, padding: "10px 24px", borderRadius: 999 }}>
          {keyword}
        </span>
      </div>
      <div style={{ opacity: titleIn, transform: `translateY(${(1 - titleIn) * 16}px)`, fontSize: 82, fontWeight: 800, color: COLOR.ink, lineHeight: 1.28, maxWidth: "88%" }}>
        {title}
      </div>
    </AbsoluteFill>
  );
};

const ChapterScreen: React.FC<{ chapter: Chapter }> = ({ chapter }) => {
  const { screen, durationInFrames } = chapter;
  if (screen.kind === "intro") return <IntroScreen title={screen.title} keyword={screen.keyword} />;
  if (screen.kind === "image") return <ImageScreen src={screen.src} scroll={screen.scroll} durationInFrames={durationInFrames} />;
  if (screen.kind === "video") return <VideoScreen src={screen.src} trimSec={screen.trimSec} videoFrames={screen.videoFrames} isOurService={screen.isOurService} focuses={screen.focuses} />;
  if (screen.kind === "slide") return <SlideScreen heading={screen.heading} tableId={screen.tableId} highlights={screen.highlights} />;
  if (screen.kind === "outro") return <OutroScreen summary={screen.summary} />;
  return null;
};

////////// 챕터 래퍼 — 앞뒤 크로스페이드로 딱딱한 컷 제거
const ChapterLayer: React.FC<{ chapter: Chapter; isFirst: boolean }> = ({ chapter, isFirst }) => {
  const frame = useCurrentFrame();
  const opacity = isFirst
    ? 1
    : interpolate(frame, [0, FADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  return (
    <AbsoluteFill style={{ opacity }}>
      <ChapterScreen chapter={chapter} />
    </AbsoluteFill>
  );
};

//////////////////////////////////////// 자막 ////////////////////////////////////////

////////// 전문장 자막. 정차역 문장은 강조색으로 시선 고정
const Caption: React.FC<{ text: string; isStation: boolean; variant: number }> = ({ text, isStation, variant }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 4], [0, 1], { extrapolateRight: "clamp", easing: EASE });
  const bottomByVariant = [88, 104, 120][variant % 3];
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bottomByVariant }}>
      <div
        style={{
          opacity,
          fontFamily: FONT_STACK,
          fontSize: 46,
          fontWeight: 700,
          color: isStation ? "#fff" : COLOR.ink,
          backgroundColor: isStation ? COLOR.brand : "rgba(255,255,255,0.94)",
          padding: "16px 34px",
          borderRadius: 16,
          maxWidth: "80%",
          textAlign: "center",
          lineHeight: 1.35,
          boxShadow: "0 6px 28px rgba(0,0,0,0.14)",
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
    {/* 화면 — 챕터 단위. 크로스페이드를 위해 전환 구간이 겹치도록 FADE만큼 당겨 시작 */}
    {chapters.map((chapter, i) => (
      <Sequence
        key={chapter.index}
        from={Math.max(0, chapter.from - (i === 0 ? 0 : FADE))}
        durationInFrames={chapter.durationInFrames + (i === 0 ? 0 : FADE)}
        name={`ch${chapter.index} ${chapter.title}`}
      >
        <ChapterLayer chapter={chapter} isFirst={i === 0} />
      </Sequence>
    ))}

    {/* 나레이션 + 자막 — 문장 단위 */}
    {lines.map((line: Line, i: number) => (
      <Sequence key={i} from={line.from} durationInFrames={line.durationInFrames} name={line.text.slice(0, 16)}>
        <Audio src={staticFile(line.audioSrc)} />
        {line.showCaption ? <Caption text={line.text} isStation={line.isStation} variant={captionVariant} /> : null}
      </Sequence>
    ))}
  </AbsoluteFill>
);
