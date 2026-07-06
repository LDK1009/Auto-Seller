'use client';

//////////////////////////////////////// 브랜드 톤 A/B 토글 (개발 전용) ////////////////////////////////////////
// L-3 인디고 톤 튜닝 결정용 — 실화면에서 A/B를 즉시 전환해 비교한다.
// 프로덕션 빌드에는 렌더되지 않으며, 확정 후 이 컴포넌트와 B안 토큰을 정리한다.

import styled from '@emotion/styled';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { PRIMARY_VARIANTS, type PrimaryVariantKey } from './theme';

type ThemeVariantToggleProps = {
  variant: PrimaryVariantKey;
  onChange: (variant: PrimaryVariantKey) => void;
};

export default function ThemeVariantToggle({ variant, onChange }: ThemeVariantToggleProps) {
  return (
    <FloatingBox>
      <Typography variant="caption" color="text.secondary">
        브랜드 톤 비교 (개발용)
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={variant}
        onChange={(_, next: PrimaryVariantKey | null) => {
          if (next) onChange(next);
        }}
      >
        {(Object.keys(PRIMARY_VARIANTS) as PrimaryVariantKey[]).map((key) => (
          <ToggleButton key={key} value={key}>
            <Swatch style={{ backgroundColor: PRIMARY_VARIANTS[key].main }} />
            {PRIMARY_VARIANTS[key].label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </FloatingBox>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const FloatingBox = styled.div(({ theme }) => ({
  position: 'fixed',
  right: theme.spacing(2),
  bottom: theme.spacing(2),
  zIndex: theme.zIndex.tooltip,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  padding: theme.spacing(1, 1.5),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[4],
}));

const Swatch = styled.span(({ theme }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  marginRight: theme.spacing(0.75),
  display: 'inline-block',
}));
