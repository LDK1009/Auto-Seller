'use client';

//////////////////////////////////////// 워터마크 아이템 카드 ////////////////////////////////////////

import styled from '@emotion/styled';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import type { WatermarkJob, WatermarkStatus } from '../_store/watermarkStore';

type WatermarkJobCardProps = {
  job: WatermarkJob;
  onRemove: (id: string) => void;
};

const STATUS_META: Record<WatermarkStatus, { label: string; color: 'default' | 'success' | 'error' }> = {
  pending: { label: '대기', color: 'default' },
  done: { label: '완료', color: 'success' },
  error: { label: '오류', color: 'error' },
};

export default function WatermarkJobCard({ job, onRemove }: WatermarkJobCardProps) {
  const thumbnailUrl = job.status === 'done' && job.resultUrl ? job.resultUrl : job.originalUrl;
  const statusMeta = STATUS_META[job.status];

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
          <Chip size="small" label={statusMeta.label} color={statusMeta.color} variant="outlined" />
          {job.status === 'error' && (
            <Typography variant="caption" color="error">
              {job.error}
            </Typography>
          )}
        </BottomRow>
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
  width: 88,
  height: 88,
  borderRadius: 8,
  overflow: 'hidden',
  backgroundColor: '#F0F0F0',
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
  gap: theme.spacing(1),
}));

const RemoveButton = styled(IconButton)({
  flexShrink: 0,
  alignSelf: 'center',
});
