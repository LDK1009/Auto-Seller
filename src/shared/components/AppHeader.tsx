'use client';

//////////////////////////////////////// 공통 헤더 (GNB) ////////////////////////////////////////
// 랜딩: 로고 + "작업 공간" 진입 버튼 하나 (기능 네비는 작업 공간 사이드바가 담당 — 마케팅/제품 분리).
// 작업 공간(도구 페이지): 데스크톱은 사이드바가 네비를 담당하므로 로고만, 모바일은 Drawer 토글.
// Drawer에 disableScrollLock — body 스크롤 잠금으로 레이아웃이 흔들리는 MUI 기본 동작 방지.

import { useState } from 'react';
import styled from '@emotion/styled';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import MenuIcon from '@mui/icons-material/Menu';
import { APP_NAME_EN } from '@/shared/constants/app';
import { TOOLS, FLAGSHIP_TOOL } from '@/shared/constants/tools';
import { HEADER_HEIGHT } from '@/shared/constants/layout';
import { SidebarNav } from '@/shared/components/AppSidebar';
import AuthMenu from '@/shared/components/AuthMenu';

export default function AppHeader() {
  const pathname = usePathname();
  const isWorkspace = [FLAGSHIP_TOOL.href, ...TOOLS.map((tool) => tool.href)].some((href) =>
    pathname.startsWith(href),
  );

  // 모바일 Drawer 열림 (순수 UI 상태)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <HeaderBar>
      <Container maxWidth={false}>
        <Inner>
          <LeftSlot>
            {/* 작업 공간 모바일: 사이드바 Drawer 토글 */}
            {isWorkspace && (
              <MobileMenuButton aria-label="메뉴 열기" onClick={() => setIsDrawerOpen(true)}>
                <MenuIcon />
              </MobileMenuButton>
            )}
            {/* 로고 → 홈 (텍스트만) */}
            <LogoLink href="/">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {APP_NAME_EN}
              </Typography>
            </LogoLink>
          </LeftSlot>

          <RightSlot>
            <AuthMenu />
            {/* 랜딩 전용: 도구 진입 버튼 하나 */}
            {!isWorkspace && (
              <Button component={Link} href={FLAGSHIP_TOOL.href} variant="contained" size="small">
                워크스페이스
              </Button>
            )}
          </RightSlot>
        </Inner>
      </Container>

      {/* 작업 공간 모바일 사이드바 Drawer */}
      <Drawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        disableScrollLock
        slotProps={{ paper: { sx: { width: 260 } } }}
      >
        <SidebarNav onNavigate={() => setIsDrawerOpen(false)} />
      </Drawer>
    </HeaderBar>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
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

const LeftSlot = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const RightSlot = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const MobileMenuButton = styled(IconButton)(({ theme }) => ({
  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
}));

const LogoLink = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  color: theme.palette.text.primary,
  textDecoration: 'none',
}));
