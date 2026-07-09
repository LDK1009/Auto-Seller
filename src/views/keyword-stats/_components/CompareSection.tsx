//////////////////////////////////////// 키워드 비교 섹션 (트렌드 겹침 차트 + 지표 비교 표) ////////////////////////////////////////
// 트렌드는 데이터랩 단일 요청 다중 그룹이라 같은 스케일 — 겹쳐 그려도 통계적으로 유효.
// 표에서는 경쟁강도 최저(틈새) 키워드를 하이라이트해 "이 중 뭘 팔지"를 바로 판정.

import styled from '@emotion/styled';
import { useTheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import type { CompareEntry } from '@/shared/types/keywordCompare';
import { judgeCompetition } from '../_utils/judgeCompetition';

const CHART_WIDTH = 640;
const CHART_HEIGHT = 180;
const CHART_PADDING = 8;

type PropsType = {
  entries: CompareEntry[]; // 첫 번째 = 기준 키워드
};

export default function CompareSection({ entries }: PropsType) {
  const theme = useTheme();
  // 키워드별 라인 색 (기준 = primary, 이후 고정 팔레트 순환)
  const lineColors = [
    theme.palette.primary.main,
    theme.palette.error.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
  ];

  ////////// 틈새 판정: 경쟁강도 최저 키워드
  const rankedByRatio = entries
    .filter((entry) => entry.ratio !== null)
    .sort((a, b) => (a.ratio as number) - (b.ratio as number));
  const nicheKeyword = rankedByRatio.length > 0 ? rankedByRatio[0].keyword : null;
  const nicheRatio = rankedByRatio.length > 0 ? rankedByRatio[0].ratio : null;

  const hasTrend = entries.some((entry) => entry.trend.length > 0);

  return (
    <Stack spacing={2.5}>
      <Typography variant="subtitle2">키워드 비교 ({entries.length}개)</Typography>

      {/* 판정 한 줄 */}
      {nicheKeyword !== null && (
        <Alert severity="success">
          이 중 틈새는 <b>{nicheKeyword}</b> — 경쟁강도 {nicheRatio} (상품수÷검색수가 가장 낮음)
        </Alert>
      )}

      {/* ① 트렌드 겹침 차트 (12개월, 동일 스케일) */}
      {hasTrend && (
        <BlockCard>
          <BlockLabel>검색 트렌드 · 12개월 (동일 스케일 비교)</BlockLabel>
          <Legend>
            {entries.map((entry, index) => (
              <LegendItem key={entry.keyword}>
                <LegendSwatch style={{ backgroundColor: lineColors[index % lineColors.length] }} />
                <Typography variant="caption">{entry.keyword}{index === 0 ? ' (기준)' : ''}</Typography>
              </LegendItem>
            ))}
          </Legend>
          <ChartScroll>
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              width="100%"
              height={CHART_HEIGHT}
              preserveAspectRatio="none"
              role="img"
              aria-label="키워드별 12개월 검색 트렌드 비교"
            >
              {entries.map((entry, index) => {
                if (entry.trend.length < 2) return null;
                const points = entry.trend
                  .map((point, pointIndex) => {
                    const x =
                      CHART_PADDING +
                      (pointIndex / (entry.trend.length - 1)) * (CHART_WIDTH - CHART_PADDING * 2);
                    const y =
                      CHART_HEIGHT - CHART_PADDING - (point.ratio / 100) * (CHART_HEIGHT - CHART_PADDING * 2);
                    return `${x},${y}`;
                  })
                  .join(' ');
                return (
                  <polyline
                    key={entry.keyword}
                    points={points}
                    fill="none"
                    stroke={lineColors[index % lineColors.length]}
                    strokeWidth={index === 0 ? 2.5 : 1.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
          </ChartScroll>
          <MonthAxis>
            <Typography variant="caption" color="text.secondary">
              {entries[0]?.trend[0]?.period.slice(0, 7) ?? ''}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {entries[0]?.trend[entries[0].trend.length - 1]?.period.slice(0, 7) ?? ''}
            </Typography>
          </MonthAxis>
        </BlockCard>
      )}

      {/* ② 지표 비교 표 (행 = 지표, 열 = 키워드) */}
      <BlockCard>
        <BlockLabel>지표 비교</BlockLabel>
        <TableScroll>
          <CompareTable>
            <thead>
              <tr>
                <th />
                {entries.map((entry, index) => (
                  <th key={entry.keyword}>
                    <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'keep-all' }}>
                        {entry.keyword}
                      </Typography>
                      {index === 0 && <Chip size="small" variant="outlined" label="기준" />}
                      {entry.keyword === nicheKeyword && <Chip size="small" color="success" label="틈새 추천" />}
                    </Stack>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <MetricRow
                label="월간 검색수"
                entries={entries}
                render={(entry) =>
                  entry.monthlySearches === null
                    ? '—'
                    : entry.isLowVolume
                      ? '10 미만'
                      : entry.monthlySearches.toLocaleString()
                }
              />
              <MetricRow
                label="월 클릭 (클릭률)"
                entries={entries}
                render={(entry) =>
                  entry.monthlyClicks !== null
                    ? `${entry.monthlyClicks.toLocaleString()}${entry.avgCtr !== null ? ` (${entry.avgCtr}%)` : ''}`
                    : '—'
                }
              />
              <MetricRow
                label="등록 상품 수"
                entries={entries}
                render={(entry) => (entry.productCount !== null ? entry.productCount.toLocaleString() : '—')}
              />
              <tr>
                <td>
                  <Typography variant="caption" color="text.secondary">경쟁강도</Typography>
                </td>
                {entries.map((entry) => {
                  const verdict = judgeCompetition(entry.ratio);
                  return (
                    <td key={entry.keyword}>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Chip
                          size="small"
                          label={verdict.label}
                          color={verdict.color}
                          variant={verdict.color === 'default' ? 'outlined' : 'filled'}
                        />
                        {entry.ratio !== null && (
                          <Typography variant="caption" color="text.secondary">{entry.ratio}</Typography>
                        )}
                      </Stack>
                    </td>
                  );
                })}
              </tr>
              <MetricRow
                label="기기 (PC/모바일)"
                entries={entries}
                render={(entry) =>
                  entry.deviceRatio ? `${entry.deviceRatio.pc}% / ${entry.deviceRatio.mobile}%` : '—'
                }
              />
              <MetricRow
                label="성별 (남/여)"
                entries={entries}
                render={(entry) =>
                  entry.genderRatio ? `${entry.genderRatio.male}% / ${entry.genderRatio.female}%` : '—'
                }
              />
              <MetricRow label="연령 TOP" entries={entries} render={(entry) => entry.ageTop ?? '—'} />
            </tbody>
          </CompareTable>
        </TableScroll>
        <Typography variant="caption" color="text.secondary">
          트렌드는 이 비교 안에서만 상대 비교가 유효합니다 (네이버 데이터랩 상대지수 특성). 성별·연령은 쇼핑
          카테고리 클릭 기준입니다.
        </Typography>
      </BlockCard>
    </Stack>
  );
}

//////////////////// 지표 행 (텍스트 값 공용) ////////////////////
type MetricRowProps = {
  label: string;
  entries: CompareEntry[];
  render: (entry: CompareEntry) => string;
};

function MetricRow({ label, entries, render }: MetricRowProps) {
  return (
    <tr>
      <td>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </td>
      {entries.map((entry) => (
        <td key={entry.keyword}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{render(entry)}</Typography>
        </td>
      ))}
    </tr>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
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

const Legend = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1.5),
}));

const LegendItem = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

const LegendSwatch = styled.span({
  width: 12,
  height: 4,
  borderRadius: 2,
  display: 'inline-block',
});

const ChartScroll = styled.div({
  width: '100%',
  overflowX: 'auto',
});

const MonthAxis = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
});

const TableScroll = styled.div({
  width: '100%',
  overflowX: 'auto',
});

const CompareTable = styled.table(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  '& th, & td': {
    padding: theme.spacing(1, 1.5),
    textAlign: 'center',
    whiteSpace: 'nowrap',
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  '& td:first-of-type': {
    textAlign: 'left',
  },
  '& tbody tr:last-of-type td': {
    borderBottom: 'none',
  },
}));
