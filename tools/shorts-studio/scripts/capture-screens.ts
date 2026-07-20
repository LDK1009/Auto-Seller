//////////////////////////////////////// 블로그용 화면 캡처 (조작 후 결과 상태) ////////////////////////////////////////
// 각 도구를 실제 조작해 "기능 작동 결과" 화면을 캡처 → public/marketing/ (Vercel 고정 URL)
// main 콘텐츠 영역만 캡처 → 사이드바·"준비 중" 배지 자동 제외
// 사용: npx tsx scripts/capture-screens.ts [원링크검색어] [접미사]
import { chromium, type Page } from "playwright";
import { mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import sharp from "sharp";

const OUT = resolve(__dirname, "../../../public/marketing");
const ASSETS = resolve(__dirname, "../assets");
const BASE = process.env.SHORTS_BASE_URL ?? "https://www.auto-seller.co.kr";
const VIEWPORT = { width: 1440, height: 900 };

// main 콘텐츠 영역만 저장 (사이드바·헤더 제외). 너무 길면 상단 크롭 (블로그·쓰레드용)
const MAX_H = 2800; // 픽셀(deviceScale 2 → CSS 1400) — 초과분 상단만
const shot = async (page: Page, name: string) => {
  const path = join(OUT, `${name}.png`);
  const main = page.locator("main").first();
  if (await main.count()) await main.screenshot({ path });
  else await page.screenshot({ path });
  // 세로 초과분 상단 크롭
  const meta = await sharp(path).metadata();
  if ((meta.height ?? 0) > MAX_H) {
    const buf = await sharp(path).extract({ left: 0, top: 0, width: meta.width!, height: MAX_H }).png().toBuffer();
    require("node:fs").writeFileSync(path, buf);
  }
  console.log(`📸 ${name}.png`);
};

const files = (folder: string, limit?: number) => {
  const dir = join(ASSETS, folder);
  return readdirSync(dir)
    .filter((f) => /\.(jpg|jpeg|png|webp|xlsx)$/i.test(f))
    .slice(0, limit)
    .map((f) => join(dir, f));
};

const upload = async (page: Page, folder: string, limit?: number) => {
  await page.locator('input[type="file"]').first().setInputFiles(files(folder, limit));
};

const main = async () => {
  const [keyword, suffix] = process.argv.slice(2);
  const onlyImport = Boolean(keyword);
  const tag = suffix ? `-${suffix}` : "";

  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  // 사이드바 접기(레일) — "원클릭 등록 준비 중" 배지 등 미출시 표기 숨김
  await page.addInitScript(() => localStorage.setItem("sidebar-collapsed", "1"));

  if (!onlyImport) {
    ////////// 홈
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await shot(page, "home");

    ////////// 키워드 분석 — 접속 직후 자동 표(이번 달 뜨는 키워드) = 기능 작동 화면
    await page.goto(`${BASE}/keyword-stats`, { waitUntil: "networkidle" });
    await page.getByText("이번 달 뜨는 키워드").first().waitFor({ timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, "keyword-stats");

    ////////// 도매꾹 검색 — 자동 인기순 결과
    await page.goto(`${BASE}/domeggook-search`, { waitUntil: "networkidle" });
    await page.getByText(/총 [\d,]+개 상품/).first().waitFor({ timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, "domeggook-search");

    ////////// 마진 계산 — 역산 결과
    await page.goto(`${BASE}/margin-calculator`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "판매가 역산" }).click();
    await page.getByLabel("원가 (매입가·공급가)").fill("13800");
    await page.getByLabel("실제 나가는 배송비").fill("3000");
    await page.getByText("마진 20%").first().click();
    await page.waitForTimeout(800);
    await shot(page, "margin-calculator");

    ////////// 광고 손익 (ROAS) — 결과
    await page.goto(`${BASE}/roas-calculator`, { waitUntil: "networkidle" });
    await page.getByLabel("판매가").fill("18900");
    await page.getByLabel("개당 순이익 (마진 계산기 결과)").fill("3800");
    await page.getByLabel("광고비").fill("100000");
    await page.getByLabel("광고 매출 (광고로 발생한 매출)").fill("420000");
    await page.waitForTimeout(800);
    await shot(page, "roas-calculator");

    ////////// 부가세 — 결과
    await page.goto(`${BASE}/vat-calculator`, { waitUntil: "networkidle" });
    await page.getByLabel("매출 (부가세 포함 공급대가)").fill("12000000");
    await page.getByLabel("매입 (세금계산서·카드 증빙분)").fill("7000000");
    await page.waitForTimeout(800);
    await shot(page, "vat-calculator");

    ////////// 규정 검사 — 업로드 후 자동 판정
    await page.goto(`${BASE}/image-check`, { waitUntil: "networkidle" });
    await upload(page, "ep20");
    await page.getByRole("button", { name: "규격 변환으로 보내기" }).waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await shot(page, "image-check");

    ////////// 규격 맞추기 — 변환 완료
    await page.goto(`${BASE}/image-resize`, { waitUntil: "networkidle" });
    await upload(page, "ep20", 10);
    await page.getByRole("button", { name: "규격 변환" }).click();
    await page.getByRole("button", { name: "다운로드" }).waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await shot(page, "image-resize");

    ////////// 워터마크 — 적용 완료
    await page.goto(`${BASE}/watermark`, { waitUntil: "networkidle" });
    await upload(page, "ep20", 6);
    await page.getByLabel("워터마크 문구").fill("오토셀러스토어");
    await page.getByRole("button", { name: "워터마크 적용" }).click();
    await page.getByRole("button", { name: "다운로드" }).waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await shot(page, "watermark");

    ////////// 상세 분할 — 분할 완료
    await page.goto(`${BASE}/image-split`, { waitUntil: "networkidle" });
    await upload(page, "ep-split", 1);
    await page.getByRole("button", { name: "분할하기" }).click();
    await page.getByRole("button", { name: /다운로드/ }).waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await shot(page, "image-split");

    ////////// 엑셀 대량 가공 — 목록 로드
    await page.goto(`${BASE}/excel-import`, { waitUntil: "networkidle" });
    await upload(page, "ep22");
    await page.getByText(/상품 \d+개/).first().waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await shot(page, "excel-import");

    ////////// 누끼 — 배경 제거 완료 (AI 모델 처리, 마지막에)
    await page.goto(`${BASE}/background-removal`, { waitUntil: "networkidle" });
    await upload(page, "ep20", 4);
    await page.getByRole("button", { name: "배경 제거" }).click();
    await page.getByRole("button", { name: "다운로드" }).waitFor({ timeout: 240000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await shot(page, "background-removal");
  }

  ////////// 원링크 시트 — 상세이미지 있는 상품 선택 (빈 썸네일 회피)
  await page.goto(`${BASE}/domeggook-import`, { waitUntil: "networkidle" });
  await page.getByLabel(/도매꾹 링크·상품번호 또는 검색어/).fill(keyword ?? "주방수납");
  await page.getByRole("button", { name: /^(검색|조회)$/ }).first().click();
  await page.getByText(/최소 \d+개/).first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(800);
  await shot(page, `domeggook-import-search${tag}`);

  // 첫 카드 클릭 → 시트
  await page.getByText(/최소 \d+개/).first().click();
  await page.getByText("상품 정보").first().waitFor({ state: "visible", timeout: 30000 });
  // 대표이미지 실제 로드 대기 (빈 박스 방지) — 상품 정보 영역 img가 complete 될 때까지
  await page
    .waitForFunction(
      () => {
        const imgs = Array.from(document.querySelectorAll("img"));
        return imgs.some((i) => i.naturalWidth > 50 && i.complete);
      },
      { timeout: 20000 },
    )
    .catch(() => {});
  // 카테고리 추천 로딩 완료 대기 ("찾는 중" 사라짐)
  await page.getByText(/추천 카테고리를 찾는 중/).waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await shot(page, `domeggook-import-sheet${tag}`);

  await page.getByText("판매가").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await shot(page, `domeggook-import-sheet-price${tag}`);

  await browser.close();
  console.log(`✅ 저장 위치: ${OUT}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
