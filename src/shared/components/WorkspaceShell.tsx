'use client';

//////////////////////////////////////// 작업 공간 셸 ////////////////////////////////////////
// (workspace) 라우트 그룹 레이아웃의 몸통: 좌측 사이드바 + 우측 콘텐츠.

import type { ReactNode } from 'react';
import styled from '@emotion/styled';
import AppSidebar from '@/shared/components/AppSidebar';
import { HEADER_HEIGHT } from '@/shared/constants/layout';

type WorkspaceShellProps = {
  children: ReactNode;
};

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  return (
    <Shell>
      <AppSidebar />
      <Content>{children}</Content>
    </Shell>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Shell = styled.div({
  display: 'flex',
  alignItems: 'stretch',
  minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`, // 콘텐츠가 짧아도 사이드바 보더가 뷰포트 끝까지
});

const Content = styled.div({
  flex: 1,
  minWidth: 0, // flex 자식 오버플로우 방지
});
