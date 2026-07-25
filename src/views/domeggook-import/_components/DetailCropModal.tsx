'use client';

//////////////////////////////////////// 상세이미지 크롭 모달 ////////////////////////////////////////
// 상세이미지 전체를 세로로 이어붙여 스크롤로 훑고, 1:1 선택 박스로 원하는 영역을 잘라 Blob으로 반환.
// - 박스: 드래그 이동 + 우하단 핸들 리사이즈 (정사각 고정)
// - 크롭: 표시 좌표 → 각 이미지 natural 좌표로 환산해 1000×1000 캔버스에 합성 (경계 걸침 지원)
// - 이미지는 프록시(같은 출처) 경유라 캔버스 오염(taint) 없음

import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import CropOutlinedIcon from '@mui/icons-material/CropOutlined';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignHorizontalCenterIcon from '@mui/icons-material/AlignHorizontalCenter';
import AlignHorizontalRightIcon from '@mui/icons-material/AlignHorizontalRight';
import WidthFullOutlinedIcon from '@mui/icons-material/WidthFullOutlined';
import CenterFocusStrongOutlinedIcon from '@mui/icons-material/CenterFocusStrongOutlined';
import type { DomeggookItemImage } from '@/shared/types/domeggook';
import { transientOptions } from '@/shared/utils/emotionTransientProps';

const OUTPUT_SIZE = 1000; // 스마트스토어 권장 1000×1000
const MIN_BOX_SIZE = 60;

type DetailCropModalProps = {
  open: boolean;
  images: DomeggookItemImage[]; // 세로로 이어붙일 이미지들 (상세)
  onClose: () => void;
  onCrop: (blob: Blob) => void;
};

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

type DragState = {
  mode: 'move' | ResizeCorner;
  startX: number;
  startY: number;
  startScrollTop: number;
  startBox: { x: number; y: number; size: number };
};

const AUTO_SCROLL_FACTOR = 0.18; // 경계 초과 px당 프레임 스크롤량
const AUTO_SCROLL_MAX = 24; // 프레임당 최대 스크롤 px

