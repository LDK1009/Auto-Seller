//////////////////////////////////////// 루트 레이아웃 ////////////////////////////////////////
// 전역 Provider(테마·Emotion 캐시·토스트)를 ThemeRegistry로 주입한다.

import type { Metadata } from 'next';
import ThemeRegistry from '@/shared/theme/ThemeRegistry';
import AppHeader from '@/shared/components/AppHeader';
import { pretendard } from '@/shared/theme/pretendard';
import { APP_NAME, APP_DESCRIPTION } from '@/shared/constants/app';
import './globals.css';

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>
        <ThemeRegistry>
          <AppHeader />
          <main>{children}</main>
        </ThemeRegistry>
      </body>
    </html>
  );
}
