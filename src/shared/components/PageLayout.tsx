'use client';

//////////////////////////////////////// 공통 페이지 레이아웃 ////////////////////////////////////////
// [타이틀 섹션: 제목·설명·우측 액션] + [컨텐츠 섹션: 최소 페이지 높이 보장]
// 새 페이지는 이 컴포넌트로 감싸 동일한 골격을 유지한다.

import type { ReactNode } from 'react';
import styled from '@emotion/styled';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Breakpoint } from '@mui/material/styles';

type PageLayoutProps = {
  title: string;
  description?: string;
  actions?: ReactNode; // 타이틀 우측 액션 (버튼 등)
  maxWidth?: Breakpoint;
  children: ReactNode;
};

export default function PageLayout({
  title,
  description,
  actions,
  maxWidth = 'lg',
  children,
}: PageLayoutProps) {
  return (
    <PageContainer maxWidth={maxWidth}>
      {/* 타이틀 섹션 */}
      <TitleSection>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Stack>
        {actions && <ActionsSlot>{actions}</ActionsSlot>}
      </TitleSection>

      {/* 컨텐츠 섹션 */}
      <ContentSection>{children}</ContentSection>
    </PageContainer>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
// body(flex column) 안에서 main이 flex:1이므로, 컨테이너가 세로로 채워져 최소 페이지 높이가 보장된다.
const PageContainer = styled(Container)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
});

const TitleSection = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  padding: theme.spacing(5, 0, 3),
}));

const ActionsSlot = styled.div({
  flexShrink: 0,
});

const ContentSection = styled.div(({ theme }) => ({
  flex: 1,
  paddingBottom: theme.spacing(6),
}));
