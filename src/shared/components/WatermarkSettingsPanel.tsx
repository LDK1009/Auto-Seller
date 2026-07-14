'use client';

//////////////////////////////////////// 워터마크 설정 패널 ////////////////////////////////////////
// 타입(텍스트/로고), 내용·색상/로고 업로드, 위치(3×3), 투명도·크기.

import { useRef } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  POSITION_GRID,
  type WatermarkSettings,
  type WatermarkType,
} from '@/shared/constants/watermark';

type WatermarkSettingsPanelProps = {
  settings: WatermarkSettings;
  onChange: (patch: Partial<WatermarkSettings>) => void;
  onLogoSelect: (file: File) => void;
  disabled?: boolean;
};

export default function WatermarkSettingsPanel({
  settings,
  onChange,
  onLogoSelect,
  disabled = false,
}: WatermarkSettingsPanelProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  return (
    <Stack spacing={2}>
      {/* 타입 선택 */}
      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">
          워터마크 종류
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={settings.type}
          disabled={disabled}
          onChange={(_event, value: WatermarkType | null) => {
            if (value) onChange({ type: value });
          }}
        >
          <ToggleButton value="text">텍스트</ToggleButton>
          <ToggleButton value="logo">로고 이미지</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* 텍스트 설정 */}
      {settings.type === 'text' && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          <TextField
            size="small"
            label="워터마크 문구"
            value={settings.text}
            disabled={disabled}
            onChange={(event) => onChange({ text: event.target.value })}
            sx={{ minWidth: 240 }}
          />
          <ColorLabel>
            <Typography variant="caption" color="text.secondary">
              글자 색
            </Typography>
            <ColorInput
              type="color"
              value={settings.textColor}
              disabled={disabled}
              onChange={(event) => onChange({ textColor: event.target.value })}
              aria-label="글자 색 선택"
            />
          </ColorLabel>
        </Stack>
      )}

      {/* 로고 설정 */}
      {settings.type === 'logo' && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadFileIcon />}
            disabled={disabled}
            onClick={() => logoInputRef.current?.click()}
          >
            로고 업로드
          </Button>
          <Typography variant="caption" color={settings.logoName ? 'text.primary' : 'text.secondary'}>
            {settings.logoName || '투명 배경 PNG 로고 권장'}
          </Typography>
          <HiddenInput
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onLogoSelect(file);
              event.target.value = '';
            }}
          />
        </Stack>
      )}

      {/* 위치 (3×3) */}
      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">
          위치
        </Typography>
        <PositionGrid>
          {POSITION_GRID.map(({ position, label }) => (
            <Tooltip key={position} title={label}>
              <PositionTile
                type="button"
                $isSelected={settings.position === position}
                disabled={disabled}
                onClick={() => onChange({ position })}
                aria-label={label}
              >
                <PositionDot $isSelected={settings.position === position} />
              </PositionTile>
            </Tooltip>
          ))}
        </PositionGrid>
      </Stack>

      {/* 투명도·크기 */}
      <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }} useFlexGap>
        <SliderWrap>
          <Typography variant="caption" color="text.secondary">
            투명도 {Math.round(settings.opacity * 100)}%
          </Typography>
          <Slider
            size="small"
            min={0.1}
            max={1}
            step={0.05}
            value={settings.opacity}
            disabled={disabled}
            onChange={(_event, value) => onChange({ opacity: value as number })}
          />
        </SliderWrap>
        <SliderWrap>
          <Typography variant="caption" color="text.secondary">
            크기 {Math.round(settings.scale * 100)}%
          </Typography>
          <Slider
            size="small"
            min={0.05}
            max={0.5}
            step={0.01}
            value={settings.scale}
            disabled={disabled}
            onChange={(_event, value) => onChange({ scale: value as number })}
          />
        </SliderWrap>
      </Stack>
    </Stack>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
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

const HiddenInput = styled.input({
  display: 'none',
});

const PositionGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 30px)',
  gap: theme.spacing(0.5),
}));

const PositionTile = styled.button<{ $isSelected: boolean }>(({ theme, $isSelected }) => ({
  width: 30,
  height: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  cursor: 'pointer',
  backgroundColor: $isSelected ? theme.palette.action.selected : theme.palette.background.default,
  border: `2px solid ${$isSelected ? theme.palette.primary.main : theme.palette.divider}`,
}));

const PositionDot = styled.span<{ $isSelected: boolean }>(({ theme, $isSelected }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: $isSelected ? theme.palette.primary.main : theme.palette.text.disabled,
}));

const SliderWrap = styled.div({
  width: 220,
});
