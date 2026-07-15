//////////////////////////////////////// 루트 레이아웃 ////////////////////////////////////////
// 전역 Provider(테마·Emotion 캐시·토스트)를 ThemeRegistry로 주입한다.

import type { Metadata } from 'next';
import ThemeRegistry from '@/shared/theme/ThemeRegistry';
import AppHeader from '@/shared/components/AppHeader';
import AnalyticsScripts from '@/shared/components/AnalyticsScripts';
import { pretendard } from '@/shared/theme/pretendard';
import { APP_NAME, APP_DESCRIPTION, SITE_URL } from '@/shared/constants/app';
import './globals.css';

const PAGE_TITLE = `${APP_NAME} — 온라인셀러를 반복작업에서 해방시킵니다`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: PAGE_TITLE,
    template: `%s | ${APP_NAME}`, // 도구 페이지: "원링크 … | 오토셀러"
  },
  description: APP_DESCRIPTION,
  alternates: { canonical: '/' }, // 랜딩 기준 — 도구 페이지는 각 page.tsx에서 자기 경로로 재정의
  openGraph: {
    title: PAGE_TITLE,
    description: APP_DESCRIPTION,
    type: 'website',
    locale: 'ko_KR',
    siteName: APP_NAME,
    url: './',
    images: [{ url: '/og.png', width: 1424, height: 752, alt: PAGE_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: APP_DESCRIPTION,
    images: ['/og.png'],
  },
  verification: {
    other: { 'naver-site-verification': 'ec4bcee10a8c377ecad7f3ff45fc3123acaf72e7' },
  },
};

// 구조화 데이터 — 사이트 단위 (검색엔진용, 화면 미노출)
const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: APP_NAME,
  alternateName: 'Auto Seller',
  url: SITE_URL,
  description: APP_DESCRIPTION,
  inLanguage: 'ko',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
        />
        <AnalyticsScripts />
        <ThemeRegistry>
          <AppHeader />
          <main>{children}</main>
        </ThemeRegistry>
      </body>
    </html>
  );
}
