//////////////////////////////////////// 전역 상수 ////////////////////////////////////////
// 브랜드 문구는 docs/기획/PLAN.md 10장(브랜드)이 기준 — 수정 시 반드시 PLAN.md와 동기화할 것.

// 표기 규칙 (PLAN 10.2): 국문 본문·UI = 오토셀러 / 영문·로고 = Auto Seller
export const APP_NAME = '오토셀러';
export const APP_NAME_EN = 'Auto Seller';

// 서브카피 기본형 (PLAN 10.3) — 지금 제공하는 것만 사실대로
export const APP_DESCRIPTION = '도매꾹 링크 하나로 — 이미지 편집부터 등록 정보까지.';

// 배포 도메인 (SEO — metadataBase·sitemap·robots 공용)
export const SITE_URL = 'https://www.auto-seller.co.kr';

// 슬로건 (BRAND 3장 확정) — 6·6·6 음절 3행 운율, 공식 노출은 3행 줄바꿈 그대로
export const SLOGAN_LINES = ['온라인셀러를', '반복작업에서', '해방시킵니다'] as const;
