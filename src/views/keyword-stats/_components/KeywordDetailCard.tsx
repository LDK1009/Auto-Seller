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
            <StackedRatioBar
              label="기기"
              segments={[
                { name: '모바일', percent: detail.deviceRatio.mobile },
                { name: 'PC', percent: detail.deviceRatio.pc },
              ]}
              colors={[theme.palette.primary.main, theme.palette.action.selected]}
              tooltipStyle={chartTooltipStyle}
            />
          )}
          {detail.genderRatio !== null && (
            <StackedRatioBar
              label="성별"
              segments={[
                { name: '여성', percent: detail.genderRatio.female },
                { name: '남성', percent: detail.genderRatio.male },
              ]}
              colors={[theme.palette.secondary.main, theme.palette.info.main]}
              tooltipStyle={chartTooltipStyle}
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
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value}%`, '비중']} cursor={{ fill: theme.palette.action.hover }} />
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
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value}%`, '비중']} cursor={{ fill: theme.palette.action.hover }} />
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
            <Typography variant="caption" color="text.secondary">블로그 글</Typography>
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
  // 중앙값 마커는 트랙 정중앙 고정 — 가격 분포가 쏠려도 "최소·중앙·최대" 도식으로 읽히게

  return (
    <SliderWrapper>
      {/* 중앙값 (위) */}
      <MedianLabel style={{ left: '50%' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
          {KRW(median)}
        </Typography>
        <Typography variant="caption" color="text.secondary">중앙값</Typography>
      </MedianLabel>

      {/* 트랙 + 마커 */}
      <SliderTrack>
        <SliderFill style={{ width: '50%' }} />
        <MedianDot style={{ left: '50%' }} />
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

//////////////////// 비율 스택 바 (기기·성별 — Recharts, 호버 시 상세) ////////////////////
type StackedRatioBarProps = {
  label: string;
  segments: { name: string; percent: number }[]; // 왼쪽부터 순서대로
  colors: string[];
  tooltipStyle: React.CSSProperties;
};

function StackedRatioBar({ label, segments, colors, tooltipStyle }: StackedRatioBarProps) {
  const row: Record<string, string | number> = { name: label };
  for (const segment of segments) row[segment.name] = segment.percent;

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 40, flexShrink: 0 }}>{label}</Typography>
      <BarFlex>
        <ResponsiveContainer width="100%" height={30}>
          <BarChart data={[row]} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barSize={14}>
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${value}%`} cursor={{ fill: 'transparent' }} />
            {segments.map((segment, index) => (
              <Bar
                key={segment.name}
                dataKey={segment.name}
                stackId="ratio"
                fill={colors[index % colors.length]}
                radius={index === 0 ? [7, 0, 0, 7] : index === segments.length - 1 ? [0, 7, 7, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </BarFlex>
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        {segments.map((segment) => `${segment.name} ${segment.percent}%`).join(' · ')}
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

////////// 기기·성별 비율 스택 바 컨테이너
const BarFlex = styled.div({
  flex: 1,
  minWidth: 0,
});
