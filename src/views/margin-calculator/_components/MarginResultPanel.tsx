'use client';

//////////////////////////////////////// 마진 계산 결과 패널 ////////////////////////////////////////
// 순이익을 크게 강조하고, 세부 내역(매출·수수료·총비용·비율)을 나열한다.

import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import type { MarginResult } from '@/shared/utils/marginCalculation';
import { MARGIN_RATE_GOOD, MARGIN_RATE_WARN } from '../_constants/marginCalculator';

type MarginResultPanelProps = {
  result: MarginResult;
};

const KRW = (value: number) => `${Math.round(value).toLocaleString()}원`;

export default function MarginResultPanel({ result }: MarginResultPanelProps) {
  // 마진율 판정 색
  const rateColor =
    result.marginRate >= MARGIN_RATE_GOOD
      ? 'success.main'
      : result.marginRate >= MARGIN_RATE_WARN
        ? 'warning.main'
        : 'error.main';

  return (
    <Stack spacing={2}>
      {/* 순이익 강조 */}
      <ProfitBox>
        <Typography variant="caption" color="text.secondary">
          개당 순이익
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: rateColor }}>
          {KRW(result.profit)}
        </Typography>
        <Typography variant="body2" sx={{ color: rateColor }}>
          마진율 {result.marginRate.toFixed(1)}% · 원가 대비 {result.costMarkup.toFixed(1)}%
        </Typography>
      </ProfitBox>

      <Divider />

      {/* 세부 내역 */}
      <Stack spacing={1}>
        <DetailRow label="매출 (판매가 + 배송비 수입)" value={KRW(result.revenue)} />
        <DetailRow label="마켓 수수료" value={`- ${KRW(result.feeAmount)}`} />
        <DetailRow label="총비용 (원가·배송·기타·수수료)" value={`- ${KRW(result.totalCost)}`} />
      </Stack>
    </Stack>
  );
}

//////////////////// 세부 행 ////////////////////
type DetailRowProps = { label: string; value: string };

function DetailRow({ label, value }: DetailRowProps) {
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
const ProfitBox = styled.div(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  textAlign: 'center',
}));
