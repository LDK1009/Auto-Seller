'use client';

//////////////////////////////////////// 배경 선택 모달 ////////////////////////////////////////
// 완료된 이미지의 배경 옵션(투명/흰색/커스텀)을 선택하는 모달.
// 옵션 변경 시 완료 이미지들이 즉시 재합성되며, 미리보기 슬라이드로 모든 이미지 확인 가능.

import { useCallback, useState } from 'react';
import styled from '@emotion/styled';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { AnimatePresence, motion } from 'framer-motion';
import type { BackgroundOption } from '../_constants/backgroundRemoval';
import type { ImageJob } from '../_store/backgroundRemovalStore';
import BackgroundOptionSelector from './BackgroundOptionSelector';

type BackgroundOptionModalProps = {
  open: boolean;
  jobs: ImageJob[]; // 완료된 이미지들 (미리보기 대상)
  value: BackgroundOption;
  customColor: string;
  onChange: (option: BackgroundOption) => void;
  onCustomColorChange: (hex: string) => void;
  onClose: () => void;
};

// 슬라이드 방향에 따른 진입/이탈 위치
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function BackgroundOptionModal({
  open,
  jobs,
  value,
  customColor,
  onChange,
  onCustomColorChange,
  onClose,
}: BackgroundOptionModalProps) {
  const [rawIndex, setRawIndex] = useState(0); // 순수 UI 상태
  const [direction, setDirection] = useState(0);

  // 이미지 삭제 등으로 개수가 줄었을 때 안전하게 보정
  const index = jobs.length > 0 ? Math.min(rawIndex, jobs.length - 1) : 0;
  const currentJob = jobs.length > 0 ? jobs[index] : null;
  const hasPrev = index > 0;
  const hasNext = index < jobs.length - 1;

  const goPrev = useCallback(() => {
    if (index > 0) {
      setDirection(-1);
      setRawIndex(index - 1);
    }
  }, [index]);

  const goNext = useCallback(() => {
    if (index < jobs.length - 1) {
      setDirection(1);
      setRawIndex(index + 1);
    }
  }, [index, jobs.length]);

  // 투명 배경 선택 시에만 격자무늬로 투명 영역 표시
  const showCheckerboard = value.kind === 'transparent';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>배경 선택</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {/* 미리보기 슬라이드 */}
          {currentJob && (
            <Stack spacing={0.5}>
              <PreviewBody>
                <NavButton $side="left" onClick={goPrev} disabled={!hasPrev} aria-label="이전">
                  <ChevronLeftIcon />
                </NavButton>

                <Stage $showCheckerboard={showCheckerboard}>
                  <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <Slide
                      key={currentJob.id}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(_event, info) => {
                        if (info.offset.x < -60) goNext();
                        else if (info.offset.x > 60) goPrev();
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <Img
                        src={currentJob.resultUrl ?? currentJob.originalUrl}
                        alt={currentJob.file.name}
                        draggable={false}
                      />
                    </Slide>
                  </AnimatePresence>
                </Stage>

                <NavButton $side="right" onClick={goNext} disabled={!hasNext} aria-label="다음">
                  <ChevronRightIcon />
                </NavButton>
              </PreviewBody>

              {/* 파일명 · 위치 */}
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <FileName variant="caption" color="text.secondary" title={currentJob.file.name}>
                  {currentJob.file.name}
                </FileName>
                <Typography variant="caption" color="text.secondary">
                  {index + 1} / {jobs.length}
                </Typography>
              </Stack>
            </Stack>
          )}

          {/* 배경 옵션 */}
          <BackgroundOptionSelector
            value={value}
            customColor={customColor}
            onChange={onChange}
            onCustomColorChange={onCustomColorChange}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>확인</Button>
      </DialogActions>
    </Dialog>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
// 투명 배경 확인용 격자무늬
const CHECKERBOARD =
  'repeating-conic-gradient(#e9e9e9 0% 25%, #ffffff 0% 50%) 50% / 16px 16px';

const PreviewBody = styled.div({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
});

const Stage = styled.div<{ $showCheckerboard: boolean }>(({ theme, $showCheckerboard }) => ({
  flex: 1,
  minWidth: 0,
  height: '40vh',
  overflow: 'hidden',
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  background: $showCheckerboard ? CHECKERBOARD : 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const Slide = styled(motion.div)({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'grab',
  '&:active': { cursor: 'grabbing' },
});

const Img = styled.img({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  userSelect: 'none',
  pointerEvents: 'none',
});

const NavButton = styled(IconButton)<{ $side: 'left' | 'right' }>(({ theme, $side }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 1,
  [$side]: theme.spacing(1),
  backgroundColor: 'rgba(255,255,255,0.85)',
  boxShadow: theme.shadows[1],
  '&:hover': { backgroundColor: 'rgba(255,255,255,1)' },
}));

const FileName = styled(Typography)({
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
