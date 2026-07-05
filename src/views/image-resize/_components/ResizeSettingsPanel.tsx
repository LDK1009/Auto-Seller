'use client';

//////////////////////////////////////// 규격 설정 패널 ////////////////////////////////////////
// 마켓 프리셋 / 커스텀 크기 / 맞춤 방식(여백·크롭) / 여백 색 / 출력 포맷·품질.

import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Slider from '@mui/material/Slider';
import {
  SIZE_PRESETS,
  FORMAT_OPTIONS,
  MIN_DIMENSION,
  MAX_DIMENSION,
  type ResizeSettings,
  type ResizeFitMode,
  type OutputFormat,
} from '../_constants/imageResize';

type ResizeSettingsPanelProps = {
  settings: ResizeSettings;
  onChange: (patch: Partial<ResizeSettings>) => void;
  disabled?: boolean;
};

// 크기 입력값 보정 (범위 밖 방지)
function clampDimension(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return MIN_DIMENSION;
  return Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, Math.round(value)));
}

export default function ResizeSettingsPanel({ settings, onChange, disabled = false }: ResizeSettingsPanelProps) {
  const showQuality = settings.format !== 'image/png';

  return (
    <Stack spacing={2}>
      {/* 크기 프리셋 + 커스텀 */}
      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">
          목표 크기
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {SIZE_PRESETS.map((preset) => {
            const isSelected = settings.width === preset.width && settings.height === preset.height;
            return (
              <Chip
                key={preset.key}
                label={preset.label}
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                disabled={disabled}
                onClick={() => onChange({ width: preset.width, height: preset.height })}
              />
            );
          })}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <SizeField
            size="small"
            type="number"
            label="가로(px)"
            value={settings.width}
            disabled={disabled}
            onChange={(event) => onChange({ width: clampDimension(event.target.value) })}
          />
          <Typography variant="body2" color="text.secondary">
            ×
          </Typography>
          <SizeField
            size="small"
            type="number"
            label="세로(px)"
            value={settings.height}
            disabled={disabled}
            onChange={(event) => onChange({ height: clampDimension(event.target.value) })}
          />
        </Stack>
      </Stack>

      {/* 맞춤 방식 + 여백 색 */}
      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">
          맞춤 방식
        </Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={settings.fit}
            disabled={disabled}
            onChange={(_event, value: ResizeFitMode | null) => {
              if (value) onChange({ fit: value });
            }}
          >
            <ToggleButton value="contain">여백 맞춤 (전체 보존)</ToggleButton>
            <ToggleButton value="cover">꽉 채움 (중앙 크롭)</ToggleButton>
          </ToggleButtonGroup>

          {/* 여백/배경 색 (contain 또는 JPG일 때 사용됨) */}
          <ColorLabel>
            <Typography variant="caption" color="text.secondary">
              여백 색
            </Typography>
            <ColorInput
              type="color"
              value={settings.backgroundColor}
              disabled={disabled}
              onChange={(event) => onChange({ backgroundColor: event.target.value })}
              aria-label="여백 색 선택"
            />
          </ColorLabel>
        </Stack>
      </Stack>

      {/* 출력 포맷 + 품질 */}
      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">
          출력 포맷
        </Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={settings.format}
            disabled={disabled}
            onChange={(_event, value: OutputFormat | null) => {
              if (value) onChange({ format: value });
            }}
          >
            {FORMAT_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {showQuality && (
            <QualityWrap>
              <Typography variant="caption" color="text.secondary">
                품질 {Math.round(settings.quality * 100)}%
              </Typography>
              <Slider
                size="small"
                min={0.5}
                max={1}
                step={0.05}
                value={settings.quality}
                disabled={disabled}
                onChange={(_event, value) => onChange({ quality: value as number })}
              />
            </QualityWrap>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const SizeField = styled(TextField)({
  width: 120,
});

const ColorLabel = styled.label(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const ColorInput = styled.input({
  width: 36,
  height: 28,
  padding: 0,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
});

const QualityWrap = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minWidth: 220,
});
