'use client';

//////////////////////////////////////// 역산 결과 패널 ////////////////////////////////////////
// 목표 마진 달성 "최소 판매가"를 크게 강조하고, 그 가격 기준 실제 내역을 나열한다.

import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import type { ReversePriceResult } from '@/shared/utils/marginCalculation';

type ReversePricePanelProps = {
  result: ReversePriceResult;
  targetMarginRate: number;
};

const KRW = (value: number) => `${Math.round(value).toLocaleString()}원`;

export default function ReversePricePanel({ result, targetMarginRate }: ReversePricePanelProps) {
  if (!result.achievable) {
    return <Alert severity="warning">{result.reason}</Alert>;
  }

  return (
    <Stack spacing={2}>
      {/* 최소 판매가 강조 */}
      <PriceBox>
        <Typography variant="caption" color="text.secondary">
          마진 {targetMarginRate}%를 지키는 최소 판매가
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {KRW(result.recommendedPrice)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          이 가격이면 개당 순이익 {KRW(result.marginAtPrice.profit)} (마진율{' '}
          {result.marginAtPrice.marginRate.toFixed(1)}%)
        </Typography>
      </PriceBox>

      <Divider />

      {/* 세부 내역 (추천가 기준) */}
      <Stack spacing={1}>
        <DetailRow label="손익분기 판매가 (순이익 0원)" value={KRW(result.breakEvenPrice)} />
        <DetailRow label="매출 (판매가 + 배송비 수입)" value={KRW(result.marginAtPrice.revenue)} />
        <DetailRow label="마켓 수수료" value={`- ${KRW(result.marginAtPrice.feeAmount)}`} />
        <DetailRow label="총비용 (원가·배송·기타·수수료)" value={`- ${KRW(result.marginAtPrice.totalCost)}`} />
      </Stack>

      <Typography variant="caption" color="text.secondary">
        판매가는 10원 단위로 올림해 목표 마진율을 보장해요. 이보다 낮게 팔면 목표 마진이 깨져요.
      </Typography>
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
const PriceBox = styled.div(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  textAlign: 'center',
}));
