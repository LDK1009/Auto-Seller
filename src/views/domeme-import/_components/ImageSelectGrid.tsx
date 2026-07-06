'use client';

//////////////////////////////////////// 상품 이미지 선택 그리드 ////////////////////////////////////////
// 대표이미지 + 상세설명 이미지를 썸네일로 나열하고 체크 선택한다. 기본 선택은 대표이미지만.

import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { DomemeItemImage } from '@/shared/types/domeme';

type ImageSelectGridProps = {
  images: DomemeItemImage[];
  selectedUrls: Set<string>;
  onToggle: (url: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
};

export default function ImageSelectGrid({
  images,
  selectedUrls,
  onToggle,
  onSelectAll,
  onClearAll,
}: ImageSelectGridProps) {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          이미지 선택 ({selectedUrls.size}/{images.length})
        </Typography>
        <Button size="small" onClick={onSelectAll}>
          전체 선택
        </Button>
        <Button size="small" onClick={onClearAll}>
          전체 해제
        </Button>
      </Stack>

      <Grid>
        {images.map((image) => {
          const isSelected = selectedUrls.has(image.url);
          return (
            <Cell key={image.url} type="button" $isSelected={isSelected} onClick={() => onToggle(image.url)}>
              {/* 프록시 경유(같은 출처) 썸네일 — 외부 URL 직접 로드 시 CORS·핫링크 문제 */}
              <Thumb src={image.proxyUrl} alt="" loading="lazy" />
              {image.kind === 'thumb' && <KindChip size="small" label="대표" color="primary" />}
              {isSelected && <SelectedIcon color="primary" />}
            </Cell>
          );
        })}
      </Grid>
    </Stack>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Grid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
  gap: theme.spacing(1),
}));

const Cell = styled.button<{ $isSelected: boolean }>(({ theme, $isSelected }) => ({
  position: 'relative',
  aspectRatio: '1',
  padding: 0,
  overflow: 'hidden',
  cursor: 'pointer',
  borderRadius: theme.shape.borderRadius,
  border: $isSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
}));

const Thumb = styled.img({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

const KindChip = styled(Chip)({
  position: 'absolute',
  top: 4,
  left: 4,
});

const SelectedIcon = styled(CheckCircleIcon)({
  position: 'absolute',
  right: 4,
  bottom: 4,
  backgroundColor: '#fff',
  borderRadius: '50%',
});