export default function DetailCropModal({ open, images, onClose, onCrop }: DetailCropModalProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const [box, setBox] = useState({ x: 0, y: 0, size: 240 });
  const dragRef = useRef<DragState | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const autoScrollSpeedRef = useRef(0);
  const [isCropping, setIsCropping] = useState(false);

  ////////// 열릴 때 기본 박스 = 보이는 영역보다 작게 (뷰포트 높이 80%와 콘텐츠 폭 중 작은 값, 가로 중앙)
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const width = contentRef.current?.clientWidth;
      const viewHeight = scrollRef.current?.clientHeight;
      if (!width || !viewHeight) return;
      const size = Math.min(width, Math.floor(viewHeight * 0.8));
      setBox({ x: Math.max((width - size) / 2, 0), y: 0, size });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  ////////// 박스 좌표 클램프 (콘텐츠 범위 안)
  const clampBox = (next: { x: number; y: number; size: number }) => {
    const content = contentRef.current;
    if (!content) return next;
    const maxSize = Math.min(content.clientWidth, content.scrollHeight);
    const size = Math.min(Math.max(next.size, MIN_BOX_SIZE), maxSize);
    return {
      size,
      x: Math.min(Math.max(next.x, 0), content.clientWidth - size),
      y: Math.min(Math.max(next.y, 0), content.scrollHeight - size),
    };
  };

  ////////// 포인터 → 박스 갱신 (스크롤 이동분 포함 — 자동 스크롤 중에도 재계산)
  const applyPointer = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    const scrollElement = scrollRef.current;
    if (!drag || !scrollElement) return;
    const deltaX = clientX - drag.startX;
    const deltaY = clientY - drag.startY + (scrollElement.scrollTop - drag.startScrollTop);
    const start = drag.startBox;

    if (drag.mode === 'move') {
      setBox(clampBox({ ...start, x: start.x + deltaX, y: start.y + deltaY }));
      return;
    }
    // 코너 리사이즈 — 반대 꼭지점 고정, 정사각 유지
    let size = start.size;
    if (drag.mode === 'se') size = start.size + Math.max(deltaX, deltaY);
    if (drag.mode === 'nw') size = start.size + Math.max(-deltaX, -deltaY);
    if (drag.mode === 'ne') size = start.size + Math.max(deltaX, -deltaY);
    if (drag.mode === 'sw') size = start.size + Math.max(-deltaX, deltaY);
    size = Math.max(size, MIN_BOX_SIZE);
    const anchorX = drag.mode === 'nw' || drag.mode === 'sw' ? start.x + start.size : start.x;
    const anchorY = drag.mode === 'nw' || drag.mode === 'ne' ? start.y + start.size : start.y;
    setBox(
      clampBox({
        size,
        x: drag.mode === 'nw' || drag.mode === 'sw' ? anchorX - size : anchorX,
        y: drag.mode === 'nw' || drag.mode === 'ne' ? anchorY - size : anchorY,
      }),
    );
  };

  ////////// 드래그 (이동·코너 리사이즈 공용) — 경계 밖으로 끌면 초과 거리 비례 자동 스크롤
  const beginDrag = (event: React.PointerEvent, mode: DragState['mode']) => {
    event.preventDefault();
    event.stopPropagation();
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startScrollTop: scrollElement.scrollTop,
      startBox: { ...box },
    };
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    autoScrollSpeedRef.current = 0;

    // 자동 스크롤 루프 — 포인터가 멈춰 있어도 스크롤·박스 갱신 지속
    let frame = 0;
    const tick = () => {
      if (!dragRef.current) return;
      if (autoScrollSpeedRef.current !== 0) {
        scrollElement.scrollTop += autoScrollSpeedRef.current;
        applyPointer(lastPointerRef.current.x, lastPointerRef.current.y);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const handleMove = (moveEvent: PointerEvent) => {
      lastPointerRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
      // 경계 초과량 → 스크롤 속도 (위 음수·아래 양수)
      const rect = scrollElement.getBoundingClientRect();
      const overflowTop = rect.top - moveEvent.clientY;
      const overflowBottom = moveEvent.clientY - rect.bottom;
      autoScrollSpeedRef.current =
        overflowTop > 0
          ? -Math.min(overflowTop * AUTO_SCROLL_FACTOR, AUTO_SCROLL_MAX)
          : overflowBottom > 0
            ? Math.min(overflowBottom * AUTO_SCROLL_FACTOR, AUTO_SCROLL_MAX)
            : 0;
      applyPointer(moveEvent.clientX, moveEvent.clientY);
    };
    // 드래그 중 휠 스크롤 → 스크롤 이동분이 박스 좌표에 반영돼 박스가 포인터를 따라옴
    const handleScroll = () => applyPointer(lastPointerRef.current.x, lastPointerRef.current.y);
    const handleUp = () => {
      dragRef.current = null;
      autoScrollSpeedRef.current = 0;
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      scrollElement.removeEventListener('scroll', handleScroll);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    scrollElement.addEventListener('scroll', handleScroll);
  };

  ////////// 보고 있는 위치로 박스 가져오기 — 현재 스크롤 뷰포트 세로 중앙 (크기·가로 유지)
  const bringToViewport = () => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    setBox((current) =>
      clampBox({
        ...current,
        y: scrollElement.scrollTop + Math.max((scrollElement.clientHeight - current.size) / 2, 0),
      }),
    );
  };

  ////////// 정렬 퀵버튼 — 가로 위치·전체 너비 (세로 위치는 유지)
  const alignBox = (position: 'left' | 'center' | 'right') => {
    const width = contentRef.current?.clientWidth;
    if (!width) return;
    setBox((current) =>
      clampBox({
        ...current,
        x: position === 'left' ? 0 : position === 'center' ? (width - current.size) / 2 : width - current.size,
      }),
    );
  };

  const expandFullWidth = () => {
    const width = contentRef.current?.clientWidth;
    if (!width) return;
    setBox((current) => clampBox({ x: 0, y: current.y, size: width }));
  };

  ////////// 크롭 — 표시 좌표를 각 이미지 natural 좌표로 환산해 캔버스 합성
  const handleCrop = async () => {
    const content = contentRef.current;
    if (!content) return;
    setIsCropping(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('캔버스를 사용할 수 없어요.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      for (const element of imageRefs.current) {
        if (!element || !element.complete || element.naturalWidth === 0) continue;
        const top = element.offsetTop;
        const bottom = top + element.clientHeight;
        const interTop = Math.max(box.y, top);
        const interBottom = Math.min(box.y + box.size, bottom);
        if (interBottom <= interTop) continue; // 박스와 안 겹침

        const scaleX = element.naturalWidth / element.clientWidth;
        const scaleY = element.naturalHeight / element.clientHeight;
        const sourceX = box.x * scaleX;
        const sourceY = (interTop - top) * scaleY;
        const sourceWidth = box.size * scaleX;
        const sourceHeight = (interBottom - interTop) * scaleY;
        const destY = ((interTop - box.y) / box.size) * OUTPUT_SIZE;
        const destHeight = ((interBottom - interTop) / box.size) * OUTPUT_SIZE;
        context.drawImage(element, sourceX, sourceY, sourceWidth, sourceHeight, 0, destY, OUTPUT_SIZE, destHeight);
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('이미지 생성에 실패했어요.');
      onCrop(blob);
      onClose();
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} disableScrollLock>
      <Stack spacing={1.5} sx={{ p: 2.5, width: 'min(88vw, 612px)', maxHeight: 'calc(100vh - 64px)' }}>
        {/* 헤더 */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack spacing={0.25}>
            <Typography variant="h6">상세이미지 잘라오기</Typography>
            <Typography variant="caption" color="text.secondary">
              스크롤로 훑고, 박스를 옮기거나 우하단 모서리로 크기를 조절하세요 — 1:1 정사각으로 잘려요.
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose} aria-label="닫기">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>

        {/* 박스 정렬 퀵버튼 */}
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          <Tooltip title="왼쪽 정렬">
            <IconButton size="small" color="primary" onClick={() => alignBox('left')}>
              <AlignHorizontalLeftIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="가운데 정렬">
            <IconButton size="small" color="primary" onClick={() => alignBox('center')}>
              <AlignHorizontalCenterIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="오른쪽 정렬">
            <IconButton size="small" color="primary" onClick={() => alignBox('right')}>
              <AlignHorizontalRightIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="전체 너비로">
            <IconButton size="small" color="primary" onClick={expandFullWidth}>
              <WidthFullOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="보고 있는 위치로 가져오기">
            <IconButton size="small" color="primary" onClick={bringToViewport}>
              <CenterFocusStrongOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* 이어붙인 상세 + 크롭 박스 */}
        <ScrollArea ref={scrollRef}>
          <CropContent ref={contentRef}>
            {images.map((image, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image.url}
                src={image.proxyUrl}
                alt={`상세 ${index + 1}`}
                ref={(element) => {
                  imageRefs.current[index] = element;
                }}
                draggable={false}
              />
            ))}
            <CropBox
              style={{ left: box.x, top: box.y, width: box.size, height: box.size }}
              onPointerDown={(event) => beginDrag(event, 'move')}
            >
              {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                <ResizeHandle
                  key={corner}
                  $corner={corner}
                  onPointerDown={(event) => beginDrag(event, corner)}
                />
              ))}
            </CropBox>
          </CropContent>
        </ScrollArea>

        {/* 푸터 */}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>취소</Button>
          <Button variant="contained" startIcon={<CropOutlinedIcon />} onClick={handleCrop} disabled={isCropping}>
            {isCropping ? '자르는 중…' : '잘라서 사용'}
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const ScrollArea = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0, // 플렉스 안에서 남는 높이만 차지 — Paper에 2차 스크롤바 생기는 것 방지
  overflowY: 'auto',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  scrollbarWidth: 'none', // 스크롤바 비표시 (스크롤 동작은 유지)
  '&::-webkit-scrollbar': { display: 'none' },
}));

const CropContent = styled.div({
  position: 'relative',
  margin: '0 auto',
  '& img': {
    display: 'block',
    width: '100%',
    height: 'auto',
    userSelect: 'none',
  },
});

const CropBox = styled.div(({ theme }) => ({
  position: 'absolute',
  border: `2px solid ${theme.palette.primary.main}`,
  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)', // 바깥 어둡게 — 선택 영역 강조
  cursor: 'move',
  touchAction: 'none',
}));

const ResizeHandle = styled('div', transientOptions)<{ $corner: 'nw' | 'ne' | 'sw' | 'se' }>(
  ({ theme, $corner }) => ({
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: theme.palette.primary.main,
    border: `2px solid ${theme.palette.background.paper}`,
    touchAction: 'none',
    cursor: $corner === 'nw' || $corner === 'se' ? 'nwse-resize' : 'nesw-resize',
    top: $corner === 'nw' || $corner === 'ne' ? -8 : undefined,
    bottom: $corner === 'sw' || $corner === 'se' ? -8 : undefined,
    left: $corner === 'nw' || $corner === 'sw' ? -8 : undefined,
    right: $corner === 'ne' || $corner === 'se' ? -8 : undefined,
  }),
);
