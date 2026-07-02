'use client';

//////////////////////////////////////// 개별 이미지 카드 ////////////////////////////////////////
// 썸네일(완료 시 결과, 그 외 원본) + 상태 + 진행률 + 삭제.

import styled from '@emotion/styled';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import type { ImageJob, ProcessStatus } from '../_hooks/useBackgroundRemoval';

type ImageJobCardProps = {
  job: ImageJob;
  onRemove: (id: string) => void;
};

// 상태별 배지 라벨/색상
const STATUS_META: Record<ProcessStatus, { label: string; color: 'default' | 'info' | 'success' | 'error' }> = {
  pending: { label: '대기', color: 'default' },
  processing: { label: '처리 중', color: 'info' },
  done: { label: '완료', color: 'success' },
  error: { label: '오류', color: 'error' },
};

export default function ImageJobCard({ job, onRemove }: ImageJobCardProps) {
  const thumbnailUrl = job.status === 'done' && job.resultUrl ? job.resultUrl : job.originalUrl;
  const statusMeta = STATUS_META[job.status];

  return (
    <Card>
      <RemoveButton size="small" onClick={() => onRemove(job.id)} aria-label="삭제">
        <CloseIcon fontSize="small" />
      </RemoveButton>

      {/* 투명 배경 확인용 체커보드 위에 썸네일 */}
      <ThumbBox>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Thumb src={thumbnailUrl} alt={job.file.name} />
      </ThumbBox>

      <InfoBox>
        <FileName variant="caption" title={job.file.name}>
          {job.file.name}
        </FileName>
        <Chip size="small" label={statusMeta.label} color={statusMeta.color} variant="outlined" />
      </InfoBox>

      {/* 처리 중: 진행바 / 오류: 메시지 */}
      {job.status === 'processing' && (
        <LinearProgress
          variant={job.progress > 0 ? 'determinate' : 'indeterminate'}
          value={Math.round(job.progress * 100)}
        />
      )}
      {job.status === 'error' && (
        <ErrorText variant="caption" color="error">
          {job.error}
        </ErrorText>
      )}
    </Card>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const CHECKERBOARD =
  'repeating-conic-gradient(#e9e9e9 0% 25%, #ffffff 0% 50%) 50% / 16px 16px';

const Card = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.75),
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
}));

const ThumbBox = styled.div({
  position: 'relative',
  width: '100%',
  aspectRatio: '1 / 1',
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

const InfoBox = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
}));

const FileName = styled(Typography)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
});

const ErrorText = styled(Typography)({
  wordBreak: 'break-word',
});

const RemoveButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  zIndex: 1,
  backgroundColor: 'rgba(255,255,255,0.85)',
  '&:hover': { backgroundColor: 'rgba(255,255,255,1)' },
}));
