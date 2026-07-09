'use client';

//////////////////////////////////////// 부가세 간이 계산기 화면 ////////////////////////////////////////
// 간이/일반 과세 유형별 부가세 납부 예상액 (순수 클라이언트 — 대략 계산, 신고 기준은 홈택스).

import { useState } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import { calculateVat, SIMPLIFIED_EXEMPT_THRESHOLD, type VatInput, type VatTaxType } from './_utils/calculateVat';

// 숫자 입력 파싱 (빈 값·비정상 입력은 0)
function parseAmount(raw: string): number {
  const value = Number(raw.replaceAll(',', ''));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

const KRW = (value: number) => `${Math.round(value).toLocaleString()}원`;

export default function VatCalculatorView() {
  const [input, setInput] = useState<VatInput>({
    taxType: 'simplified',
    salesAmount: 0,
    purchaseAmount: 0,
  });

  const result = calculateVat(input);
  const updateInput = (patch: Partial<VatInput>) => setInput((prev) => ({ ...prev, ...patch }));

  return (
    <PageLayout
      title="부가세 계산"
      description="매출·매입으로 부가세 납부 예상액을 대략 계산합니다 (신고 기준은 홈택스가 우선)."
      maxWidth="md"
      help={
        <HelpPanel storageKey="vat-calculator">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 과세 유형을 고르세요 — 초보 위탁 셀러는 대부분 간이과세로 시작합니다</Typography>
            <Typography variant="body2">② 기간 매출(공급대가)과 매입(증빙 수취분)을 입력하세요</Typography>
            <Typography variant="body2">③ 납부 예상액이 계산됩니다 — 간이과세는 연 매출 4,800만 원 미만이면 납부 면제</Typography>
            <Typography variant="caption" color="text.secondary">
              소매(통신판매) 부가가치율 기준의 대략 계산입니다. 실제 신고액은 홈택스·세무사 기준을 따르세요.
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
              과세 유형
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={input.taxType}
              onChange={(_event, value: VatTaxType | null) => {
                if (value) updateInput({ taxType: value });
              }}
            >
              <ToggleButton value="simplified">간이과세</ToggleButton>
              <ToggleButton value="general">일반과세</ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="subtitle2" color="text.secondary">
              기간 실적
            </Typography>
            <AmountField
              label="매출 (부가세 포함 공급대가)"
              value={input.salesAmount}
              onChange={(value) => updateInput({ salesAmount: value })}
            />
            <AmountField
              label="매입 (세금계산서·카드 증빙분)"
              value={input.purchaseAmount}
              onChange={(value) => updateInput({ purchaseAmount: value })}
            />
          </Stack>
        </Paper>

        {/* 결과 패널 */}
        <Paper variant="outlined" sx={{ p: 3, alignSelf: 'start', position: 'sticky', top: 88 }}>
          <Stack spacing={2}>
            <ResultBox>
              <Typography variant="caption" color="text.secondary">
                부가세 납부 예상액
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: result.payable > 0 ? 'text.primary' : 'success.main' }}>
                {KRW(result.payable)}
              </Typography>
              {input.taxType === 'general' && result.payable < 0 && (
                <Typography variant="body2" color="success.main">
                  환급 예상 구간입니다
                </Typography>
              )}
            </ResultBox>

            <Divider />
            <Stack spacing={1}>
              <Row label="매출세액" value={KRW(result.salesVat)} />
              <Row label="매입 공제세액" value={`- ${KRW(result.purchaseCredit)}`} />
            </Stack>

            {result.isExemptCandidate && input.salesAmount > 0 && (
              <Alert severity="success">
                연 공급대가 {KRW(SIMPLIFIED_EXEMPT_THRESHOLD)} 미만 — 간이과세 납부 면제 대상일 수
                있습니다 (신고는 해야 합니다).
              </Alert>
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

//////////////////// 결과 행 ////////////////////
type RowProps = { label: string; value: string };

function Row({ label, value }: RowProps) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
