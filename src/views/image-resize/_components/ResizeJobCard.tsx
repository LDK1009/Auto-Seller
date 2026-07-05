'use client';

//////////////////////////////////////// 규격 변환 아이템 카드 ////////////////////////////////////////
// [썸네일 · [파일명 / 해상도 변화·상태]] · 삭제

import styled from '@emotion/styled';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import type { ResizeJob, ResizeStatus } from '../_store/imageResizeStore';
import type { ResizeSettings } from '../_constants/imageResize';

type ResizeJobCardProps = {
  job: ResizeJob;
  settings: ResizeSettings;
  onRemove: (id: string) => void;
};

const STATUS_META: Record<ResizeStatus, { label: string; color: 'default' | 'success' | 'error' }> = {
  pending: { label: '대기', color: 'default' },
  done: { label: '완료', color: 'success' },
  error: { label: '오류', color: 'error' },
};

export default function ResizeJobCard({ job, settings, onRemove }: ResizeJobCardProps) {
  const thumbnailUrl = job.status === 'done' && job.resultUrl ? job.resultUrl : job.originalUrl;
  const statusMeta = STATUS_META[job.status];
  const hasOriginalSize = job.originalWidth !== null && job.originalHeight !== null;

  return (
    <Row>
      <ThumbBox>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Thumb src={thumbnailUrl} alt={job.file.name} />
      </ThumbBox>

      <Info>
        <FileName variant="body2" title={job.file.name}>
          {job.file.name}
        </FileName>
        <BottomRow>
          <Typography variant="caption" color="text.secondary">
            {hasOriginalSize ? `${job.originalWidth}×${job.originalHeight}` : '측정 중'} →{' '}
            {settings.width}×{settings.height}
          </Typography>
          <Chip size="small" label={statusMeta.label} color={statusMeta.color} variant="outlined" />
        </BottomRow>
        {job.status === 'error' && (
          <Typography variant="caption" color="error">
            {job.error}
          </Typography>
        )}
      </Info>

      <RemoveButton size="small" onClick={() => onRemove(job.id)} aria-label="삭제">
        <CloseIcon fontSize="small" />
      </RemoveButton>
    </Row>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const CHECKERBOARD =
  'repeating-conic-gradient(#e9e9e9 0% 25%, #ffffff 0% 50%) 50% / 12px 12px';

const Row = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
}));

const ThumbBox = styled.div({
  flexShrink: 0,
  width: 88,
  height: 88,
  borderRadius: 8,
  overflow: 'hidden',
  background: CHECKERBOARD,
});

const Thumb = styled.img({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  display: 'block',
});

const Info = styled.div(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.75),
}));

const FileName = styled(Typography)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const BottomRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
}));

const RemoveButton = styled(IconButton)({
  flexShrink: 0,
  alignSelf: 'center',
});
