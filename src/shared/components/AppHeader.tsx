'use client';

//////////////////////////////////////// 공통 헤더 (GNB) ////////////////////////////////////////
// 모든 페이지 상단 고정. 로고(홈) + 도매매 가져오기 + 이미지 도구 드롭다운 + 계산기.

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
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { APP_NAME_EN } from '@/shared/constants/app';
import { TOOLS } from '@/shared/constants/tools';

const IMAGE_TOOLS = TOOLS.filter((tool) => tool.group === 'image');

export default function AppHeader() {
  // 이미지 도구 드롭다운 (순수 UI 상태)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  return (
    <HeaderBar>
      <Container maxWidth="lg">
        <Inner>
          {/* 로고 → 홈 (영문 표기 — BRAND 2장) */}
          <LogoLink href="/">
            <AutoFixHighIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {APP_NAME_EN}
            </Typography>
          </LogoLink>

          {/* 우측 네비 */}
          <Nav>
            <NavButton component={Link} href="/domeme-import">
              도매매 가져오기
            </NavButton>
            <NavButton
              endIcon={<KeyboardArrowDownIcon />}
              onClick={(event) => setMenuAnchor(event.currentTarget)}
            >
              이미지 도구
            </NavButton>
            <Menu
              anchorEl={menuAnchor}
              open={menuAnchor !== null}
              onClose={() => setMenuAnchor(null)}
            >
              {IMAGE_TOOLS.map((tool) => (
                <MenuItem
                  key={tool.href}
                  component={Link}
                  href={tool.href}
                  onClick={() => setMenuAnchor(null)}
                >
                  <ListItemText primary={tool.title} />
                </MenuItem>
              ))}
            </Menu>
            <NavButton component={Link} href="/margin-calculator">
              계산기
            </NavButton>
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
  gap: theme.spacing(1),
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
