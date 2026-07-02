'use client';

//////////////////////////////////////// 커스텀 색상 선택 팝오버 ////////////////////////////////////////
// 상단: 색상 팔레트(react-colorful) / 중단: 셀러 추천 색상 / 하단: 패턴(단색·그라데이션·줄무늬·체크).
// 팔레트 드래그는 연속 발생하므로 디바운스 후 일괄 재합성한다(완료 이미지 전체 재합성 비용 보호).

import { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { HexColorPicker } from 'react-colorful';
import {
  PATTERN_OPTIONS,
  SELLER_RECOMMENDED_COLORS,
  GRADIENT_DIRECTIONS,
  DEFAULT_GRADIENT_DIRECTION,
  type BackgroundOption,
  type PatternKind,
  type GradientDirection,
} from '../_constants/backgroundRemoval';

const APPLY_DEBOUNCE_MS = 400;

// 그라데이션 방향 → CSS 방향 키워드
const CSS_DIRECTION: Record<GradientDirection, string> = {
  top: 'to top',
  'top-right': 'to top right',
  right: 'to right',
  'bottom-right': 'to bottom right',
  bottom: 'to bottom',
  'bottom-left': 'to bottom left',
  left: 'to left',
  'top-left': 'to top left',
};

// 방향 화살표 표시용
const DIRECTION_ARROWS: Record<GradientDirection, string> = {
  'top-left': '↖',
  top: '↑',
  'top-right': '↗',
  left: '←',
  right: '→',
  'bottom-left': '↙',
  bottom: '↓',
  'bottom-right': '↘',
};

////////// 패턴 미리보기 CSS (팝오버 타일·모달 스와치 공용)
export function getPatternPreviewCss(
  hex: string,
  pattern: PatternKind,
  gradientDirection: GradientDirection = DEFAULT_GRADIENT_DIRECTION,
): string {
  switch (pattern) {
    case 'gradient':
      return `linear-gradient(${CSS_DIRECTION[gradientDirection]}, ${hex}, #FFFFFF)`;
    case 'stripes-vertical':
      return `repeating-linear-gradient(90deg, ${hex} 0 4px, #FFFFFF 4px 8px)`;
    case 'stripes-horizontal':
      return `repeating-linear-gradient(0deg, ${hex} 0 4px, #FFFFFF 4px 8px)`;
    case 'check':
      return `repeating-conic-gradient(${hex} 0% 25%, #FFFFFF 0% 50%) 50% / 12px 12px`;
    case 'solid':
    default:
      return hex;
  }
}

type ColorPickerPopoverProps = {
  anchorEl: HTMLElement | null; // null이면 닫힘
  value: BackgroundOption;
  customColor: string;
  onChange: (option: BackgroundOption) => void;
  onCustomColorChange: (hex: string) => void;
  onClose: () => void;
};

export default function ColorPickerPopover({
  anchorEl,
  value,
  customColor,
  onChange,
  onCustomColorChange,
  onClose,
}: ColorPickerPopoverProps) {
  // 현재 패턴·그라데이션 방향 (색상 옵션이 아니면 기본값)
  const currentPattern: PatternKind = value.kind === 'color' ? value.pattern ?? 'solid' : 'solid';
  const currentDirection: GradientDirection =
    value.kind === 'color' ? value.gradientDirection ?? DEFAULT_GRADIENT_DIRECTION : DEFAULT_GRADIENT_DIRECTION;

  // 팔레트 드래그 디바운스 적용 타이머
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    };
  }, []);

  ////////// 팔레트 드래그: 스와치는 즉시, 재합성은 디바운스
  const handlePaletteChange = (hex: string) => {
    onCustomColorChange(hex);
    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    applyTimerRef.current = setTimeout(() => {
      onChange({ kind: 'color', hex, pattern: currentPattern, gradientDirection: currentDirection });
    }, APPLY_DEBOUNCE_MS);
  };

  ////////// 추천 색상: 즉시 적용
  const handleRecommendedClick = (hex: string) => {
    onCustomColorChange(hex);
    onChange({ kind: 'color', hex, pattern: currentPattern, gradientDirection: currentDirection });
  };

  ////////// 패턴: 현재 색으로 즉시 적용
  const handlePatternClick = (pattern: PatternKind) => {
    onChange({ kind: 'color', hex: customColor, pattern, gradientDirection: currentDirection });
  };

  ////////// 그라데이션 방향: 즉시 적용
  const handleDirectionClick = (direction: GradientDirection) => {
    onChange({ kind: 'color', hex: customColor, pattern: 'gradient', gradientDirection: direction });
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Body spacing={1.5}>
        {/* 색상 팔레트 */}
        <PickerWrap>
          <HexColorPicker color={customColor} onChange={handlePaletteChange} />
        </PickerWrap>

        {/* 셀러 추천 색상 */}
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            추천 색상
          </Typography>
          <SwatchRow>
            {SELLER_RECOMMENDED_COLORS.map(({ hex, label }) => (
              <Tooltip key={hex} title={label}>
                <Swatch
                  type="button"
                  $isSelected={value.kind === 'color' && value.hex.toUpperCase() === hex.toUpperCase()}
                  style={{ backgroundColor: hex }}
                  onClick={() => handleRecommendedClick(hex)}
                  aria-label={label}
                />
              </Tooltip>
            ))}
          </SwatchRow>
        </Stack>

        {/* 패턴 */}
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            패턴
          </Typography>
          <SwatchRow>
            {PATTERN_OPTIONS.map(({ pattern, label }) => (
              <Tooltip key={pattern} title={label}>
                <PatternTile
                  type="button"
                  $isSelected={value.kind === 'color' && currentPattern === pattern}
                  style={{ background: getPatternPreviewCss(customColor, pattern, currentDirection) }}
                  onClick={() => handlePatternClick(pattern)}
                  aria-label={label}
                />
              </Tooltip>
            ))}
          </SwatchRow>
        </Stack>

        {/* 그라데이션 방향 (그라데이션 선택 시에만) */}
        {value.kind === 'color' && currentPattern === 'gradient' && (
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              그라데이션 방향
            </Typography>
            <SwatchRow>
              {GRADIENT_DIRECTIONS.map(({ direction, label }) => (
                <Tooltip key={direction} title={label}>
                  <DirectionTile
                    type="button"
                    $isSelected={currentDirection === direction}
                    onClick={() => handleDirectionClick(direction)}
                    aria-label={label}
                  >
                    {DIRECTION_ARROWS[direction]}
                  </DirectionTile>
                </Tooltip>
              ))}
            </SwatchRow>
          </Stack>
        )}
      </Body>
    </Popover>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Body = styled(Stack)(({ theme }) => ({
  padding: theme.spacing(2),
  width: 260,
}));

const PickerWrap = styled.div({
  // react-colorful 기본(200px)을 팝오버 폭에 맞춤
  '& .react-colorful': {
    width: '100%',
    height: 180,
  },
});

const SwatchRow = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.75),
}));

const Swatch = styled.button<{ $isSelected: boolean }>(({ theme, $isSelected }) => ({
  width: 26,
  height: 26,
  padding: 0,
  borderRadius: 6,
  cursor: 'pointer',
  border: `2px solid ${$isSelected ? theme.palette.primary.main : theme.palette.divider}`,
}));

const PatternTile = styled.button<{ $isSelected: boolean }>(({ theme, $isSelected }) => ({
  width: 38,
  height: 30,
  padding: 0,
  borderRadius: 6,
  cursor: 'pointer',
  border: `2px solid ${$isSelected ? theme.palette.primary.main : theme.palette.divider}`,
}));

const DirectionTile = styled.button<{ $isSelected: boolean }>(({ theme, $isSelected }) => ({
  width: 26,
  height: 26,
  padding: 0,
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  color: $isSelected ? theme.palette.primary.main : theme.palette.text.secondary,
  backgroundColor: $isSelected ? theme.palette.action.selected : theme.palette.background.default,
  border: `2px solid ${$isSelected ? theme.palette.primary.main : theme.palette.divider}`,
}));
