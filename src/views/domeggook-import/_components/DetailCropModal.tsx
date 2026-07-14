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
import CloseIcon from '@mui/icons-material/Close';
import CropOutlinedIcon from '@mui/icons-material/CropOutlined';
import type { DomeggookItemImage } from '@/shared/types/domeggook';

const OUTPUT_SIZE = 1000; // 스마트스토어 권장 1000×1000
const MIN_BOX_SIZE = 60;

type DetailCropModalProps = {
  open: boolean;
  images: DomeggookItemImage[]; // 세로로 이어붙일 이미지들 (상세)
  onClose: () => void;
  onCrop: (blob: Blob) => void;
};

type DragState =
  | { mode: 'move'; startX: number; startY: number; boxX: number; boxY: number }
  | { mode: 'resize'; startX: number; startY: number; boxSize: number };

export default function DetailCropModal({ open, images, onClose, onCrop }: DetailCropModalProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const [box, setBox] = useState({ x: 0, y: 0, size: 240 });
  const dragRef = useRef<DragState | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  ////////// 열릴 때 기본 박스 = 콘텐츠 최대 너비 × 1:1 (좌상단)
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const width = contentRef.current?.clientWidth;
      if (width) setBox({ x: 0, y: 0, size: width });
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

  ////////// 드래그 (이동·리사이즈 공용 — window 리스너는 시작 시 1회 부착)
  const beginDrag = (event: React.PointerEvent, mode: 'move' | 'resize') => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current =
      mode === 'move'
        ? { mode, startX: event.clientX, startY: event.clientY, boxX: box.x, boxY: box.y }
        : { mode, startX: event.clientX, startY: event.clientY, boxSize: box.size };

    const handleMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaX = moveEvent.clientX - drag.startX;
      const deltaY = moveEvent.clientY - drag.startY;
      if (drag.mode === 'move') {
        setBox((current) => clampBox({ ...current, x: drag.boxX + deltaX, y: drag.boxY + deltaY }));
      } else {
        setBox((current) => clampBox({ ...current, size: drag.boxSize + Math.max(deltaX, deltaY) }));
      }
    };
    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
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
      if (!context) throw new Error('캔버스를 사용할 수 없습니다.');
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
      if (!blob) throw new Error('이미지 생성에 실패했습니다.');
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
      <Stack spacing={1.5} sx={{ p: 2.5, width: 'min(88vw, 760px)' }}>
        {/* 헤더 */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack spacing={0.25}>
            <Typography variant="h6">상세에서 잘라오기</Typography>
            <Typography variant="caption" color="text.secondary">
              스크롤로 훑고, 박스를 옮기거나 우하단 모서리로 크기를 조절하세요 — 1:1 정사각으로 잘립니다.
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose} aria-label="닫기">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>

        {/* 이어붙인 상세 + 크롭 박스 */}
        <ScrollArea>
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
              <ResizeHandle onPointerDown={(event) => beginDrag(event, 'resize')} />
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
  maxHeight: '64vh',
  overflowY: 'auto',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  scrollbarWidth: 'thin',
  '&::-webkit-scrollbar': { width: 6 },
  '&::-webkit-scrollbar-thumb': { backgroundColor: theme.palette.divider, borderRadius: 3 },
}));

const CropContent = styled.div({
  position: 'relative',
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

const ResizeHandle = styled.div(({ theme }) => ({
  position: 'absolute',
  right: -8,
  bottom: -8,
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  border: `2px solid ${theme.palette.background.paper}`,
  cursor: 'nwse-resize',
  touchAction: 'none',
}));
