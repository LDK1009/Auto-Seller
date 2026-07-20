//////////////////////////////////////// 인간 페이싱 래퍼 ////////////////////////////////////////
// 플레이라이트 Page 위에 사람 속도의 조작 + 이벤트 로그(줌 포커스용)를 얹는다.
import type { Locator, Page } from "playwright";
import { CURSOR_INIT_SCRIPT } from "./cursor";

export type DemoEvent = {
  t: number; // 녹화 시작 기준 초
  type: "click" | "type" | "scroll" | "hold" | "focus"; // focus = 정차역 (강조 구간)
  x?: number; // 0~1 뷰포트 상대 좌표 (박스 중심)
  y?: number;
  w?: number; // 0~1 정차역 박스 크기 — 강조 테두리 링 사이즈용
  h?: number;
  holdSec?: number; // focus 머묾 시간
};

// 사람 느낌 지터 — 기계적 균일함 제거 (±15~30%)
const jitter = (sec: number) => sec * (0.85 + Math.random() * 0.45);

export class HumanPage {
  readonly events: DemoEvent[] = [];
  loadedSec = 0; // 페이지 로드 완료 시각 (녹화 기준) — 앞부분 로딩 공백 트림용
  private t0 = 0;

  constructor(
    readonly page: Page,
    private viewport: { width: number; height: number },
  ) {}

  ////////// 녹화 시작 시각 동기 — 비디오 타임라인 기준점 (페이지 생성 시각)
  markRecordStart(timestampMs: number) {
    this.t0 = timestampMs;
  }

  async start(url: string) {
    await this.page.addInitScript(CURSOR_INIT_SCRIPT);
    await this.page.goto(url, { waitUntil: "networkidle" });
    this.loadedSec = this.now();
    // 초기 화면 파악 버퍼 — 숏츠 초반 이탈 방지 위해 짧게 (훅 직후 바로 액션)
    await this.hold(1.3);
  }

  now() {
    return (Date.now() - this.t0) / 1000;
  }

  private log(e: Omit<DemoEvent, "t">) {
    this.events.push({ t: this.now(), ...e });
  }

  ////////// 대기 (화면 머묾) — 지터 적용
  async hold(sec: number) {
    await this.page.waitForTimeout(jitter(sec) * 1000);
  }

  ////////// 정차역 — 강조 대상으로 스크롤 → 머물며 보여주기 (통스크롤 금지 원칙)
  // 줌 포커스·자막 싱크의 기준점이 되는 핵심 문법
  async showSection(target: Locator, holdSec = 1.8) {
    // 순간이동 점프 금지 — 부드러운 스크롤로 이동 (녹화 화면 뚜둑 끊김 방지)
    await target.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
    await this.page.evaluate(() => (window as any).__dimCursor?.(true)); // 읽는 동안 커서 숨김 (라벨 가림 방지)
    await this.page.waitForTimeout(800); // 스무스 스크롤 완료 + 정착
    // 타겟(보통 섹션 라벨 텍스트)의 조상 중 섹션 카드(뷰포트 60% 이상 폭)를 찾아 그 박스를 강조 링 영역으로 사용
    const box = await target.evaluate((el) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let node: HTMLElement | null = el as HTMLElement;
      while (node) {
        const rect = node.getBoundingClientRect();
        // 섹션 카드 판정: 폭 60% 이상 + 높이 7% 이상 (라벨 행 래퍼는 높이 미달로 스킵)
        if (rect.width >= viewportWidth * 0.6 && rect.height >= viewportHeight * 0.07) {
          return { x: rect.x, y: rect.y, width: rect.width, height: Math.min(rect.height, viewportHeight * 0.45) };
        }
        node = node.parentElement;
      }
      const rect = (el as HTMLElement).getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    if (box) {
      this.events.push({
        t: this.now(),
        type: "focus",
        x: (box.x + box.width / 2) / this.viewport.width,
        y: (box.y + box.height / 2) / this.viewport.height,
        w: box.width / this.viewport.width,
        h: box.height / this.viewport.height,
        holdSec,
      });
    }
    await this.hold(holdSec);
  }

  ////////// 커서 이동 + 클릭 (리플 포함, 포커스 로그)
  async humanClick(target: Locator, holdAfterSec = 0.8) {
    // 화면 밖일 때만 부드럽게 스크롤 (nearest = 보이면 이동 없음)
    await target.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    await this.page.waitForTimeout(400);
    await this.page.evaluate(() => (window as any).__dimCursor?.(false)); // 조작 재개 — 커서 복원
    const box = await target.boundingBox();
    if (!box) throw new Error("클릭 대상 boundingBox 없음");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await this.page.evaluate(
      ([x, y]) => (window as any).__moveCursor(x, y, 550),
      [cx, cy] as const,
    );
    await this.page.evaluate(
      ([x, y]) => (window as any).__clickRipple(x, y),
      [cx, cy] as const,
    );
    this.log({ type: "click", x: cx / this.viewport.width, y: cy / this.viewport.height });
    await target.click();
    await this.hold(holdAfterSec);
  }

  ////////// 글자 단위 타이핑
  async humanType(target: Locator, text: string) {
    await this.humanClick(target, 0.2);
    await target.pressSequentially(text, { delay: 70 });
    this.log({ type: "type" });
    await this.hold(0.4);
  }

  ////////// 스무스 스크롤 (요소 끝까지 천천히)
  async smoothScrollBy(px: number, durationSec = 2) {
    this.log({ type: "scroll" });
    const steps = Math.round(durationSec * 30);
    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, px / steps);
      await this.page.waitForTimeout((durationSec * 1000) / steps);
    }
  }

  ////////// 등장 대기 (실측 — 대기 시간도 실시간에 포함됨)
  async waitVisible(locator: Locator, timeoutMs = 30000) {
    await locator.waitFor({ state: "visible", timeout: timeoutMs });
    await this.hold(0.5);
  }
}
