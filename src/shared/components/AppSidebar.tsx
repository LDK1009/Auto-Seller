'use client';

//////////////////////////////////////// 작업 공간 사이드바 ////////////////////////////////////////
// 셀러 작업 플로우 순서(소싱 → 등록 준비 → 등록 → 운영·정산) 좌측 네비.
// - 데스크톱: 접기(레일) 모드 지원 — 아이콘만 남기고 폭 축소, localStorage로 상태 유지
// - 그룹 단위 접기 지원 (라벨 클릭)
// - 준비 중 기능(원클릭 등록)도 클릭 허용 — 스낵바로 상태 안내 (죽은 버튼 없애기)

import { cloneElement, isValidElement, useEffect, useState, type ReactElement } from 'react';
import styled from '@emotion/styled';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSnackbar } from 'notistack';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';
import StorefrontIcon from '@mui/icons-material/Storefront';
import BoltIcon from '@mui/icons-material/Bolt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import { TOOLS, TOOL_GROUPS, FLAGSHIP_TOOL } from '@/shared/constants/tools';
import { HEADER_HEIGHT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED } from '@/shared/constants/layout';
import { transientOptions } from '@/shared/utils/emotionTransientProps';

const COLLAPSE_STORAGE_KEY = 'sidebar-collapsed';
const UPCOMING_MESSAGE = '원클릭 등록은 준비 중이에요. 완성되면 여기서 열려요.';

////////// 도구 아이콘을 사이드바 크기로 (tools.tsx의 large 아이콘 재사용)
function toNavIcon(icon: unknown, isActive: boolean) {
  if (!isValidElement(icon)) return null;
  return cloneElement(icon as ReactElement<{ fontSize?: string; color?: string }>, {
    fontSize: 'small',
    color: isActive ? 'primary' : 'action',
  });
}

//////////////////// 네비 내용 (데스크톱 사이드바·모바일 Drawer 공용) ////////////////////
type SidebarNavProps = {
  onNavigate?: () => void; // 모바일 Drawer 닫기용
  isCollapsed?: boolean; // 레일 모드 (데스크톱 전용)
};

