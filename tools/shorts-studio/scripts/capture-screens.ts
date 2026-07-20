//////////////////////////////////////// 블로그용 화면 캡처 ////////////////////////////////////////
// 서비스 주요 화면을 PC뷰로 일괄 캡처 → 저장소 public/marketing/ (Vercel 서빙 = 고정 URL)
// 사용: npx tsx scripts/capture-screens.ts  →  https://www.auto-seller.co.kr/marketing/<파일명>.png
import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const OUT = resolve(__dirname, "../../../public/marketing");
const BASE = process.env.SHORTS_BASE_URL ?? "https://www.auto-seller.co.kr";
const VIEWPORT = { width: 1440, height: 900 };

// 도구별 초기 화면 (라우트 = 파일명)
const TOOL_ROUTES = [
  "domeggook-import",
  "domeggook-search",
  "excel-import",
  "image-check",
  "image-resize",
  "image-split",
  "background-removal",
  "watermark",
  "keyword-stats",
  "margin-calculator",
  "roas-calculator",
  "vat-calculator",
];

const shot = async (page: Page, name: string) => {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`📸 ${name}.png`);
};

const main = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });

  ////////// 홈
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(page, "home");

  ////////// 각 도구 초기 화면
  for (const route of TOOL_ROUTES) {
    await page.goto(`${BASE}/${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await shot(page, route);
  }

  ////////// 원링크 실사용 화면 (검색 결과 + 등록 시트)
  await page.goto(`${BASE}/domeggook-import`, { waitUntil: "networkidle" });
  await page.getByLabel(/도매꾹 링크·상품번호 또는 검색어/).fill("캠핑랜턴");
  await page.getByRole("button", { name: /^(검색|조회)$/ }).first().click();
  await page.getByText(/최소 \d+개/).first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(800);
  await shot(page, "domeggook-import-search");

  await page.getByText(/최소 \d+개/).first().click();
  await page.getByText("상품 정보").first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot(page, "domeggook-import-sheet");

  // 시트 판매가 섹션까지 스크롤
  await page.getByText("판매가").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await shot(page, "domeggook-import-sheet-price");

  await browser.close();
  console.log(`✅ 저장 위치: ${OUT}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
