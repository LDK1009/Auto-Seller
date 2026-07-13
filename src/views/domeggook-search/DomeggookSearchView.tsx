'use client';

//////////////////////////////////////// 도매꾹 검색 화면 ////////////////////////////////////////
// 링크 복사 없이 사이트 안에서 소싱: 검색/카테고리 → 정렬·필터 → 카드 클릭 = 원링크 등록 준비.
// 본체는 공용 DomeggookSearchPanel (원링크 임베드와 공유) — 이 뷰는 페이지 래퍼 + 원링크 연결만.

import { useRouter } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import DomeggookSearchPanel from '@/shared/components/DomeggookSearchPanel';

export default function DomeggookSearchView() {
  const router = useRouter();

  return (
    <PageLayout
      title="도매꾹 검색"
      description="링크 없이, 검색으로 소싱을 시작합니다."
      help={
        <HelpPanel storageKey="domeggook-search">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 검색하거나 카테고리를 고르세요</Typography>
            <Typography variant="body2">② 정렬과 필터로 후보를 추리세요</Typography>
            <Typography variant="body2">③ 상품을 클릭하면 등록 준비가 시작됩니다</Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <DomeggookSearchPanel
        syncKeywordToUrl
        onPick={(no) => router.push(`/domeggook-import?input=${no}`)}
      />
    </PageLayout>
  );
}
