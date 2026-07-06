'use client';

//////////////////////////////////////// 공통 헤더 (GNB) ////////////////////////////////////////
// 랜딩: 플로우 순 드롭다운 메뉴 (① 소싱 → ② 이미지 준비).
// 작업 공간(도구 페이지): 데스크톱은 사이드바가 네비를 담당하므로 로고만, 모바일은 Drawer 토글.
// Menu/Drawer에 disableScrollLock — body 스크롤 잠금으로 레이아웃이 흔들리는 MUI 기본 동작 방지.

import { useState } from 'react';
import styled from '@emotion/styled';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuIcon from '@mui/icons-material/Menu';
import { APP_NAME_EN } from '@/shared/constants/app';
import { TOOLS, TOOL_GROUPS, type ToolGroupKey } from '@/shared/constants/tools';
import { HEADER_HEIGHT } from '@/shared/constants/layout';
import { SidebarNav } from '@/shared/components/AppSidebar';

export default function AppHeader() {
  const pathname = usePathname();
  const isWorkspace = TOOLS.some((tool) => pathname.startsWith(tool.href));

  // 드롭다운·Drawer 열림 (순수 UI 상태)
  const [openGroup, setOpenGroup] = useState<ToolGroupKey | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const closeMenu = () => {
    setOpenGroup(null);
    setMenuAnchor(null);
  };

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

          {/* 랜딩 전용: 플로우 순 드롭다운 네비 */}
          {!isWorkspace && (
            <Nav>
              {TOOL_GROUPS.map((group) => (
                <NavButton
                  key={group.key}
                  endIcon={<KeyboardArrowDownIcon />}
                  onClick={(event) => {
                    setOpenGroup(group.key);
                    setMenuAnchor(event.currentTarget);
                  }}
                >
                  {group.step}. {group.label}
                </NavButton>
              ))}
              <Menu
                anchorEl={menuAnchor}
                open={openGroup !== null}
                onClose={closeMenu}
                disableScrollLock
              >
                {TOOLS.filter((tool) => tool.group === openGroup).map((tool) => (
                  <MenuItem key={tool.href} component={Link} href={tool.href} onClick={closeMenu}>
                    <ListItemText primary={tool.title} />
                  </MenuItem>
                ))}
              </Menu>
            </Nav>
          )}
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

const Nav = styled.nav(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

const NavButton = styled(Button)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 600,
  minHeight: 40,
})) as typeof Button;
