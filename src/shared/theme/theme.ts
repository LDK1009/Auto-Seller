//////////////////////////////////////// MUI 중앙 테마 ////////////////////////////////////////
// 디자인 토큰(색상·타이포·간격·모양)을 이 파일에서 중앙 관리한다.
// 컴포넌트에서 sx/인라인으로 값을 하드코딩하지 말고 테마 토큰을 사용할 것.
//
// 토큰 출처: docs/design/toss-skin-tokens.css (Toss 스킨)를 MUI로 번역 — BRAND.md 7장.
// 브랜드 컬러는 인디고 유지 (Toss 퍼플 ❌). 가져온 것: 텍스트 위계·서피스·그림자·상태색·라운드 체계.

import { createTheme, type Theme } from '@mui/material/styles';

//////////////////// 브랜드 컬러 (2026-07-06 대표 확정 — 소프트 인디고) ////////////////////
// A/B 실화면 비교 후 B안 확정. 조용한 서피스와 온도를 맞춘 밝은 인디고.
const PRIMARY_MAIN = '#6366F1';

//////////////////// Toss 그림자 스케일 (toss-skin-tokens.css) ////////////////////
const SHADOW_CARD = '0 1px 3px rgba(0,0,0,0.04)';
const SHADOW_BUTTON = '0 1px 3px rgba(0,0,0,0.06)';
const SHADOW_CARD_HOVER = '0 2px 4px rgba(0,0,0,0.08)';
const SHADOW_ELEVATED = '0 4px 12px rgba(0,0,0,0.08)';
const SHADOW_MODAL = '0 8px 24px rgba(0,0,0,0.12)';

////////// MUI 25단계 그림자에 Toss 5단계를 이식 (그 외 단계는 근접 값으로 수렴)
function buildShadows(): Theme['shadows'] {
  const shadows = Array.from({ length: 25 }, () => SHADOW_ELEVATED) as unknown as Theme['shadows'];
  shadows[0] = 'none';
  shadows[1] = SHADOW_CARD;
  shadows[2] = SHADOW_BUTTON;
  shadows[3] = SHADOW_CARD_HOVER;
  shadows[4] = SHADOW_ELEVATED;
  for (let level = 8; level < 25; level += 1) shadows[level] = SHADOW_MODAL;
  return shadows;
}

//////////////////// 테마 ////////////////////
function createAppTheme() {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: PRIMARY_MAIN, // 인디고 — 플랫폼 중립·신뢰·자동화
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#06B6D4', // 시안 액센트
      },
      // Toss 서피스 체계: 은은한 회색 페이지 위에 흰 카드 (기존의 역전)
      background: {
        default: '#FCFCFC', // 페이지 배경 (시험: 반 단계 옅게 — 원복 #FAFAFA)
        paper: '#FFFFFF', // 카드·모달
      },
      // Toss 텍스트 3위계
      text: {
        primary: '#3C3C3C',
        secondary: '#6A6A6A',
        disabled: '#9B9B9B',
      },
      divider: 'rgba(0, 0, 0, 0.1)',
      // Toss 상태색 (차분한 톤)
      success: { main: '#6B9B7A' },
      warning: { main: '#D97706' },
      error: { main: '#D4183D' },
      info: { main: '#3B82F6' },
    },

    //////////////////// 타이포그래피 ////////////////////
    typography: {
      // next/font/local이 주입하는 CSS 변수(--font-pretendard) 사용, 그 뒤 시스템 폴백
      fontFamily: [
        'var(--font-pretendard)',
        '-apple-system',
        'BlinkMacSystemFont',
        'system-ui',
        'Roboto',
        '"Malgun Gothic"',
        '"Apple SD Gothic Neo"',
        '"Noto Sans KR"',
        'sans-serif',
      ].join(','),
      // 타이포 위계: 제목은 크고 무겁게, 부가정보는 작고 연하게 (BRAND 7장 원칙 2)
      h3: { fontWeight: 800, letterSpacing: '-0.02em' },
      h4: { fontWeight: 800, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 600 },
    },

    //////////////////// 모양 (Toss radius 0.625rem) ////////////////////
    shape: {
      borderRadius: 10,
    },

    //////////////////// 그림자 ////////////////////
    shadows: buildShadows(),

    //////////////////// 컴포넌트 기본값 override ////////////////////
    components: {
      // 숫자는 고정폭(tabular)으로 — 금액·수치 정렬 (Toss 규칙)
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontVariantNumeric: 'tabular-nums',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
          // 버튼 높이 전반 상향
          sizeSmall: { minHeight: 36 },
          sizeMedium: { minHeight: 46 },
          sizeLarge: { minHeight: 54 },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
        },
      },
      // 카드: 얇은 보더 + 흰 서피스 (그림자 최소화 원칙)
      MuiPaper: {
        styleOverrides: {
          outlined: {
            borderColor: 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },
    },
  });
}

const theme = createAppTheme();
export default theme;
