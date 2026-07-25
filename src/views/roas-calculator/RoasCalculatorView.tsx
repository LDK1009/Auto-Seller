'use client';

//////////////////////////////////////// ROAS 계산기 화면 ////////////////////////////////////////
// 손익분기 ROAS(광고가 적자로 넘어가는 지점)와 광고 손익 시뮬레이션 (순수 클라이언트).

import { useState } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import { calculateRoas, type RoasInput } from './_utils/calculateRoas';

// 숫자 입력 파싱 (빈 값·비정상 입력은 0)
function parseAmount(raw: string): number {
  const value = Number(raw.replaceAll(',', ''));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

const KRW = (value: number) => `${Math.round(value).toLocaleString()}원`;

export default function RoasCalculatorView() {
  const [input, setInput] = useState<RoasInput>({
    sellingPrice: 0,
    profitPerUnit: 0,
    adSpend: 0,
    adRevenue: 0,
  });

  const result = calculateRoas(input);
  const updateInput = (patch: Partial<RoasInput>) => setInput((prev) => ({ ...prev, ...patch }));

  return (
    <PageLayout
      title="광고 손익"
      description="내 마진 기준으로 광고가 적자로 넘어가는 손익분기 ROAS를 계산해요."
      maxWidth="md"
      help={
        <HelpPanel storageKey="roas-calculator">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 판매가와 개당 순이익을 입력하세요</Typography>
            <Typography variant="body2">② 손익분기 ROAS를 확인하세요</Typography>
            <Typography variant="body2">③ 광고비와 광고 매출을 넣으면 광고 손익이 계산돼요</Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Layout>
        {/* 입력 패널 */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Typography variant="subtitle2" color="text.secondary">
              상품 수익 구조
            </Typography>
            <AmountField
              label="판매가"
              value={input.sellingPrice}
              onChange={(value) => updateInput({ sellingPrice: value })}
            />
            <AmountField
              label="개당 순이익 (마진 계산기 결과)"
              value={input.profitPerUnit}
              onChange={(value) => updateInput({ profitPerUnit: value })}
            />

            <Typography variant="subtitle2" color="text.secondary">
              광고 시뮬레이션 (선택)
            </Typography>
            <AmountField
              label="광고비"
              value={input.adSpend}
              onChange={(value) => updateInput({ adSpend: value })}
            />
            <AmountField
              label="광고 매출 (광고로 발생한 매출)"
              value={input.adRevenue}
              onChange={(value) => updateInput({ adRevenue: value })}
            />
          </Stack>
        </Paper>

        {/* 결과 패널 */}
        <Paper variant="outlined" sx={{ p: 3, alignSelf: 'start', position: 'sticky', top: 88 }}>
          <Stack spacing={2}>
            <ResultBox>
              <Typography variant="caption" color="text.secondary">
                손익분기 ROAS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {result.breakEvenRoas !== null ? `${Math.round(result.breakEvenRoas)}%` : '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                광고 ROAS가 이 값보다 낮으면 광고는 적자예요
              </Typography>
            </ResultBox>

            {result.currentRoas !== null && (
              <>
                <Divider />
                <Stack spacing={1}>
                  <Row label="현재 ROAS" value={`${Math.round(result.currentRoas)}%`} />
                  <Row
                    label="광고 손익"
                    value={result.adProfit !== null ? KRW(result.adProfit) : '—'}
                    valueColor={result.isProfitable ? 'success.main' : 'error.main'}
                  />
                </Stack>
              </>
            )}
          </Stack>
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

//////////////////// 결과 행 ////////////////////
type RowProps = { label: string; value: string; valueColor?: string };

function Row({ label, value, valueColor }: RowProps) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: valueColor }}>
        {value}
      </Typography>
    </Stack>
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

const ResultBox = styled.div(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  textAlign: 'center',
}));
