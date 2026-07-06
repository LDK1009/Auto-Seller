'use client';

//////////////////////////////////////// 공통 헤더 (GNB) ////////////////////////////////////////
// 모든 페이지 상단 고정. 메뉴 배치 = 셀러 작업 플로우 순서 (① 소싱 → ② 이미지 가공).
// Menu에 disableScrollLock — 열릴 때 body 스크롤 잠금으로 스크롤바가 사라지며 레이아웃이 흔들리는 MUI 기본 동작 방지.

import { useState } from 'react';
import styled from '@emotion/styled';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { APP_NAME_EN } from '@/shared/constants/app';
import { TOOLS, TOOL_GROUPS, type ToolGroupKey } from '@/shared/constants/tools';

export default function AppHeader() {
  // 열려 있는 그룹 메뉴 (순수 UI 상태)
  const [openGroup, setOpenGroup] = useState<ToolGroupKey | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const closeMenu = () => {
    setOpenGroup(null);
    setMenuAnchor(null);
  };

  return (
    <HeaderBar>
      <Container maxWidth="lg">
        <Inner>
          {/* 로고 → 홈 (텍스트만 — 아이콘 없음) */}
          <LogoLink href="/">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {APP_NAME_EN}
            </Typography>
          </LogoLink>

          {/* 작업 플로우 순서 네비 */}
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
