'use client';

//////////////////////////////////////// 작업 공간 사이드바 ////////////////////////////////////////
// 셀러 작업 플로우 순서(1 소싱 → 2 이미지 준비 → 3 등록)를 항상 펼쳐 보여주는 좌측 네비.
// IA 패턴만 차용 — 비주얼은 우리 것(토스식 서피스·인디고), 게이미피케이션류는 두지 않는다 (BRAND 7장).

import styled from '@emotion/styled';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import StorefrontIcon from '@mui/icons-material/Storefront';
import BoltIcon from '@mui/icons-material/Bolt';
import { TOOLS, TOOL_GROUPS, FLAGSHIP_TOOL } from '@/shared/constants/tools';
import { HEADER_HEIGHT, SIDEBAR_WIDTH } from '@/shared/constants/layout';
import { transientOptions } from '@/shared/utils/emotionTransientProps';

//////////////////// 네비 내용 (데스크톱 사이드바·모바일 Drawer 공용) ////////////////////
type SidebarNavProps = {
  onNavigate?: () => void; // 모바일 Drawer 닫기용
};

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      {/* 플래그십: 원링크 — 주 사용 동선, 최상단 고정 */}
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

      {TOOL_GROUPS.map((group) => (
        <Stack key={group.key} spacing={0.5}>
          {/* 번호 없이 라벨만 — 순서가 이미 흐름을 말해줌 (번호는 랜딩 여정 전용) */}
          <GroupLabel variant="caption">{group.label}</GroupLabel>
          {TOOLS.filter((tool) => tool.group === group.key).map((tool) => (
            <NavItem
              key={tool.href}
              href={tool.href}
              $isActive={pathname === tool.href}
              onClick={onNavigate}
            >
              <Typography variant="body2" sx={{ fontWeight: pathname === tool.href ? 700 : 500 }}>
                {tool.title}
              </Typography>
            </NavItem>
          ))}
        </Stack>
      ))}

      {/* 3. 등록 — 준비 중 */}
      <Stack spacing={0.5}>
        <GroupLabel variant="caption">3. 등록</GroupLabel>
        <DisabledItem>
          <StorefrontIcon fontSize="small" color="disabled" />
          <Typography variant="body2" color="text.disabled" sx={{ flex: 1 }}>
            원클릭 등록
          </Typography>
          <Chip size="small" label="준비 중" />
        </DisabledItem>
      </Stack>
    </Stack>
  );
}

//////////////////// 데스크톱 사이드바 (md 미만 숨김 — 모바일은 헤더 Drawer) ////////////////////
export default function AppSidebar() {
  return (
    <SidebarBox>
      <SidebarNav />
    </SidebarBox>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const SidebarBox = styled.aside(({ theme }) => ({
  width: SIDEBAR_WIDTH,
  flexShrink: 0,
  position: 'sticky',
  top: HEADER_HEIGHT,
  alignSelf: 'flex-start',
  height: `calc(100vh - ${HEADER_HEIGHT}px)`,
  overflowY: 'auto',
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}));

const GroupLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 700,
  padding: theme.spacing(0, 1.5),
  marginBottom: theme.spacing(0.5),
}));

// 플래그십 슬롯: 인디고 강조 (활성 시 채움, 평시 틴트)
const FlagshipItem = styled(Link, transientOptions)<{ $isActive: boolean }>(({ theme, $isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.25),
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  textDecoration: 'none',
  color: $isActive ? theme.palette.primary.contrastText : theme.palette.primary.main,
  backgroundColor: $isActive ? theme.palette.primary.main : theme.palette.action.selected,
  border: `1px solid ${$isActive ? theme.palette.primary.main : theme.palette.divider}`,
  transition: 'background-color 0.15s',
  '&:hover': {
    backgroundColor: $isActive ? theme.palette.primary.dark : theme.palette.action.hover,
  },
}));

const NavItem = styled(Link, transientOptions)<{ $isActive: boolean }>(({ theme, $isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1, 1.5),
  borderRadius: theme.shape.borderRadius,
  textDecoration: 'none',
  color: $isActive ? theme.palette.primary.main : theme.palette.text.primary,
  backgroundColor: $isActive ? theme.palette.action.selected : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const DisabledItem = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.5),
}));
