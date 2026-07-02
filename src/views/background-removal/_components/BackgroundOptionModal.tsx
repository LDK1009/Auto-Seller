'use client';

//////////////////////////////////////// 배경 선택 모달 ////////////////////////////////////////
// 3섹션: [검색] 무료 배경 이미지 검색·적용 / [미리보기] 결과 슬라이드 / [툴] 배경제거·색상.
// 옵션 변경 시 완료 이미지들이 즉시 재합성된다(훅의 changeBackgroundOption).

import { useCallback, useState } from 'react';
import styled from '@emotion/styled';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FormatColorResetIcon from '@mui/icons-material/FormatColorReset';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckIcon from '@mui/icons-material/Check';
import { AnimatePresence, motion } from 'framer-motion';
import type { BackgroundOption } from '../_constants/backgroundRemoval';
import type { ImageJob } from '../_store/backgroundRemovalStore';
import { useBackgroundImageSearch } from '../_hooks/useBackgroundImageSearch';
import ColorPickerPopover, { getPatternPreviewCss } from './ColorPickerPopover';
import { transientOptions } from '@/shared/utils/emotionTransientProps';

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
  //////////////////// 검색 상태 ////////////////////
  const { results, isLoading, hasMore, hasSearched, search, loadMore } = useBackgroundImageSearch();
  const [keyword, setKeyword] = useState(''); // 순수 UI 상태 (입력값)

  //////////////////// 미리보기 슬라이드 상태 ////////////////////
  const [rawIndex, setRawIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [colorAnchorEl, setColorAnchorEl] = useState<HTMLElement | null>(null); // 색상 팝오버 앵커

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

  const handleSearch = () => {
    if (!isLoading) search(keyword);
  };

  // 투명 배경 선택 시에만 격자무늬로 투명 영역 표시
  const showCheckerboard = value.kind === 'transparent';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>배경 선택</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5}>
          {/* ==================== 검색 섹션 ==================== */}
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              배경 이미지 검색
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="무료 배경 이미지 검색 (예: 대리석, 우드, 스튜디오)"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSearch();
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {/* 검색 중엔 로딩 스피너로 교체해 진행 중임을 표시 */}
                      {isLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <IconButton size="small" onClick={handleSearch} aria-label="검색">
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* 검색 결과 — 가로 스크롤 */}
            {results.length > 0 && (
              <ResultsRow>
                {results.map((item) => {
                  const isSelected = value.kind === 'image' && value.url === item.imageUrl;
                  return (
                    <ResultThumb
                      key={item.id}
                      type="button"
                      $isSelected={isSelected}
                      onClick={() => onChange({ kind: 'image', url: item.imageUrl })}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.thumbUrl} alt="배경 후보" loading="lazy" />
                    </ResultThumb>
                  );
                })}
                {hasMore && (
                  <MoreButton type="button" onClick={loadMore} disabled={isLoading}>
                    {isLoading ? <CircularProgress size={18} /> : '더보기'}
                  </MoreButton>
                )}
              </ResultsRow>
            )}
            {isLoading && results.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                검색 중…
              </Typography>
            )}
            {hasSearched && !isLoading && results.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                검색 결과가 없습니다.
              </Typography>
            )}
          </Stack>

          {/* ==================== 미리보기 + 툴 섹션 ==================== */}
          <Stack spacing={1}>
          {currentJob && (
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" color="text.secondary">
                미리보기
              </Typography>
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

              {/* 위치(중앙) · 파일명(우측 끝) */}
              <MetaRow>
                <span />
                <Typography variant="caption" color="text.secondary">
                  {index + 1} / {jobs.length}
                </Typography>
                <FileName variant="caption" color="text.secondary" title={currentJob.file.name}>
                  {currentJob.file.name}
                </FileName>
              </MetaRow>
            </Stack>
          )}

            {/* 툴 — 미리보기 바로 하단, 중앙 정렬 */}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              {/* 배경 제거(투명) */}
              <Tooltip title="배경 제거 (투명)">
                <ToolButton
                  $isActive={value.kind === 'transparent'}
                  onClick={() => onChange({ kind: 'transparent' })}
                  aria-label="배경 제거"
                >
                  <FormatColorResetIcon />
                </ToolButton>
              </Tooltip>

              {/* 배경 색상 (커스텀 팝오버) */}
              <Tooltip title="배경 색상">
                <ToolButton
                  $isActive={value.kind === 'color'}
                  onClick={(event) => setColorAnchorEl(event.currentTarget)}
                  aria-label="배경 색상"
                >
                  <PaletteIcon />
                </ToolButton>
              </Tooltip>

              {/* 현재 색상/패턴 표시 */}
              {value.kind === 'color' && (
                <ColorSwatch
                  style={{
                    background: getPatternPreviewCss(value.hex, value.pattern ?? 'solid', value.gradientDirection),
                  }}
                />
              )}
            </Stack>
          </Stack>
        </Stack>

        {/* 색상 선택 팝오버 */}
        <ColorPickerPopover
          anchorEl={colorAnchorEl}
          value={value}
          customColor={customColor}
          onChange={onChange}
          onCustomColorChange={onCustomColorChange}
          onClose={() => setColorAnchorEl(null)}
        />
      </DialogContent>
      <DialogActions>
        <Button fullWidth variant="contained" startIcon={<CheckIcon />} onClick={onClose}>
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
// 투명 배경 확인용 격자무늬
const CHECKERBOARD =
  'repeating-conic-gradient(#e9e9e9 0% 25%, #ffffff 0% 50%) 50% / 16px 16px';

