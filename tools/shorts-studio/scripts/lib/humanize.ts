//////////////////////////////////////// 인간 페이싱 래퍼 ////////////////////////////////////////
// 플레이라이트 Page 위에 사람 속도의 조작 + 이벤트 로그(줌 포커스용)를 얹는다.
import type { Locator, Page } from "playwright";
import { CURSOR_INIT_SCRIPT } from "./cursor";

export type DemoEvent = {
  t: number; // 녹화 시작 기준 초
  type: "click" | "type" | "scroll" | "hold";
  x?: number; // 0~1 뷰포트 상대 좌표
  y?: number;
};

export class HumanPage {
  readonly events: DemoEvent[] = [];
  private t0 = 0;

  constructor(
    readonly page: Page,
    private viewport: { width: number; height: number },
  ) {}

  async start(url: string) {
    await this.page.addInitScript(CURSOR_INIT_SCRIPT);
    await this.page.goto(url, { waitUntil: "networkidle" });
    this.t0 = Date.now();
    await this.hold(0.8); // 첫 화면 인지 시간
  }

  now() {
    return (Date.now() - this.t0) / 1000;
  }

  private log(e: Omit<DemoEvent, "t">) {
    this.events.push({ t: this.now(), ...e });
  }

  ////////// 대기 (화면 머묾)
  async hold(sec: number) {
    await this.page.waitForTimeout(sec * 1000);
  }

  ////////// 커서 이동 + 클릭 (리플 포함, 포커스 로그)
  async humanClick(target: Locator, holdAfterSec = 0.8) {
    await target.scrollIntoViewIfNeeded();
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