export function SidebarNav({ onNavigate, isCollapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const { enqueueSnackbar } = useSnackbar();

  // 그룹 접기 상태 (기본 전부 펼침)
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) => {
    setClosedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleUpcomingClick = () => enqueueSnackbar(UPCOMING_MESSAGE, { variant: 'info' });

  ////////// 레일 모드: 아이콘만 세로 나열 (툴팁으로 이름)
  if (isCollapsed) {
    return (
      <Stack spacing={0.75} sx={{ p: 1, alignItems: 'center', width: SIDEBAR_WIDTH_COLLAPSED }}>
        <Tooltip title={`${FLAGSHIP_TOOL.title} — ${FLAGSHIP_TOOL.description}`} placement="right">
          <RailFlagship href={FLAGSHIP_TOOL.href} $isActive={pathname === FLAGSHIP_TOOL.href} onClick={onNavigate}>
            <BoltIcon fontSize="small" />
          </RailFlagship>
        </Tooltip>
        {TOOL_GROUPS.map((group) => (
          <Stack key={group.key} spacing={0.75} sx={{ alignItems: 'center' }}>
            <RailDivider />
            {TOOLS.filter((tool) => tool.group === group.key).map((tool) => (
              <Tooltip key={tool.href} title={tool.title} placement="right">
                <RailItem href={tool.href} $isActive={pathname === tool.href} onClick={onNavigate}>
                  {toNavIcon(tool.icon, pathname === tool.href)}
                </RailItem>
              </Tooltip>
            ))}
          </Stack>
        ))}
        <RailDivider />
        <Tooltip title="원클릭 등록 (준비 중)" placement="right">
          <RailUpcoming onClick={handleUpcomingClick}>
            <StorefrontIcon fontSize="small" color="disabled" />
          </RailUpcoming>
        </Tooltip>
      </Stack>
    );
  }

  ////////// 기본(펼침) 모드
  return (
    <Stack spacing={3} sx={{ p: 2, width: SIDEBAR_WIDTH }}>
      {/* 플래그십: 원링크 — 주 사용 동선, 최상단 고정 (미선택 시 흰 배경으로 도드라지게) */}
      <FlagshipItem
        href={FLAGSHIP_TOOL.href}
        $isActive={pathname === FLAGSHIP_TOOL.href}
        onClick={onNavigate}
      >
        <BoltIcon fontSize="small" />
        <Stack spacing={0}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {FLAGSHIP_TOOL.title}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            {FLAGSHIP_TOOL.description}
          </Typography>
        </Stack>
      </FlagshipItem>

      {TOOL_GROUPS.map((group) => {
        const isOpen = !closedGroups.has(group.key);
        return (
          <Stack key={group.key} spacing={0.5}>
            {/* 그룹 라벨 = 접기 토글 */}
            <GroupToggle onClick={() => toggleGroup(group.key)} aria-expanded={isOpen}>
              <GroupLabel variant="body2">{group.label}</GroupLabel>
              <GroupChevron $isOpen={isOpen} fontSize="small" />
            </GroupToggle>
            <Collapse in={isOpen}>
              <IndentedList spacing={0.5}>
                {TOOLS.filter((tool) => tool.group === group.key).map((tool) => (
                  <NavItem
                    key={tool.href}
                    href={tool.href}
                    $isActive={pathname === tool.href}
                    onClick={onNavigate}
                  >
                    {toNavIcon(tool.icon, pathname === tool.href)}
                    <Typography variant="body2" sx={{ fontWeight: pathname === tool.href ? 700 : 500 }}>
                      {tool.title}
                    </Typography>
                  </NavItem>
                ))}
              </IndentedList>
            </Collapse>
          </Stack>
        );
      })}

      {/* 등록 — 준비 중 (클릭하면 상태 안내) */}
      <Stack spacing={0.5}>
        <GroupToggle onClick={() => toggleGroup('register')} aria-expanded={!closedGroups.has('register')}>
          <GroupLabel variant="body2">등록</GroupLabel>
          <GroupChevron $isOpen={!closedGroups.has('register')} fontSize="small" />
        </GroupToggle>
        <Collapse in={!closedGroups.has('register')}>
          <IndentedList spacing={0.5}>
          <UpcomingItem onClick={handleUpcomingClick}>
            <StorefrontIcon fontSize="small" color="disabled" />
            <Typography variant="body2" color="text.disabled" sx={{ flex: 1, textAlign: 'left' }}>
              원클릭 등록
            </Typography>
            <Chip size="small" label="준비 중" />
          </UpcomingItem>
          </IndentedList>
        </Collapse>
      </Stack>
    </Stack>
  );
}

//////////////////// 데스크톱 사이드바 (md 미만 숨김 — 모바일은 헤더 Drawer) ////////////////////
export default function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 접힘 상태 복원 (localStorage — 하이드레이션 후)
  useEffect(() => {
    setIsCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // 저장 실패 무시
      }
      return next;
    });
  };

  return (
    <SidebarBox $isCollapsed={isCollapsed}>
      <SidebarSticky>
      <CollapseToggleRow $isCollapsed={isCollapsed}>
        <Tooltip title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'} placement="right">
          <IconButton size="small" onClick={toggleCollapsed} aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}>
            {isCollapsed ? <KeyboardDoubleArrowRightIcon fontSize="small" /> : <KeyboardDoubleArrowLeftIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </CollapseToggleRow>
      <SidebarNav isCollapsed={isCollapsed} />
      </SidebarSticky>
    </SidebarBox>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
// 바깥: 콘텐츠 전체 높이를 따라 늘어남 (보더·배경이 페이지 끝까지) — sticky는 안쪽 래퍼만
const SidebarBox = styled('aside', transientOptions)<{ $isCollapsed: boolean }>(({ theme, $isCollapsed }) => ({
  width: $isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
  flexShrink: 0,
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  transition: 'width 0.2s ease',
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}));

// 안쪽: 뷰포트에 붙어 따라오는 네비 — 네비가 화면보다 길 때만 자체 스크롤
const SidebarSticky = styled.div({
  position: 'sticky',
  top: HEADER_HEIGHT,
  maxHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
  overflowY: 'auto',
  overflowX: 'hidden',
});

const CollapseToggleRow = styled('div', transientOptions)<{ $isCollapsed: boolean }>(({ theme, $isCollapsed }) => ({
  display: 'flex',
  justifyContent: $isCollapsed ? 'center' : 'flex-end',
  padding: theme.spacing(1, 1, 0),
}));

const GroupToggle = styled(ButtonBase)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: theme.spacing(0.25, 1.5),
  borderRadius: theme.shape.borderRadius,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const GroupLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary, // 그룹 = 제목 위계 (아이템보다 진하게)
  fontWeight: 700,
}));

