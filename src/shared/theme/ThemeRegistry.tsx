'use client';

//////////////////////////////////////// 테마 레지스트리 ////////////////////////////////////////
// App Router 환경에서 Emotion SSR 캐시 + MUI 테마 + 전역 토스트(notistack)를 주입한다.
// 루트 레이아웃(app/layout.tsx)에서 children을 이 컴포넌트로 감싼다.

import type { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import theme from './theme';

type ThemeRegistryProps = {
  children: ReactNode;
};

export default function ThemeRegistry({ children }: ThemeRegistryProps) {
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          {children}
        </SnackbarProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
