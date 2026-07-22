//////////////////////////////////////// 유튜브 썸네일 (1280×720) ////////////////////////////////////////
// 정적 스틸로 추출. 모바일에서 작게 보이므로 텍스트 크고 대비 강하게, 핵심 숫자 강조.
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { COLOR, FONT_STACK } from "../theme";

export const thumbnailSchema = z.object({
  eyebrow: z.string(), // 상단 작은 라벨 (검색어·카테고리)
  line1: z.string(),
  line2: z.string(),
  highlight: z.string(), // 강조 숫자·키워드
});

export type ThumbnailProps = z.infer<typeof thumbnailSchema>;

export const Thumbnail: React.FC<ThumbnailProps> = ({ eyebrow, line1, line2, highlight }) => (
  <AbsoluteFill style={{ backgroundColor: COLOR.canvas, fontFamily: FONT_STACK, padding: "76px 84px", justifyContent: "center" }}>
    {/* 좌측 세로 브랜드 바 */}
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 20, backgroundColor: COLOR.brand }} />

    {/* 상단 라벨 */}
    <div style={{ marginBottom: 28 }}>
      <span style={{ fontSize: 34, fontWeight: 800, color: "#fff", backgroundColor: COLOR.brand, padding: "10px 26px", borderRadius: 12 }}>
        {eyebrow}
      </span>
    </div>

    {/* 제목 2줄 */}
    <div style={{ fontSize: 82, fontWeight: 900, color: COLOR.ink, lineHeight: 1.18, letterSpacing: "-1px" }}>
      <div>{line1}</div>
      <div>
        {line2}{" "}
        <span style={{ backgroundColor: COLOR.highlight, padding: "0 14px", borderRadius: 10, boxDecorationBreak: "clone" }}>{highlight}</span>
      </div>
    </div>

    {/* 하단 브랜드 */}
    <div style={{ position: "absolute", right: 76, bottom: 60, fontSize: 32, fontWeight: 700, color: COLOR.inkDim }}>auto-seller.co.kr</div>
  </AbsoluteFill>
);
