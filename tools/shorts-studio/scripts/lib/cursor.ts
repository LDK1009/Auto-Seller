//////////////////////////////////////// 가짜 커서 주입 스크립트 ////////////////////////////////////////
// 페이지에 커서 오버레이 DOM을 심고, 부드러운 이동·클릭 리플을 제공.
// 실제 마우스 이벤트와 무관한 순수 시각 요소 — 녹화 화면용.
export const CURSOR_INIT_SCRIPT = `
(() => {
  if (window.__cursorReady) return;
  window.__cursorReady = true;

  const cursor = document.createElement('div');
  cursor.id = '__fake-cursor';
  Object.assign(cursor.style, {
    position: 'fixed', left: '50%', top: '40%', width: '28px', height: '28px',
    borderRadius: '50%', background: 'rgba(99,102,241,0.9)',
    border: '3px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
    zIndex: '2147483647', pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
    transition: 'left 0s, top 0s',
  });
  const attach = () => document.body && document.body.appendChild(cursor);
  document.body ? attach() : document.addEventListener('DOMContentLoaded', attach);

  // 부드러운 이동 (easeInOut) — duration ms 후 resolve
  window.__moveCursor = (x, y, duration) => new Promise((resolve) => {
    const startX = parseFloat(cursor.style.left);
    const startY = parseFloat(cursor.style.top);
    const isPct = cursor.style.left.includes('%');
    const from = isPct
      ? { x: window.innerWidth * startX / 100, y: window.innerHeight * startY / 100 }
      : { x: startX, y: startY };
    const t0 = performance.now();
    const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const e = ease(p);
      cursor.style.left = (from.x + (x - from.x) * e) + 'px';
      cursor.style.top = (from.y + (y - from.y) * e) + 'px';
      if (p < 1) requestAnimationFrame(step); else resolve(undefined);
    };
    requestAnimationFrame(step);
  });

  // 클릭 리플
  window.__clickRipple = (x, y) => {
    const r = document.createElement('div');
    Object.assign(r.style, {
      position: 'fixed', left: x + 'px', top: y + 'px', width: '14px', height: '14px',
      borderRadius: '50%', border: '3px solid rgba(99,102,241,0.9)',
      zIndex: '2147483646', pointerEvents: 'none',
      transform: 'translate(-50%, -50%)',
      animation: '__ripple 0.45s ease-out forwards',
    });
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 500);
  };

  const style = document.createElement('style');
  style.textContent = '@keyframes __ripple { to { width: 72px; height: 72px; opacity: 0; } }';
  document.head.appendChild(style);
})();
`;
