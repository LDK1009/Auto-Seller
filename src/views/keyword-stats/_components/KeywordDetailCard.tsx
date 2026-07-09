'use client';

//////////////////////////////////////// 키워드 상세 분석 카드 (종합차트) ////////////////////////////////////////
// 행 클릭 시 온디맨드 로드 — 트렌드·시즌성 / 누가 검색하나(기기·요일) / 시장 상황(가격대·브랜드·실경쟁·콘텐츠).
// 차트는 외부 라이브러리 없이 경량 SVG·막대 (숫자가 아니라 판정 중심 — 3초 판단).

import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import type { KeywordDetail } from '@/shared/types/keywordDetail';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const KRW = (value: number) => `${Math.round(value).toLocaleString()}원`;

type KeywordDetailCardProps = {
  detail: KeywordDetail;
};

export default function KeywordDetailCard({ detail }: KeywordDetailCardProps) {
  ////////// 파생 판정
  const topWeekdayIndex =
    detail.weekdayRatio !== null ? detail.weekdayRatio.indexOf(Math.max(...detail.weekdayRatio)) : null;
  const brandVerdict =
    detail.brandShare === null
      ? null
      : detail.brandShare >= 60
        ? { label: `브랜드 장악 ${detail.brandShare}% — 초보 진입 비추천`, color: 'error' as const }
        : detail.brandShare >= 30
          ? { label: `브랜드 ${detail.brandShare}% — 중간`, color: 'warning' as const }
          : { label: `브랜드 ${detail.brandShare}% — 진입 무난`, color: 'success' as const };

  return (
    <CardBox>
      {/* ①② 트렌드 · 시즌성 */}
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          <Typography variant="subtitle2">12개월 검색 트렌드</Typography>
          {detail.trendDirection === 'up' && <Chip size="small" color="success" icon={<TrendingUpIcon />} label="상승 중" />}
          {detail.trendDirection === 'flat' && <Chip size="small" icon={<TrendingFlatIcon />} label="유지" />}
          {detail.trendDirection === 'down' && <Chip size="small" color="error" icon={<TrendingDownIcon />} label="하락 중" />}
          {detail.seasonality.label && (
            <Chip
              size="small"
              color={detail.seasonality.isInSeason ? 'primary' : 'default'}
              variant={detail.seasonality.isInSeason ? 'filled' : 'outlined'}
              label={`${detail.seasonality.label}${detail.seasonality.isInSeason ? ' — 지금 시즌' : ''}`}
            />
          )}
        </Stack>
        {detail.trend.length > 0 ? <TrendSparkline points={detail.trend.map((point) => point.ratio)} /> : (
          <Typography variant="caption" color="text.secondary">트렌드 데이터 없음</Typography>
        )}
      </Stack>

      <Divider />

      {/* ③⑥ 누가 검색하나 */}
      <Stack spacing={1}>
        <Typography variant="subtitle2">누가 검색하나</Typography>
        {detail.deviceRatio !== null && (
          <RatioLine
            label="기기"
            majorLabel={detail.deviceRatio.mobile >= detail.deviceRatio.pc ? '모바일' : 'PC'}
            majorPercent={Math.max(detail.deviceRatio.mobile, detail.deviceRatio.pc)}
            minorLabel={detail.deviceRatio.mobile >= detail.deviceRatio.pc ? 'PC' : '모바일'}
            minorPercent={Math.min(detail.deviceRatio.mobile, detail.deviceRatio.pc)}
          />
        )}
        {detail.weekdayRatio !== null && topWeekdayIndex !== null && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <Typography variant="body2" color="text.secondary" sx={{ width: 40, flexShrink: 0 }}>요일</Typography>
            <WeekdayBars>
              {detail.weekdayRatio.map((percent, index) => (
                <WeekdayBar key={WEEKDAY_LABELS[index]}>
                  <BarFill style={{ height: `${Math.max(8, (percent / Math.max(...(detail.weekdayRatio as number[]))) * 100)}%` }} $isTop={index === topWeekdayIndex} />
                  <Typography variant="caption" color={index === topWeekdayIndex ? 'primary' : 'text.secondary'}>
                    {WEEKDAY_LABELS[index]}
                  </Typography>
                </WeekdayBar>
              ))}
            </WeekdayBars>
            <Typography variant="caption" color="text.secondary">
              {WEEKDAY_LABELS[topWeekdayIndex]}요일에 가장 많이 찾음
            </Typography>
          </Stack>
        )}
        {detail.deviceRatio === null && detail.weekdayRatio === null && (
          <Typography variant="caption" color="text.secondary">데이터 없음</Typography>
        )}
      </Stack>

      <Divider />

      {/* ⑦⑧⑨⑩ 시장 상황 */}
      <Stack spacing={1}>
        <Typography variant="subtitle2">시장 상황</Typography>
        {detail.priceBand !== null && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <Typography variant="body2" color="text.secondary" sx={{ width: 40, flexShrink: 0 }}>가격</Typography>
            <Typography variant="body2">
              {KRW(detail.priceBand.min)} ~ {KRW(detail.priceBand.max)} · 중앙값 <b>{KRW(detail.priceBand.median)}</b>
            </Typography>
          </Stack>
        )}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {brandVerdict && <Chip size="small" color={brandVerdict.color} variant="outlined" label={brandVerdict.label} />}
          {detail.strictProductCount !== null && (
            <Chip size="small" variant="outlined" label={`실경쟁 ${detail.strictProductCount.toLocaleString()}개 (중고·직구 제외)`} />
          )}
          {detail.blogCount !== null && (
            <Chip size="small" variant="outlined" label={`블로그 ${formatCompact(detail.blogCount)} · 카페 ${detail.cafeCount !== null ? formatCompact(detail.cafeCount) : '—'}`} />
          )}
        </Stack>
      </Stack>
    </CardBox>
  );
}

