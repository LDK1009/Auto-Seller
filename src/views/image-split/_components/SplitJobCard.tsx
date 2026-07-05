'use client';

//////////////////////////////////////// 분할 아이템 카드 ////////////////////////////////////////
// [썸네일 · [파일명 / 해상도·예상(완료) 조각 수·상태]] · 삭제

import styled from '@emotion/styled';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import type { SplitJob, SplitStatus } from '../_store/imageSplitStore';

type SplitJobCardProps = {
  job: SplitJob;
  pieceHeight: number;
  onRemove: (id: string) => void;
};

const STATUS_META: Record<SplitStatus, { label: string; color: 'default' | 'success' | 'error' }> = {
  pending: { label: '대기', color: 'default' },
  done: { label: '완료', color: 'success' },
  error: { label: '오류', color: 'error' },
};

export default function SplitJobCard({ job, pieceHeight, onRemove }: SplitJobCardProps) {
  const statusMeta = STATUS_META[job.status];
  const hasSize = job.width !== null && job.height !== null;
  // 완료 전엔 예상 조각 수, 완료 후엔 실제 조각 수
  const pieceCount =
    job.status === 'done'
      ? job.pieceBlobs.length
      : hasSize
        ? Math.max(1, Math.ceil((job.height as number) / pieceHeight))
        : null;

  return (
    <Row>
      <ThumbBox>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Thumb src={job.originalUrl} alt={job.file.name} />
      </ThumbBox>

      <Info>
        <FileName variant="body2" title={job.file.name}>
          {job.file.name}
        </FileName>
        <BottomRow>
          <Typography variant="caption" color="text.secondary">
            {hasSize ? `${job.width}×${job.height}` : '측정 중'}
            {pieceCount !== null && ` → ${pieceCount}조각`}
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
  width: 64,
  height: 88,
  borderRadius: 8,
  overflow: 'hidden',
  backgroundColor: '#F0F0F0',
});

const Thumb = styled.img({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'top',
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
