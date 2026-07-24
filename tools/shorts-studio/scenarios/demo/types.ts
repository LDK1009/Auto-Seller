//////////////////////////////////////// 데모 시나리오 타입 ////////////////////////////////////////
import type { HumanPage } from "../../scripts/lib/humanize";

export type DemoScene = {
  title: string; // 좌상단 씬 제목 — 지금 뭘 하는 단계인지
  caption: string; // 하단 자막 — 한 동작 한 줄
};

export type DemoScenario = {
  id: string; // 파일명·출력명과 동일 (예: nukki-basic)
  title: string; // 영상 제목 (파일명에 사용)
  url: string; // 시작 경로
  hookText: string; // 첫 3초 훅 문구 — 시청자를 붙잡는 한 줄
  ctaText: string; // 엔딩 CTA 문구
  hookAtScene?: number; // 훅으로 쓸 장면의 씬 인덱스 (기본: 마지막 씬 = 결과 화면)
  scenes: DemoScene[]; // 씬 = 녹화 중 markScene() 호출 순서와 1:1
  desktop?: boolean; // PC뷰 녹화 (기본 true — 줌으로 영역을 채운다)
  run: (p: HumanPage) => Promise<void>;
};
