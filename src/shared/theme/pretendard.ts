//////////////////////////////////////// Pretendard 폰트 로드 ////////////////////////////////////////
// next/font/local로 변수 폰트(100~900)를 self-host 로드한다.
// CSS 변수(--font-pretendard)로 노출해 MUI 테마 fontFamily에서 참조한다.

import localFont from 'next/font/local';

export const pretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '100 900', // 변수 폰트 굵기 범위
  variable: '--font-pretendard',
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'Roboto',
    'Malgun Gothic',
    'Apple SD Gothic Neo',
    'sans-serif',
  ],
});
