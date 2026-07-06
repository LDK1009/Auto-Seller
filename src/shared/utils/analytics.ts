//////////////////////////////////////// 애널리틱스 이벤트 (GA4) ////////////////////////////////////////
// NSM·게이트 측정 장치 (SERVICE 4장): NSM = 주간 ZIP 다운로드.
// NEXT_PUBLIC_GA_ID 미설정 시 조용히 no-op — 로컬 개발에서 이벤트가 쌓이지 않는다.
//
// 이벤트 사전 (임의 추가 금지 — 여기 정의된 것만 사용):
// - zip_download { tool }      : ZIP 다운로드 완료 = NSM
// - handoff { from, to }       : 도구 간 이미지 전달 (여정 연결 지표)
// - domeme_lookup { result }   : 도매매 상품 조회 (성공/실패)

type AnalyticsParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, params?: AnalyticsParams) => void;
  }
}

export function trackEvent(eventName: string, params?: AnalyticsParams) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}
