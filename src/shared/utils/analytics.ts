//////////////////////////////////////// 애널리틱스 이벤트 (GA4) ////////////////////////////////////////
// NSM·게이트 측정 장치 (SERVICE 4장): NSM = 주간 ZIP 다운로드.
// NEXT_PUBLIC_GA_ID 미설정 시 조용히 no-op — 로컬 개발에서 이벤트가 쌓이지 않는다.
//
// 이벤트 사전 (임의 추가 금지 — 여기 정의된 것만 사용):
// - zip_download { tool }      : ZIP 다운로드 완료 = NSM
// - handoff { from, to }       : 도구 간 이미지 전달 (여정 연결 지표)
// - domeggook_lookup { result, reason, license } : 도매꾹 상품 조회
//
// ── 원링크 퍼널 계측 (2026-07-27 추가, ROADMAP 계측 보강) ──────────────
// 배경: 이전에는 등록 정보 시트(1,427줄, 섹션 ①~⑫)에 이벤트가 0개라
//      "완주율 2.1%"가 실제 완주율이 아니라 *측정 가능한* 완주율이었다.
//      아래 4종이 진짜 퍼널을 만든다.
// - sheet_view                 : 등록 정보 시트 도달 (퍼널의 진짜 분모)
// - section_copy { section }   : 시트 섹션별 복사 = 실질 완주 신호
// - option_xlsx_download       : 옵션 일괄등록 양식 다운로드
// - image_edit_open { context }: 이미지 편집 모달 진입 = 파이프라인 실제 연결
//
// ── 유료 기능 계측 (2026-07-30 추가) ──────────────────────────────────
// - ai_thumbnail_generate { result, style, hasHeadline } : AI 썸네일 생성 시도
//   result = success | fail | no_credits — no_credits 비율이 높으면 크레딧 배분(가입 보너스 10개)이 잘못된 것
//
// 판정 방법 (배포 +7일):
//   1) sheet_view 대비 section_copy 비율 = 진짜 완주율
//   2) domeggook_lookup 의 reason/license 분포 = 진입 단계 최대 이탈 원인
//   3) image_edit_open 발생률 = 차별화 축(파이프라인)이 작동하는지

////////// 원링크 조회 실패 사유 — GA4에서 이탈 원인을 분해하기 위한 고정 코드
export type LookupFailReason =
  | 'url_parse' // 링크·상품번호 파싱 실패 (사용자 입력 문제)
  | 'not_found' // 도매꾹에 상품 없음 (404)
  | 'api_error' // 도매꾹 API·서버 오류 (5xx)
  | 'network' // 네트워크·기타
  | 'none'; // 성공

////////// 등록 정보 시트 섹션 — 라벨(한국어)이 바뀌어도 지표가 깨지지 않도록 슬러그 고정
export type SheetSection =
  | 'category'
  | 'name'
  | 'price'
  | 'stock'
  | 'option'
  | 'detail'
  | 'info'
  | 'delivery'
  | 'return'
  | 'tag'
  | 'code'
  | 'other';

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