//////////////////// 검색 섹션 ////////////////////
const ResultsRow = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  overflowX: 'auto',
  paddingBottom: theme.spacing(0.5),
}));

const ResultThumb = styled.button<{ $isSelected: boolean }>(({ theme, $isSelected }) => ({
  flexShrink: 0,
  width: 88,
  height: 64,
  padding: 0,
  border: `2px solid ${$isSelected ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: 8,
  overflow: 'hidden',
  cursor: 'pointer',
  backgroundColor: theme.palette.background.paper,
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
}));

const MoreButton = styled.button(({ theme }) => ({
  flexShrink: 0,
  width: 88,
  height: 64,
  border: `1px dashed ${theme.palette.divider}`,
  borderRadius: 8,
  cursor: 'pointer',
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.secondary,
  fontSize: 13,
  '&:disabled': { cursor: 'default', opacity: 0.6 },
}));

//////////////////// 미리보기 섹션 ////////////////////
const PreviewBody = styled.div({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
});

const Stage = styled.div<{ $showCheckerboard: boolean }>(({ theme, $showCheckerboard }) => ({
  flex: 1,
  minWidth: 0,
  height: '36vh',
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

const NavButton = styled(IconButton, transientOptions)<{ $side: 'left' | 'right' }>(({ theme, $side }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 1,
  [$side]: theme.spacing(1),
  backgroundColor: 'rgba(255,255,255,0.85)',
  boxShadow: theme.shadows[1],
  '&:hover': { backgroundColor: 'rgba(255,255,255,1)' },
}));

// 위치는 중앙, 파일명은 우측 끝 (양쪽 1fr 그리드로 중앙 고정)
const MetaRow = styled.div({
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
});

const FileName = styled(Typography)({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'right',
});

//////////////////// 툴 섹션 ////////////////////
const ToolButton = styled(IconButton, transientOptions)<{ $isActive: boolean }>(({ theme, $isActive }) => ({
  border: `1px solid ${$isActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: 8,
  color: $isActive ? theme.palette.primary.main : theme.palette.text.secondary,
  backgroundColor: $isActive ? theme.palette.action.selected : 'transparent',
}));

const ColorSwatch = styled.span(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: 6,
  border: `1px solid ${theme.palette.divider}`,
  display: 'inline-block',
}));
