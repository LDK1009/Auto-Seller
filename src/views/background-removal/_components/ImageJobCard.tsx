'use client';

//////////////////////////////////////// 개별 이미지 카드 ////////////////////////////////////////
// 레이아웃: [row: 썸네일 · [col: (파일명·상태) / (진행바·단계)]] · 삭제버튼
// 진행바(ease-in-out)·단계(슬롯 슬라이드)는 shared 공통 애니메이션 컴포넌트 사용.

import styled from '@emotion/styled';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import AnimatedProgressBar from '@/shared/components/AnimatedProgressBar';
import SlideUpText from '@/shared/components/SlideUpText';
import type { ImageJob, ProcessStatus } from '../_hooks/useBackgroundRemoval';

type ImageJobCardProps = {
  job: ImageJob;
  onRemove: (id: string) => void;
};

// 상태별 배지 라벨/색상
const STATUS_META: Record<ProcessStatus, { label: string; color: 'default' | 'info' | 'success' | 'error' }> = {
  pending: { label: '대기', color: 'default' },
  processing: { label: '작업 중', color: 'info' },
  done: { label: '완료', color: 'success' },
  error: { label: '오류', color: 'error' },
};

export default function ImageJobCard({ job, onRemove }: ImageJobCardProps) {
  const thumbnailUrl = job.status === 'done' && job.resultUrl ? job.resultUrl : job.originalUrl;
  const statusMeta = STATUS_META[job.status];

  return (
    <Row>
      {/* 썸네일 (투명 확인용 체커보드) */}
      <ThumbBox>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Thumb src={thumbnailUrl} alt={job.file.name} />
      </ThumbBox>

      {/* 정보 컬럼 */}
      <Info>
        {/* 상단: 파일명 · 상태 */}
        <TopRow>
          <FileName variant="body2" title={job.file.name}>
            {job.file.name}
          </FileName>
          <Chip size="small" label={statusMeta.label} color={statusMeta.color} variant="outlined" />
        </TopRow>

        {/* 하단: 진행바 · 단계 */}
        <BottomRow>
          {job.status === 'processing' && (
            <>
              <ProgressWrap>
                <AnimatedProgressBar
                  value={job.progress}
                  durationMs={job.progressMs}
                  indeterminate={job.downloading}
                />
              </ProgressWrap>
              <StepText variant="caption" color="text.secondary">
                <SlideUpText value={job.step}>{job.step}</SlideUpText>
              </StepText>
            </>
          )}
          {job.status === 'pending' && (
            <HintText variant="caption" color="text.secondary">
              처리 대기 중
            </HintText>
          )}
          {job.status === 'done' && (
            <HintText variant="caption" color="success.main">
              누끼 완료
            </HintText>
          )}
          {job.status === 'error' && (
            <ErrorText variant="caption" color="error">
              {job.error}
            </ErrorText>
          )}
        </BottomRow>
      </Info>

      {/* 삭제 */}
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
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
}));

const ThumbBox = styled.div({
  flexShrink: 0,
  width: 64,
  height: 64,
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
  minWidth: 0, // 파일명 ellipsis 위해 필요
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.75),
}));

const TopRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
}));

const BottomRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  minHeight: 20, // 상태 전환 시 높이 흔들림 방지
}));

const FileName = styled(Typography)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
  minWidth: 0,
});

const ProgressWrap = styled.div({
  flex: 1,
  minWidth: 0,
});

const StepText = styled(Typography)({
  flexShrink: 0,
  minWidth: 64,
  textAlign: 'right',
});

const HintText = styled(Typography)({});

const ErrorText = styled(Typography)({
  wordBreak: 'break-word',
});

const RemoveButton = styled(IconButton)({
  flexShrink: 0,
  alignSelf: 'flex-start',
});
