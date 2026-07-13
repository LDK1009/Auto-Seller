'use client';

//////////////////////////////////////// 도움말 패널 (공통) ////////////////////////////////////////
// 컨텐츠 상단에 놓는 접이식 사용 안내. 기본 접힘, 사용자가 펼치면 그 상태를
// localStorage에 기억한다 (storageKey 단위).

import { useEffect, useState, type ReactNode } from 'react';
import styled from '@emotion/styled';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const STORAGE_PREFIX = 'auto-seller:help-panel:';

type HelpPanelProps = {
  storageKey: string; // 페이지별 기억 키 (예: 'background-removal')
  title?: string;
  children: ReactNode;
};

export default function HelpPanel({ storageKey, title = '사용 방법', children }: HelpPanelProps) {
  // SSR 마크업 일치를 위해 접힘으로 시작 → 마운트 후 저장값/첫방문 여부 반영
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    setIsOpen(saved === 'open'); // 기본 접힘 — 사용자가 펼쳤던 페이지만 펼침 유지
  }, [storageKey]);

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, next ? 'open' : 'closed');
      return next;
    });
  };

  return (
    <Panel>
      <Header type="button" onClick={handleToggle} aria-expanded={isOpen}>
        <HelpOutlinedIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ flex: 1, textAlign: 'left' }}>
          {title}
        </Typography>
        <ArrowWrap $isOpen={isOpen}>
          <ExpandMoreIcon fontSize="small" />
        </ArrowWrap>
      </Header>
      <Collapse in={isOpen}>
        <Body>{children}</Body>
      </Collapse>
    </Panel>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Panel = styled.div(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  overflow: 'hidden',
}));

const Header = styled.button(({ theme }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.25, 2),
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  color: theme.palette.text.primary,
}));

const ArrowWrap = styled.span<{ $isOpen: boolean }>(({ theme, $isOpen }) => ({
  display: 'inline-flex',
  color: theme.palette.text.secondary,
  transform: $isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: 'transform 0.2s ease',
}));

const Body = styled.div(({ theme }) => ({
  padding: theme.spacing(0, 2, 2),
}));