const GroupChevron = styled(ExpandMoreIcon, transientOptions)<{ $isOpen: boolean }>(({ theme, $isOpen }) => ({
  color: theme.palette.text.secondary,
  transform: $isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
  transition: 'transform 0.15s',
}));

// 플래그십 슬롯: 인디고 강조 (활성 시 채움, 평시 흰 배경 — 회색 사이드바 위에서 도드라지게)
const FlagshipItem = styled(Link, transientOptions)<{ $isActive: boolean }>(({ theme, $isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.25),
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  textDecoration: 'none',
  color: $isActive ? theme.palette.primary.contrastText : theme.palette.primary.main,
  backgroundColor: $isActive ? theme.palette.primary.main : theme.palette.background.paper,
  border: `1px solid ${$isActive ? theme.palette.primary.main : theme.palette.divider}`,
  boxShadow: $isActive ? 'none' : theme.shadows[1],
  transition: 'background-color 0.15s',
  '&:hover': {
    backgroundColor: $isActive ? theme.palette.primary.dark : theme.palette.action.hover,
  },
}));

// 하위 메뉴 들여쓰기 + 수직 가이드 선 (그룹 소속 관계 명시 — 1px 연회색으로 절제)
const IndentedList = styled(Stack)(({ theme }) => ({
  marginLeft: theme.spacing(1.75),
  paddingLeft: theme.spacing(1),
  borderLeft: `1px solid ${theme.palette.divider}`,
}));

const NavItem = styled(Link, transientOptions)<{ $isActive: boolean }>(({ theme, $isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.25),
  padding: theme.spacing(1, 1.5),
  borderRadius: theme.shape.borderRadius,
  textDecoration: 'none',
  color: $isActive ? theme.palette.primary.main : theme.palette.text.primary,
  backgroundColor: $isActive ? theme.palette.action.selected : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

// 준비 중 항목 — 클릭 가능 (죽은 버튼 금지, 클릭 시 상태 안내)
const UpcomingItem = styled(ButtonBase)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  width: '100%',
  padding: theme.spacing(1, 1.5),
  borderRadius: theme.shape.borderRadius,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

//////////////////// 레일(접힘) 모드 ////////////////////
const railItemBase = (theme: any) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: theme.shape.borderRadius,
});

const RailFlagship = styled(Link, transientOptions)<{ $isActive: boolean }>(({ theme, $isActive }) => ({
  ...railItemBase(theme),
  color: $isActive ? theme.palette.primary.contrastText : theme.palette.primary.main,
  backgroundColor: $isActive ? theme.palette.primary.main : theme.palette.background.paper,
  border: `1px solid ${$isActive ? theme.palette.primary.main : theme.palette.divider}`,
  '&:hover': {
    backgroundColor: $isActive ? theme.palette.primary.dark : theme.palette.action.hover,
  },
}));

const RailItem = styled(Link, transientOptions)<{ $isActive: boolean }>(({ theme, $isActive }) => ({
  ...railItemBase(theme),
  backgroundColor: $isActive ? theme.palette.action.selected : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const RailUpcoming = styled(ButtonBase)(({ theme }) => ({
  ...railItemBase(theme),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const RailDivider = styled.div(({ theme }) => ({
  width: 24,
  height: 1,
  backgroundColor: theme.palette.divider,
  margin: theme.spacing(0.5, 0),
}));
