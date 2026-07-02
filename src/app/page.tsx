//////////////////////////////////////// 라우트 진입점: / ////////////////////////////////////////
// app/는 라우트 연결만 담당하고, 실제 화면 로직은 views/main으로 분리한다.

import MainView from '@/views/main/MainView';

export default function Page() {
  return <MainView />;
}
