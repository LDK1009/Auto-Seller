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
  scenes: DemoScene[]; // 씬 = 녹화 중 markScene() 호출 순서와 1:1
  run: (p: HumanPage) => Promise<void>;
};
