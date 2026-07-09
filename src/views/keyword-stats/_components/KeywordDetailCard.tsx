'use client';

//////////////////////////////////////// 키워드 상세 분석 카드 (종합차트) ////////////////////////////////////////
// 레이아웃: 1행 [검색 트렌드 | 검색 고객 분석] / 2행 [시장 가격 슬라이더] / 3행 [시장 상황 4박스].
// 차트는 Recharts — 포인트 호버 툴팁 기본 제공 (판정 중심 — 3초 판단).

import styled from '@emotion/styled';
import { useTheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { KeywordDetail } from '@/shared/types/keywordDetail';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const KRW = (value: number) => `${Math.round(value).toLocaleString()}원`;

// "2025-08-01" → "25.08"
function formatMonth(period: string): string {
  return period.slice(2, 7).replace('-', '.');
}

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
        ? { text: '초보 진입 비추천', color: theme.palette.error.main }
        : detail.brandShare >= 30
          ? { text: '중간', color: theme.palette.warning.main }
          : { text: '진입 무난', color: theme.palette.success.main };

  ////////// 차트 데이터 가공
  // 트렌드: 검색량 + 쇼핑 클릭을 월 축으로 병합
  const trendData = detail.trend.map((point) => {
    const clickPoint = detail.shoppingClickTrend.find((click) => click.period === point.period);
    return {
      month: formatMonth(point.period),
      검색량: Math.round(point.ratio),
      ...(clickPoint !== undefined ? { '쇼핑 클릭': Math.round(clickPoint.ratio) } : {}),
    };
  });

  // 연령: 나이 오름차순 정렬 (API는 비중 내림차순으로 옴)
  const ageData =
    detail.ageRatio !== null
      ? [...detail.ageRatio].sort((a, b) => parseInt(a.label, 10) - parseInt(b.label, 10))
      : [];
  const topAgeLabel =
    detail.ageRatio !== null && detail.ageRatio.length > 0 ? detail.ageRatio[0].label : null;

  // 요일: 라벨 붙이기
  const weekdayData =
    detail.weekdayRatio !== null
      ? detail.weekdayRatio.map((percent, index) => ({ label: WEEKDAY_LABELS[index], percent }))
      : [];

  const chartTooltipStyle = {
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    fontSize: 12,
    padding: '6px 10px',
  };

  return (
    <CardBox>
      {/* 1행: 검색 트렌드 | 검색 고객 분석 */}
      <TwoColumnRow>
        {/* ①② 검색 트렌드 · 시즌성 */}
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
          {trendData.length > 1 ? (
            <Stack spacing={0.25} sx={{ flex: 1, justifyContent: 'flex-end' }}>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="검색량"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2.25}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {detail.shoppingClickTrend.length > 1 && (
                    <Line
                      type="monotone"
                      dataKey="쇼핑 클릭"
                      stroke={theme.palette.text.disabled}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              {detail.shoppingClickTrend.length > 1 && (
                <Typography variant="caption" color="text.secondary">
                  실선 검색량 · 점선 쇼핑 클릭 (각각 상대지수, 최대 100)
                </Typography>
              )}
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">트렌드 데이터 없음</Typography>
          )}
        </BlockCard>

        {/* ③④⑤⑥ 검색 고객 분석 (기기·성별·연령·요일) */}
        <BlockCard>
          <BlockLabel>검색 고객 분석</BlockLabel>
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
          {ageData.length > 0 && (
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">연령별 비중 (%)</Typography>
              <ResponsiveContainer width="100%" height={96}>
                <BarChart data={ageData} margin={{ top: 16, right: 4, bottom: 0, left: 4 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis hide />
                  <Bar dataKey="percent" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="percent" position="top" fontSize={10} formatter={(value) => `${value}%`} />
                    {ageData.map((bucket) => (
                      <Cell
                        key={bucket.label}
                        fill={bucket.label === topAgeLabel ? theme.palette.primary.main : theme.palette.action.selected}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Stack>
          )}
          {weekdayData.length > 0 && topWeekdayIndex !== null && (
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                요일별 비중 (%) — {WEEKDAY_LABELS[topWeekdayIndex]}요일에 가장 많이 찾음
              </Typography>
              <ResponsiveContainer width="100%" height={96}>
                <BarChart data={weekdayData} margin={{ top: 16, right: 4, bottom: 0, left: 4 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis hide />
                  <Bar dataKey="percent" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="percent" position="top" fontSize={10} formatter={(value) => `${value}%`} />
                    {weekdayData.map((day, index) => (
                      <Cell
                        key={day.label}
                        fill={index === topWeekdayIndex ? theme.palette.primary.main : theme.palette.action.selected}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Stack>
          )}
          {detail.deviceRatio === null && detail.genderRatio === null && ageData.length === 0 && weekdayData.length === 0 && (
            <Typography variant="caption" color="text.secondary">데이터 없음</Typography>
          )}
        </BlockCard>
      </TwoColumnRow>

      {/* 2행: ⑦ 시장 가격 (최소–중앙값–최대 슬라이더 트랙) */}
      <BlockCard>
        <BlockLabel>시장 가격</BlockLabel>
        {detail.priceBand !== null ? (
          <PriceRangeSlider min={detail.priceBand.min} median={detail.priceBand.median} max={detail.priceBand.max} />
        ) : (
          <Typography variant="caption" color="text.secondary">가격 데이터 없음</Typography>
        )}
      </BlockCard>

      {/* 3행: ⑧⑨⑩ 시장 상황 4박스 */}
      <BlockCard>
        <BlockLabel>시장 상황</BlockLabel>
        <MarketGrid>
          <MarketBox>
            <Typography variant="caption" color="text.secondary">브랜드 장악</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {detail.brandShare !== null ? `${detail.brandShare}%` : '—'}
            </Typography>
            {brandVerdict && (
              <Typography variant="caption" sx={{ color: brandVerdict.color, fontWeight: 600 }}>
                {brandVerdict.text}
              </Typography>
            )}
          </MarketBox>
          <MarketBox>
            <Typography variant="caption" color="text.secondary">실경쟁 상품</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {detail.strictProductCount !== null ? formatCompact(detail.strictProductCount) : '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">중고·직구 제외</Typography>
          </MarketBox>
          <MarketBox>
            <Typography variant="caption" color="text.secondary">블로그 문서</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {detail.blogCount !== null ? formatCompact(detail.blogCount) : '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">콘텐츠 노출 기회</Typography>
          </MarketBox>
          <MarketBox>
            <Typography variant="caption" color="text.secondary">카페 글</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {detail.cafeCount !== null ? formatCompact(detail.cafeCount) : '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">커뮤니티 관심도</Typography>
          </MarketBox>
        </MarketGrid>
      </BlockCard>
    </CardBox>
  );
}

//////////////////// 시장 가격 슬라이더 (최소–중앙값–최대) ////////////////////
type PriceRangeSliderProps = { min: number; median: number; max: number };

function PriceRangeSlider({ min, median, max }: PriceRangeSliderProps) {
  // 중앙값 위치 % (min=max 엣지는 가운데 고정)
  const medianPercent = max > min ? Math.round(((median - min) / (max - min)) * 100) : 50;
  const clampedPercent = Math.min(92, Math.max(8, medianPercent)); // 라벨이 양끝과 겹치지 않게

  return (
    <SliderWrapper>
      {/* 중앙값 (위) */}
      <MedianLabel style={{ left: `${clampedPercent}%` }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
          {KRW(median)}
        </Typography>
        <Typography variant="caption" color="text.secondary">중앙값</Typography>
      </MedianLabel>

      {/* 트랙 + 마커 */}
      <SliderTrack>
        <SliderFill style={{ width: `${medianPercent}%` }} />
        <MedianDot style={{ left: `${medianPercent}%` }} />
      </SliderTrack>

      {/* 최소/최대 (아래 양끝) */}
      <EdgeLabels>
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{KRW(min)}</Typography>
          <Typography variant="caption" color="text.secondary">최저가</Typography>
        </Stack>
        <Stack sx={{ alignItems: 'flex-end' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{KRW(max)}</Typography>
          <Typography variant="caption" color="text.secondary">최고가</Typography>
        </Stack>
      </EdgeLabels>
    </SliderWrapper>
  );
}

//////////////////// 비율 한 줄 (기기·성별) ////////////////////
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
const CardBox = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default, // 인셋 서피스 (보더 없이 톤으로 구분 — 토스 규칙)
}));

const TwoColumnRow = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: theme.spacing(1.5),
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
  },
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

////////// 시장 가격 슬라이더
const SliderWrapper = styled.div(({ theme }) => ({
  position: 'relative',
  paddingTop: theme.spacing(5.5), // 중앙값 라벨 공간
  paddingBottom: theme.spacing(0.5),
}));

const MedianLabel = styled.div({
  position: 'absolute',
  top: 0,
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

const SliderTrack = styled.div(({ theme }) => ({
  position: 'relative',
  height: 8,
  borderRadius: 4,
  backgroundColor: theme.palette.action.hover,
}));

const SliderFill = styled.div(({ theme }) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  borderRadius: 4,
  backgroundColor: theme.palette.primary.main,
  opacity: 0.35,
}));

const MedianDot = styled.div(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  border: `3px solid ${theme.palette.background.paper}`,
  boxShadow: theme.shadows[1],
}));

const EdgeLabels = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(1),
}));

////////// 시장 상황 4박스
const MarketGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(1.5),
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
}));

const MarketBox = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.25),
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
}));

////////// 기기·성별 비율 바
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
