'use client';

//////////////////////////////////////// 키워드 상세 분석 카드 (종합차트) ////////////////////////////////////////
// 행 클릭 시 온디맨드 로드 — 트렌드·시즌성 / 누가 검색하나(기기·요일) / 시장 상황(가격대·브랜드·실경쟁·콘텐츠).
// 차트는 외부 라이브러리 없이 경량 SVG·막대 (숫자가 아니라 판정 중심 — 3초 판단).

import styled from '@emotion/styled';
import { useTheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import type { KeywordDetail } from '@/shared/types/keywordDetail';
import TrendLineChart from './TrendLineChart';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const KRW = (value: number) => `${Math.round(value).toLocaleString()}원`;

type KeywordDetailCardProps = {
  detail: KeywordDetail;
};

export default function KeywordDetailCard({ detail }: KeywordDetailCardProps) {
  const theme = useTheme();

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
      <BlockCard>
        <BlockLabel>검색 트렌드 · 12개월</BlockLabel>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          {detail.trendDirection === 'up' && <Chip size="small" color="success" icon={<TrendingUpIcon />} label="상승 중" />}
          {detail.trendDirection === 'flat' && <Chip size="small" icon={<TrendingFlatIcon />} label="유지" />}
          {detail.trendDirection === 'down' && <Chip size="small" color="error" icon={<TrendingDownIcon />} label="하락 중" />}
          {detail.categorySeason && detail.categoryName && (
            <Chip size="small" variant="outlined" label={`${detail.categoryName} 카테고리 ${detail.categorySeason}`} />
          )}
          {detail.seasonality.label && (
            <Chip
              size="small"
              color={detail.seasonality.isInSeason ? 'primary' : 'default'}
              variant={detail.seasonality.isInSeason ? 'filled' : 'outlined'}
              label={`${detail.seasonality.label}${detail.seasonality.isInSeason ? ' — 지금 시즌' : ''}`}
            />
          )}
        </Stack>
        {detail.trend.length > 0 ? (
          <Stack spacing={0.25}>
            <TrendLineChart
              height={120}
              ariaLabel="12개월 검색 트렌드"
              series={[
                { name: '검색량', color: theme.palette.primary.main, points: detail.trend, strokeWidth: 2 },
                ...(detail.shoppingClickTrend.length > 1
                  ? [{ name: '쇼핑 클릭', color: theme.palette.text.disabled, points: detail.shoppingClickTrend, dashed: true, strokeWidth: 1.5 }]
                  : []),
              ]}
            />
            {detail.shoppingClickTrend.length > 1 && (
              <Typography variant="caption" color="text.secondary">
                실선 검색량 · 점선 쇼핑 클릭 (각각 상대지수)
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">트렌드 데이터 없음</Typography>
        )}
      </BlockCard>

      {/* ③④⑤⑥ 누가 검색하나 */}
      <BlockCard>
        <BlockLabel>누가 검색하나</BlockLabel>
        {detail.deviceRatio !== null && (
          <RatioLine
            label="기기"
            majorLabel={detail.deviceRatio.mobile >= detail.deviceRatio.pc ? '모바일' : 'PC'}
            majorPercent={Math.max(detail.deviceRatio.mobile, detail.deviceRatio.pc)}
            minorLabel={detail.deviceRatio.mobile >= detail.deviceRatio.pc ? 'PC' : '모바일'}
            minorPercent={Math.min(detail.deviceRatio.mobile, detail.deviceRatio.pc)}
          />
        )}
        {detail.genderRatio !== null && (
          <RatioLine
            label="성별"
            majorLabel={detail.genderRatio.male >= detail.genderRatio.female ? '남성' : '여성'}
            majorPercent={Math.max(detail.genderRatio.male, detail.genderRatio.female)}
            minorLabel={detail.genderRatio.male >= detail.genderRatio.female ? '여성' : '남성'}
            minorPercent={Math.min(detail.genderRatio.male, detail.genderRatio.female)}
          />
        )}
        {detail.ageRatio !== null && detail.ageRatio.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <Typography variant="body2" color="text.secondary" sx={{ width: 40, flexShrink: 0 }}>연령</Typography>
            {detail.ageRatio.slice(0, 3).map((bucket, index) => (
              <Chip
                key={bucket.label}
                size="small"
                color={index === 0 ? 'primary' : 'default'}
                variant={index === 0 ? 'filled' : 'outlined'}
                label={`${bucket.label} ${bucket.percent}%`}
              />
            ))}
          </Stack>
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
      </BlockCard>

      {/* ⑦⑧⑨⑩ 시장 상황 */}
      <BlockCard>
        <BlockLabel>시장 상황</BlockLabel>
        {detail.priceBand !== null && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <Typography variant="body2" color="text.secondary" sx={{ width: 40, flexShrink: 0 }}>가격</Typography>
            <Typography variant="body2">
              <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700 }}>
                {KRW(detail.priceBand.median)}
              </Typography>
              <Typography component="span" variant="caption" color="text.secondary">
                {' '}중앙값 · 범위 {KRW(detail.priceBand.min)}~{KRW(detail.priceBand.max)}
              </Typography>
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
      </BlockCard>
    </CardBox>
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
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default, // 인셋 서피스 (보더 없이 톤으로 구분 — 토스 규칙)
}));

const BlockCard = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.25),
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
}));

const BlockLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 600,
  fontSize: '0.8125rem',
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
