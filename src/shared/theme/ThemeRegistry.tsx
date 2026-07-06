'use client';

//////////////////////////////////////// 테마 레지스트리 ////////////////////////////////////////
// App Router 환경에서 Emotion SSR 캐시 + MUI 테마 + 전역 토스트(notistack)를 주입한다.
// 루트 레이아웃(app/layout.tsx)에서 children을 이 컴포넌트로 감싼다.
// 개발 모드에서는 브랜드 톤 A/B 토글(L-3 결정용)을 함께 렌더한다.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { createAppTheme, DEFAULT_PRIMARY_VARIANT, PRIMARY_VARIANTS, type PrimaryVariantKey } from './theme';
import ThemeVariantToggle from './ThemeVariantToggle';

const VARIANT_STORAGE_KEY = 'auto-seller-theme-variant';
const isDevelopment = process.env.NODE_ENV === 'development';

type ThemeRegistryProps = {
  children: ReactNode;
};

export default function ThemeRegistry({ children }: ThemeRegistryProps) {
  const [variant, setVariant] = useState<PrimaryVariantKey>(DEFAULT_PRIMARY_VARIANT);

  // 개발 모드에서 저장된 선택 복원 (프로덕션은 항상 기본안)
  useEffect(() => {
    if (!isDevelopment) return;
    const stored = window.localStorage.getItem(VARIANT_STORAGE_KEY);
    if (stored && stored in PRIMARY_VARIANTS) {
      setVariant(stored as PrimaryVariantKey);
    }
  }, []);

  const handleVariantChange = (next: PrimaryVariantKey) => {
    setVariant(next);
    window.localStorage.setItem(VARIANT_STORAGE_KEY, next);
  };

  const theme = useMemo(() => createAppTheme(variant), [variant]);

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
        {isDevelopment && <ThemeVariantToggle variant={variant} onChange={handleVariantChange} />}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
