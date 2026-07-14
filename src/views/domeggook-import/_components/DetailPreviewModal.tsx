'use client';

//////////////////////////////////////// 상세설명 미리보기 모달 ////////////////////////////////////////
// ⑦ 상세설명 [미리보기] — HTML 복사 붙여넣기 결과 예시. 상세 이미지 전체를 세로로 이어붙여
// 스크롤로 훑어볼 수 있다 (스마트스토어 상세설명에 들어갈 모습 그대로).

import styled from '@emotion/styled';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import type { DomeggookItemImage } from '@/shared/types/domeggook';

type DetailPreviewModalProps = {
  open: boolean;
  images: DomeggookItemImage[]; // 상세(detail) 이미지 목록
  onClose: () => void;
};

export default function DetailPreviewModal({ open, images, onClose }: DetailPreviewModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} disableScrollLock>
      <Stack spacing={1.5} sx={{ p: 2.5, width: 'min(88vw, 720px)', maxHeight: 'calc(100vh - 64px)' }}>
        {/* 헤더 */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            상세설명 미리보기
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="닫기">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>

        {/* 세로 이어붙인 상세 이미지 — 전체 스크롤 */}
        <ScrollArea>
          {images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={image.url} src={image.proxyUrl} alt="상세 이미지" loading="lazy" />
          ))}
        </ScrollArea>

        <Typography variant="caption" color="text.secondary">
          HTML 복사를 붙여넣으면 이 순서 그대로 상세설명에 들어갑니다.
        </Typography>
      </Stack>
    </Dialog>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const ScrollArea = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: '#ffffff',
  // 이어붙인 한 장처럼 — 이미지 사이 간격 없음
  '& img': {
    display: 'block',
    width: '100%',
  },
}));
