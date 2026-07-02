'use client';

//////////////////////////////////////// 공통 헤더 (GNB) ////////////////////////////////////////
// 모든 페이지 상단 고정. 로고(홈 이동) + 우측 확장 자리(향후 메뉴·로그인).

import styled from '@emotion/styled';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { APP_NAME } from '@/shared/constants/app';

export default function AppHeader() {
  return (
    <HeaderBar>
      <Container maxWidth="lg">
        <Inner>
          {/* 로고 → 홈 */}
          <LogoLink href="/">
            <AutoFixHighIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {APP_NAME}
            </Typography>
          </LogoLink>

          {/* 우측 자리 (향후 네비·로그인) */}
          <RightSlot />
        </Inner>
      </Container>
    </HeaderBar>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
export const HEADER_HEIGHT = 64;

const HeaderBar = styled.header(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: theme.zIndex.appBar,
  backgroundColor: theme.palette.background.default,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const Inner = styled.div({
  height: HEADER_HEIGHT,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

const LogoLink = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: theme.palette.text.primary,
}));

const RightSlot = styled.div({
  display: 'flex',
  alignItems: 'center',
});
