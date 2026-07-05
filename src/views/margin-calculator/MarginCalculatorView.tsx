'use client';

//////////////////////////////////////// 마진 계산기 화면 ////////////////////////////////////////
// 판매가·원가·수수료·배송비 입력 → 순이익·마진율 실시간 계산 (순수 클라이언트).

import { useState } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import { FEE_PRESETS, FEE_DISCLAIMER } from './_constants/marginCalculator';
import { calculateMargin, type MarginInput } from './_utils/calculateMargin';
import MarginResultPanel from './_components/MarginResultPanel';

// 숫자 입력 파싱 (빈 값·비정상 입력은 0)
function parseAmount(raw: string): number {
  const value = Number(raw.replaceAll(',', ''));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export default function MarginCalculatorView() {
  // 입력값 (순수 UI 상태 — 계산은 util)
  const [input, setInput] = useState<MarginInput>({
    sellingPrice: 0,
    costPrice: 0,
    feeRate: FEE_PRESETS[0].rate,
    shippingCharge: 0,
    shippingCost: 0,
    otherCost: 0,
  });

  const result = calculateMargin(input);
  const updateInput = (patch: Partial<MarginInput>) => setInput((prev) => ({ ...prev, ...patch }));

  return (
    <PageLayout
      title="마진 계산기"
      description="판매가·원가·수수료·배송비를 넣으면 개당 순이익과 마진율을 바로 계산합니다."
      maxWidth="md"
      help={
        <HelpPanel storageKey="margin-calculator">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 판매가와 원가(매입가)를 입력합니다</Typography>
            <Typography variant="body2">② 마켓 칩을 누르면 대략 수수료율이 채워집니다 — 직접 수정 가능</Typography>
            <Typography variant="body2">③ 배송비(받는/나가는)와 기타 비용까지 넣으면 순이익·마진율이 실시간 계산됩니다</Typography>
            <Typography variant="caption" color="text.secondary">
              {FEE_DISCLAIMER}
            </Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Layout>
        {/* 입력 패널 */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Typography variant="subtitle2" color="text.secondary">
              판매 정보
            </Typography>
            <AmountField
              label="판매가"
              value={input.sellingPrice}
              onChange={(value) => updateInput({ sellingPrice: value })}
            />
            <AmountField
              label="원가 (매입가)"
              value={input.costPrice}
              onChange={(value) => updateInput({ costPrice: value })}
            />

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
          <MarginResultPanel result={result} />
        </Paper>
      </Layout>
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
