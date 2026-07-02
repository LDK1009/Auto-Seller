'use client';

//////////////////////////////////////// 배경 옵션 선택 ////////////////////////////////////////
// 투명 / 흰색 프리셋 + 커스텀 색상 선택. 선택 변경 시 완료된 결과가 재합성된다.

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import {
  BACKGROUND_PRESETS,
  type BackgroundOption,
} from '../_constants/backgroundRemoval';

type BackgroundOptionSelectorProps = {
  value: BackgroundOption;
  customColor: string;
  onChange: (option: BackgroundOption) => void;
  onCustomColorChange: (hex: string) => void;
  disabled?: boolean;
};

// 현재 선택을 토글 그룹 식별자로 변환 ('transparent' | 프리셋 hex | 'custom')
function toSelectionKey(value: BackgroundOption): string {
  if (value.kind === 'transparent') return 'transparent';
  const preset = BACKGROUND_PRESETS.find(
    (item) => item.option.kind === 'color' && item.option.hex === value.hex,
  );
  return preset ? value.hex : 'custom';
}

export default function BackgroundOptionSelector({
  value,
  customColor,
  onChange,
  onCustomColorChange,
  disabled = false,
}: BackgroundOptionSelectorProps) {
  const selectionKey = toSelectionKey(value);

  ////////////////////// 토글 선택 //////////////////////
  const handleToggle = (_event: React.MouseEvent, key: string | null) => {
    if (key === null) return;
    if (key === 'transparent') {
      onChange({ kind: 'transparent' });
    } else if (key === 'custom') {
      onChange({ kind: 'color', hex: customColor });
    } else {
      onChange({ kind: 'color', hex: key });
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        배경 옵션
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={selectionKey}
          onChange={handleToggle}
          disabled={disabled}
        >
          {BACKGROUND_PRESETS.map((preset) => (
            <ToggleButton
              key={preset.option.kind === 'color' ? preset.option.hex : 'transparent'}
              value={preset.option.kind === 'color' ? preset.option.hex : 'transparent'}
            >
              {preset.label}
            </ToggleButton>
          ))}
          <ToggleButton value="custom">직접 선택</ToggleButton>
        </ToggleButtonGroup>

        {/* 커스텀 색상 선택 시에만 컬러 피커 노출 */}
        {selectionKey === 'custom' && (
          <input
            type="color"
            value={customColor}
            disabled={disabled}
            onChange={(event) => {
              onCustomColorChange(event.target.value);
              onChange({ kind: 'color', hex: event.target.value });
            }}
            aria-label="배경 색상 선택"
          />
        )}
      </Stack>
    </Stack>
  );
}
