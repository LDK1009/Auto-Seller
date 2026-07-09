//////////////////////////////////////// 핵심 지표 스탯 카드 4개 ////////////////////////////////////////
// 검색 직후 최상단 노출 — 토스식 "큰 숫자 + 작은 라벨". 경쟁강도는 판정 칩으로.

import styled from '@emotion/styled';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import type { KeywordStat } from '@/shared/types/keywordStats';
import { judgeCompetition } from '../_utils/judgeCompetition';

type PropsType = {
  stat: KeywordStat;
};

export default function StatSummaryCards({ stat }: PropsType) {
  const verdict = judgeCompetition(stat.ratio);

  return (
    <CardGrid>
      <StatCard>
        <Typography variant="caption" color="text.secondary">월간 검색수</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {stat.monthlySearches === null ? '—' : stat.isLowVolume ? '10 미만' : stat.monthlySearches.toLocaleString()}
        </Typography>
      </StatCard>
      <StatCard>
        <Typography variant="caption" color="text.secondary">월 클릭 (클릭률)</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {stat.monthlyClicks !== null ? stat.monthlyClicks.toLocaleString() : '—'}
          {stat.avgCtr !== null && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
              ({stat.avgCtr}%)
            </Typography>
          )}
        </Typography>
      </StatCard>
      <StatCard>
        <Typography variant="caption" color="text.secondary">등록 상품 수</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {stat.productCount !== null ? stat.productCount.toLocaleString() : '—'}
        </Typography>
      </StatCard>
      <StatCard>
        <Typography variant="caption" color="text.secondary">경쟁강도 (상품수÷검색수)</Typography>
        <ChipLine>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {stat.ratio !== null ? stat.ratio : '—'}
          </Typography>
          <Chip
            size="small"
            label={verdict.label}
            color={verdict.color}
            variant={verdict.color === 'default' ? 'outlined' : 'filled'}
            sx={{ fontWeight: 700 }}
          />
        </ChipLine>
      </StatCard>
    </CardGrid>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const CardGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(1.5),
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
}));

const StatCard = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.75),
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default, // 인셋 서피스 (보더 없이 톤으로 구분 — 토스 규칙)
}));

const ChipLine = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  minHeight: 32,
}));
