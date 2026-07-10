//////////////////////////////////////// 라우트 진입점: /domeggook-import ////////////////////////////////////////
// Suspense: 뷰가 useSearchParams(?input= 자동 조회)를 쓰므로 정적 렌더 경계 필요.

import { Suspense } from 'react';
import DomeggookImportView from '@/views/domeggook-import/DomeggookImportView';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DomeggookImportView />
    </Suspense>
  );
}
