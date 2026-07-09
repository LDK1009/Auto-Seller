'use client';

//////////////////////////////////////// 마진 계산기 화면 ////////////////////////////////////////
// 두 모드 (순수 클라이언트):
// - 순이익 계산: 판매가·원가·수수료·배송비 → 순이익·마진율
// - 판매가 역산: 원가·목표 마진율 → 목표를 지키는 최소 판매가

import { useState } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import { FEE_PRESETS, FEE_DISCLAIMER, TARGET_MARGIN_PRESETS } from '@/shared/constants/marketFees';
import { calculateMargin, calculateReversePrice, type MarginInput } from '@/shared/utils/marginCalculation';
import MarginResultPanel from './_components/MarginResultPanel';
import ReversePricePanel from './_components/ReversePricePanel';

type CalculatorMode = 'forward' | 'reverse';

// 숫자 입력 파싱 (빈 값·비정상 입력은 0)
function parseAmount(raw: string): number {
  const value = Number(raw.replaceAll(',', ''));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export default function MarginCalculatorView() {
  // 계산 모드 (순수 UI 상태)
  const [mode, setMode] = useState<CalculatorMode>('forward');

  // 입력값 (순수 UI 상태 — 계산은 util)
  const [input, setInput] = useState<MarginInput>({
    sellingPrice: 0,
    costPrice: 0,
    feeRate: FEE_PRESETS[0].rate,
    shippingCharge: 0,
    shippingCost: 0,
    otherCost: 0,
  });
  const [targetMarginRate, setTargetMarginRate] = useState(TARGET_MARGIN_PRESETS[2]); // 기본 20%

  const updateInput = (patch: Partial<MarginInput>) => setInput((prev) => ({ ...prev, ...patch }));

  const forwardResult = calculateMargin(input);
  const reverseResult = calculateReversePrice({
    costPrice: input.costPrice,
    targetMarginRate,
    feeRate: input.feeRate,
    shippingCharge: input.shippingCharge,
    shippingCost: input.shippingCost,
    otherCost: input.otherCost,
  });

  return (
    <PageLayout
      title="마진 계산"
      description="판매가로 순이익을 확인하거나, 목표 마진율로 최소 판매가를 역산합니다."
      maxWidth="md"
      help={
        <HelpPanel storageKey="margin-calculator">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 모드를 고릅니다 — 순이익 계산 또는 판매가 역산</Typography>
            <Typography variant="body2">
              ② 순이익 계산: 판매가·원가를 넣으면 순이익·마진율이 실시간 계산됩니다
            </Typography>
            <Typography variant="body2">
              ③ 판매가 역산: 원가(공급가)와 목표 마진율을 넣으면 그 마진을 지키는 최소 판매가를 알려줍니다
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {FEE_DISCLAIMER}
            </Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3}>
        {/* 모드 전환 */}
        <ToggleButtonGroup
          exclusive
          value={mode}
          onChange={(_, next: CalculatorMode | null) => {
            if (next) setMode(next);
          }}
          size="small"
          color="primary"
        >
          <ToggleButton value="forward">순이익 계산</ToggleButton>
          <ToggleButton value="reverse">판매가 역산</ToggleButton>
        </ToggleButtonGroup>

        <Layout>
          {/* 입력 패널 */}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <Typography variant="subtitle2" color="text.secondary">
                {mode === 'forward' ? '판매 정보' : '원가·목표 마진'}
              </Typography>

              {mode === 'forward' && (
                <AmountField
                  label="판매가"
                  value={input.sellingPrice}
                  onChange={(value) => updateInput({ sellingPrice: value })}
                />
              )}
              <AmountField
                label="원가 (매입가·공급가)"
                value={input.costPrice}
                onChange={(value) => updateInput({ costPrice: value })}
              />

              {mode === 'reverse' && (
                <>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                    {TARGET_MARGIN_PRESETS.map((rate) => (
                      <Chip
                        key={rate}
                        label={`마진 ${rate}%`}
                        color={targetMarginRate === rate ? 'primary' : 'default'}
                        variant={targetMarginRate === rate ? 'filled' : 'outlined'}
                        onClick={() => setTargetMarginRate(rate)}
                      />
                    ))}
                  </Stack>
                  <TextField
                    size="small"
                    type="number"
                    label="목표 마진율 (판매가 기준)"
                    value={targetMarginRate}
                    onChange={(event) => setTargetMarginRate(parseAmount(event.target.value))}
                    slotProps={{
                      input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                    }}
                  />
                </>
              )}

              <Typography variant="subtitle2" color="text.secondary">
                마켓 수수료
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                {FEE_PRESETS.map((preset) => (
                  <Chip
                    key={preset.key}
                    label={`${preset.label} ${preset.rate}%`}
                    color={input.feeRate === preset.rate ? 'primary' : 'default'}
                    variant={input.feeRate === preset.rate ? 'filled' : 'outlined'}
                    onClick={() => updateInput({ feeRate: preset.rate })}
                  />
                ))}
              </Stack>
              <TextField
                size="small"
                type="number"
                label="수수료율"
                value={input.feeRate}
                onChange={(event) => updateInput({ feeRate: parseAmount(event.target.value) })}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                }}
              />

              <Typography variant="subtitle2" color="text.secondary">
                배송·기타
              </Typography>
              <AmountField
                label="고객에게 받는 배송비"
                value={input.shippingCharge}
                onChange={(value) => updateInput({ shippingCharge: value })}
              />
              <AmountField
                label="실제 나가는 배송비"
                value={input.shippingCost}
                onChange={(value) => updateInput({ shippingCost: value })}
              />
              <AmountField
                label="기타 비용 (포장재·광고 등)"
                value={input.otherCost}
                onChange={(value) => updateInput({ otherCost: value })}
              />
            </Stack>
          </Paper>

          {/* 결과 패널 */}
          <Paper variant="outlined" sx={{ p: 3, alignSelf: 'start', position: 'sticky', top: 88 }}>
            {mode === 'forward' ? (
              <MarginResultPanel result={forwardResult} />
            ) : (
              <ReversePricePanel result={reverseResult} targetMarginRate={targetMarginRate} />
            )}
          </Paper>
        </Layout>
      </Stack>
    </PageLayout>
  );
}

//////////////////// 금액 입력 필드 ////////////////////
type AmountFieldProps = { label: string; value: number; onChange: (value: number) => void };

function AmountField({ label, value, onChange }: AmountFieldProps) {
  return (
    <TextField
      size="small"
      type="number"
      label={label}
      value={value === 0 ? '' : value}
      placeholder="0"
      onChange={(event) => onChange(parseAmount(event.target.value))}
      slotProps={{
        input: { endAdornment: <InputAdornment position="end">원</InputAdornment> },
      }}
    />
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Layout = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: theme.spacing(3),
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
  },
}));
