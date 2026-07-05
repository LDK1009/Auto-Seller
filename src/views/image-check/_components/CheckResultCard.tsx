'use client';

//////////////////////////////////////// 검사 결과 카드 ////////////////////////////////////////
// [썸네일 · [파일명·종합판정 / 항목별 체크리스트]] · 삭제

import styled from '@emotion/styled';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import type { CheckJob } from '../_store/imageCheckStore';
import type { CheckStatus } from '../_constants/imageCheck';

type CheckResultCardProps = {
  job: CheckJob;
  onRemove: (id: string) => void;
};

const OVERALL_META: Record<CheckStatus, { label: string; color: 'success' | 'warning' | 'error' }> = {
  pass: { label: '적합', color: 'success' },
  warn: { label: '주의', color: 'warning' },
  fail: { label: '부적합', color: 'error' },
};

const STATUS_ICON: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircleOutlinedIcon fontSize="small" color="success" />,
  warn: <WarningAmberIcon fontSize="small" color="warning" />,
  fail: <CancelOutlinedIcon fontSize="small" color="error" />,
};

export default function CheckResultCard({ job, onRemove }: CheckResultCardProps) {
  return (
    <Card>
      <TopRow>
        <ThumbBox>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Thumb src={job.originalUrl} alt={job.file.name} />
        </ThumbBox>
        <TitleArea>
          <FileName variant="body2" title={job.file.name}>
            {job.file.name}
          </FileName>
          {job.overall === null ? (
            <CircularProgress size={16} />
          ) : (
            <Chip
              size="small"
              label={OVERALL_META[job.overall].label}
              color={OVERALL_META[job.overall].color}
            />
          )}
        </TitleArea>
        <RemoveButton size="small" onClick={() => onRemove(job.id)} aria-label="삭제">
          <CloseIcon fontSize="small" />
        </RemoveButton>
      </TopRow>

      {/* 항목별 체크리스트 */}
      {job.checks.length > 0 && (
        <CheckList>
          {job.checks.map((check) => (
            <CheckRow key={check.key}>
              {STATUS_ICON[check.status]}
              <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 56 }}>
                {check.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {check.message}
              </Typography>
            </CheckRow>
          ))}
        </CheckList>
      )}
    </Card>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Card = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
}));

const TopRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
}));

const ThumbBox = styled.div({
  flexShrink: 0,
  width: 56,
  height: 56,
  borderRadius: 8,
  overflow: 'hidden',
  backgroundColor: '#F0F0F0',
});

const Thumb = styled.img({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

const TitleArea = styled.div(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const FileName = styled(Typography)({
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const CheckList = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  paddingLeft: theme.spacing(0.5),
}));

const CheckRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const RemoveButton = styled(IconButton)({
  flexShrink: 0,
});
