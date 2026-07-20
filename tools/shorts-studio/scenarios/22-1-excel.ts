//////////////////////////////////////// #22-1 엑셀 대량 가공 ////////////////////////////////////////
import type { Scenario } from "../scripts/lib/recorder";
import { uploadAssets } from "./_lib/upload";

export const scenario: Scenario = {
  id: "22-1",
  url: "/excel-import",
  recapItems: ["엑셀 업로드", "상품 목록 자동 로드", "이미지 일괄 처리 연결"],
  run: async (p) => {
    await uploadAssets(p, "ep22"); // products.xlsx
    // 파싱 완료 대기 — 상품 목록 등장
    await p.waitVisible(p.page.getByText(/상품 \d+개/).first(), 60000);
    // 정차 1 — 파일·상품 개수
    await p.showSection(p.page.getByText(/상품 \d+개/).first(), 2);
    // 정차 2 — 상품 행 목록
    await p.showSection(p.page.getByText("샘플 상품 1").first(), 2);
    // 정차 3 — 누끼 일괄 시작 버튼
    await p.showSection(p.page.getByRole("button", { name: /누끼 일괄 시작/ }).first(), 2.2);
  },
};
