'use client';

//////////////////////////////////////// 이미지 미리보기 모달 (공통) ////////////////////////////////////////
// 큰 이미지 미리보기 + 좌우 화살표/키보드(←→)/드래그 슬라이드. 이미지 도구 공용.

import { useCallback, useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { transientOptions } from '@/shared/utils/emotionTransientProps';

export type PreviewImage = {
  id: string;
  name: string;
  url: string | null; // null = 생성 중 (스피너 표시)
  badge?: { label: string; color?: 'default' | 'info' | 'success' | 'error' | 'warning' };
  showCheckerboard?: boolean; // 투명 확인용 격자 배경
};

type ImagePreviewModalProps = {
  images: PreviewImage[];
  index: number; // 현재 인덱스 (0 이상이면 열림)
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
};

// 슬라이드 방향에 따른 진입/이탈 위치
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function ImagePreviewModal({ images, index, onClose, onNavigate }: ImagePreviewModalProps) {
  const open = index >= 0 && index < images.length;
  const image = open ? images[index] : null;
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < images.length - 1;
  const [direction, setDirection] = useState(0);

  const goPrev = useCallback(() => {
    if (hasPrev) {
      setDirection(-1);
      onNavigate(index - 1);
    }
  }, [hasPrev, index, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) {
      setDirection(1);
      onNavigate(index + 1);
    }
  }, [hasNext, index, onNavigate]);

  //////////////////// 키보드 좌우 ////////////////////
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goPrev();
      else if (event.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, goPrev, goNext]);

  if (!image) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {/* 헤더 */}
      <Header>
        <FileName variant="body2" title={image.name}>
          {image.name}
        </FileName>
        {image.badge && (
          <Chip size="small" label={image.badge.label} color={image.badge.color ?? 'default'} variant="outlined" />
        )}
        <IconButton size="small" onClick={onClose} aria-label="닫기">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Header>

      {/* 본문: 좌우 화살표 + 슬라이드 스테이지 */}
      <Body>
        <NavButton $side="left" onClick={goPrev} disabled={!hasPrev} aria-label="이전">
          <ChevronLeftIcon />
        </NavButton>

        <Stage $showCheckerboard={Boolean(image.showCheckerboard)}>
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <Slide
              key={image.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_event, info) => {
                if (info.offset.x < -80) goNext();
                else if (info.offset.x > 80) goPrev();
              }}
            >
              {image.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <Img src={image.url} alt={image.name} draggable={false} />
              ) : (
                <CircularProgress size={32} />
              )}
            </Slide>
          </AnimatePresence>
        </Stage>

        <NavButton $side="right" onClick={goNext} disabled={!hasNext} aria-label="다음">
          <ChevronRightIcon />
        </NavButton>
      </Body>

      {/* 위치 표시 */}
      <Footer variant="caption" color="text.secondary">
        {index + 1} / {images.length}
      </Footer>
    </Dialog>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
// 투명 배경 확인용 격자무늬
const CHECKERBOARD =
  'repeating-conic-gradient(#e9e9e9 0% 25%, #ffffff 0% 50%) 50% / 20px 20px';

const Header = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const FileName = styled(Typography)({
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const Body = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
}));

const Stage = styled.div<{ $showCheckerboard: boolean }>(({ $showCheckerboard }) => ({
  flex: 1,
  minWidth: 0,
  height: '60vh',
  overflow: 'hidden',
  borderRadius: 8,
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

const NavButton = styled(IconButton, transientOptions)<{ $side: 'left' | 'right' }>(({ theme, $side }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 1,
  [$side]: theme.spacing(2),
  backgroundColor: 'rgba(255,255,255,0.85)',
  boxShadow: theme.shadows[2],
  '&:hover': { backgroundColor: 'rgba(255,255,255,1)' },
}));

const Footer = styled(Typography)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(1, 2, 2),
}));
