'use client';

//////////////////////////////////////// 호버 가능한 트렌드 라인 차트 (경량 SVG) ////////////////////////////////////////
// 상세 카드(검색량+쇼핑클릭)와 비교 섹션(키워드 ≤5개)이 공유.
// 마우스 위치 → 가장 가까운 월 인덱스 → 세로 가이드라인 + 시리즈별 상세 값 툴팁.

import { useRef, useState } from 'react';
import styled from '@emotion/styled';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { TrendPoint } from '@/shared/types/keywordDetail';

const VIEW_WIDTH = 640;
const PADDING = 8;

export type ChartSeries = {
  name: string;
  color: string;
  points: TrendPoint[];
  dashed?: boolean;
  strokeWidth?: number;
};

type PropsType = {
  series: ChartSeries[];
  height?: number; // px (viewBox 높이 겸용)
  ariaLabel: string;
};

export default function TrendLineChart({ series, height = 160, ariaLabel }: PropsType) {
  const theme = useTheme();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 기준 축 = 포인트가 가장 많은 시리즈 (모든 시리즈는 같은 기간 축을 공유한다는 전제)
  const axisSeries = series.reduce(
    (longest, entry) => (entry.points.length > longest.points.length ? entry : longest),
    series[0],
  );
  const axisPoints = axisSeries?.points ?? [];
  if (axisPoints.length < 2) return null;

  ////////// 좌표 변환 (viewBox 기준)
  const toX = (index: number) => PADDING + (index / (axisPoints.length - 1)) * (VIEW_WIDTH - PADDING * 2);
  const toY = (ratio: number) => height - PADDING - (ratio / 100) * (height - PADDING * 2);

  ////////// 마우스 → 가장 가까운 월 인덱스 (preserveAspectRatio=none이라 px 비율로 환산)
  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const paddingPx = (PADDING / VIEW_WIDTH) * rect.width;
    const usableWidth = rect.width - paddingPx * 2;
    const progress = Math.min(1, Math.max(0, (event.clientX - rect.left - paddingPx) / usableWidth));
    setHoverIndex(Math.round(progress * (axisPoints.length - 1)));
  };

  ////////// 호버 지점 데이터 (시리즈별 동일 period 값 — 길이 다르면 period 문자열로 매칭)
  const hoveredPeriod = hoverIndex !== null ? axisPoints[hoverIndex]?.period : null;
  const hoveredValues =
    hoveredPeriod !== null
      ? series.map((entry) => ({
          name: entry.name,
          color: entry.color,
          ratio: entry.points.find((point) => point.period === hoveredPeriod)?.ratio ?? null,
        }))
      : [];
  const hoverLeftPercent = hoverIndex !== null ? (toX(hoverIndex) / VIEW_WIDTH) * 100 : 0;

  return (
    <ChartWrapper ref={wrapperRef} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIndex(null)}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        {/* 호버 가이드라인 */}
        {hoverIndex !== null && (
          <line
            x1={toX(hoverIndex)}
            y1={PADDING}
            x2={toX(hoverIndex)}
            y2={height - PADDING}
            stroke={theme.palette.divider}
            strokeWidth={1.5}
          />
        )}
        {series.map((entry) => {
          if (entry.points.length < 2) return null;
          const points = entry.points
            .map((point, pointIndex) => {
              const x = PADDING + (pointIndex / (entry.points.length - 1)) * (VIEW_WIDTH - PADDING * 2);
              return `${x},${toY(point.ratio)}`;
            })
            .join(' ');
          return (
            <polyline
              key={entry.name}
              points={points}
              fill="none"
              stroke={entry.color}
              strokeWidth={entry.strokeWidth ?? 2}
              strokeDasharray={entry.dashed ? '5 4' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
        {/* 호버 지점 마커 */}
        {hoveredPeriod !== null &&
          hoveredValues.map(
            (value) =>
              value.ratio !== null && (
                <circle
                  key={value.name}
                  cx={toX(hoverIndex as number)}
                  cy={toY(value.ratio)}
                  r={3.5}
                  fill={value.color}
                  stroke={theme.palette.background.paper}
                  strokeWidth={1.5}
                />
              ),
          )}
      </svg>

      {/* 툴팁 (차트 우측이면 왼쪽으로 뒤집기) */}
      {hoveredPeriod !== null && (
        <TooltipBox
          style={{
            left: `${hoverLeftPercent}%`,
            transform: hoverLeftPercent > 55 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {formatPeriod(hoveredPeriod)}
          </Typography>
          {hoveredValues.map((value) => (
            <TooltipRow key={value.name}>
              <TooltipSwatch style={{ backgroundColor: value.color }} />
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1, whiteSpace: 'nowrap' }}>
                {value.name}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {value.ratio !== null ? Math.round(value.ratio) : '—'}
              </Typography>
            </TooltipRow>
          ))}
        </TooltipBox>
      )}

      {/* 기간 축 라벨 */}
      <AxisRow>
        <Typography variant="caption" color="text.secondary">{formatPeriod(axisPoints[0].period)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {formatPeriod(axisPoints[axisPoints.length - 1].period)}
        </Typography>
      </AxisRow>
    </ChartWrapper>
  );
}

//////////////////// 헬퍼 ////////////////////
// "2025-08-01" → "2025.08"
function formatPeriod(period: string): string {
  return period.slice(0, 7).replace('-', '.');
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const ChartWrapper = styled.div({
  position: 'relative',
  width: '100%',
});

const TooltipBox = styled.div(({ theme }) => ({
  position: 'absolute',
  top: 0,
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.25),
  minWidth: 120,
  padding: theme.spacing(1, 1.25),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[3],
  pointerEvents: 'none', // 툴팁이 마우스 이벤트를 가로채지 않도록
}));

const TooltipRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
}));

const TooltipSwatch = styled.span({
  width: 10,
  height: 4,
  borderRadius: 2,
  flexShrink: 0,
});

const AxisRow = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
});
