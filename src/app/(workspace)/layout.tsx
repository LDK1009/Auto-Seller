//////////////////////////////////////// 작업 공간 레이아웃 ////////////////////////////////////////
// 도구 페이지 공통: 좌측 사이드바(작업 플로우 네비) + 콘텐츠. 랜딩(/)에는 적용되지 않는다.

import WorkspaceShell from '@/shared/components/WorkspaceShell';

type WorkspaceLayoutProps = {
  children: React.ReactNode;
};

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