//////////////////// 트렌드 스파크라인 (경량 SVG) ////////////////////
function TrendSparkline({ points }: { points: number[] }) {
  const width = 280;
  const height = 56;
  const max = Math.max(...points, 1);
  const step = width / Math.max(points.length - 1, 1);
  const coords = points.map((value, index) => `${index * step},${height - (value / max) * (height - 6) - 3}`);

  return (
    <SparklineSvg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={coords.join(' ')} fill="none" strokeWidth="2" />
      {points.map((value, index) => (
        <circle key={index} cx={index * step} cy={height - (value / max) * (height - 6) - 3} r="2" />
      ))}
    </SparklineSvg>
  );
}

//////////////////// 비율 한 줄 (기기 등) ////////////////////
type RatioLineProps = { label: string; majorLabel: string; majorPercent: number; minorLabel: string; minorPercent: number };

function RatioLine({ label, majorLabel, majorPercent, minorLabel, minorPercent }: RatioLineProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 40, flexShrink: 0 }}>{label}</Typography>
      <RatioTrack>
        <RatioFill style={{ width: `${majorPercent}%` }} />
      </RatioTrack>
      <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
        <b>{majorLabel} {majorPercent}%</b>
        <Typography component="span" variant="caption" color="text.secondary"> · {minorLabel} {minorPercent}%</Typography>
      </Typography>
    </Stack>
  );
}

//////////////////// 헬퍼 ////////////////////
function formatCompact(value: number): string {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}만`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}천`;
  return String(value);
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
import { transientOptions } from '@/shared/utils/emotionTransientProps';

const CardBox = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const SparklineSvg = styled.svg(({ theme }) => ({
  width: '100%',
  maxWidth: 320,
  height: 56,
  '& polyline': { stroke: theme.palette.primary.main },
  '& circle': { fill: theme.palette.primary.main },
}));

const RatioTrack = styled.div(({ theme }) => ({
  flex: 1,
  maxWidth: 200,
  height: 10,
  borderRadius: 5,
  backgroundColor: theme.palette.action.hover,
  overflow: 'hidden',
}));

const RatioFill = styled.div(({ theme }) => ({
  height: '100%',
  borderRadius: 5,
  backgroundColor: theme.palette.primary.main,
}));

const WeekdayBars = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-end',
  gap: theme.spacing(0.75),
  height: 48,
}));

const WeekdayBar = styled.div({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 2,
  width: 22,
  height: '100%',
});

const BarFill = styled('div', transientOptions)<{ $isTop: boolean }>(({ theme, $isTop }) => ({
  width: 14,
  borderRadius: 3,
  backgroundColor: $isTop ? theme.palette.primary.main : theme.palette.action.selected,
}));
