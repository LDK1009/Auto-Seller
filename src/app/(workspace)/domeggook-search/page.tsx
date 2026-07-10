//////////////////////////////////////// 라우트 진입점: /domeggook-search ////////////////////////////////////////
// 뷰가 useSearchParams를 쓰므로 Suspense 경계 필요 (정적 프리렌더 요건)

import { Suspense } from 'react';
import DomeggookSearchView from '@/views/domeggook-search/DomeggookSearchView';

export default function Page() {
  return (
    <Suspense>
      <DomeggookSearchView />
    </Suspense>
  );
}
