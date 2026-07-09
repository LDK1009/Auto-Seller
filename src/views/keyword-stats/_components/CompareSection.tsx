//////////////////////////////////////// 키워드 비교 섹션 (트렌드 겹침 차트 + 지표 비교 표) ////////////////////////////////////////
// 트렌드는 데이터랩 단일 요청 다중 그룹이라 같은 스케일 — 겹쳐 그려도 통계적으로 유효.
// 표에서는 경쟁강도 최저(틈새) 키워드를 하이라이트해 "이 중 뭘 팔지"를 바로 판정.

import styled from '@emotion/styled';
import { useTheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { CompareEntry } from '@/shared/types/keywordCompare';
import { judgeCompetition } from '../_utils/judgeCompetition';

// "2025-08-01" → "25.08"
function formatMonth(period: string): string {
  return period.slice(2, 7).replace('-', '.');
}

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

  ////////// 차트 데이터: 기준 키워드의 월 축에 각 키워드 값을 병합 (단일 요청이라 기간 축 동일)
  const axisEntry = entries.reduce(
    (longest, entry) => (entry.trend.length > longest.trend.length ? entry : longest),
    entries[0],
  );
  const chartData = (axisEntry?.trend ?? []).map((point) => {
    const row: Record<string, string | number> = { month: formatMonth(point.period) };
    for (const entry of entries) {
      const matched = entry.trend.find((candidate) => candidate.period === point.period);
      if (matched) row[entry.keyword] = Math.round(matched.ratio);
    }
    return row;
  });

  const chartTooltipStyle = {
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    fontSize: 12,
    padding: '6px 10px',
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="subtitle2">키워드 비교 ({entries.length}개)</Typography>

      {/* 판정 한 줄 */}
      {nicheKeyword !== null && (
        <Alert severity="success">
          이 중 틈새는 <b>{nicheKeyword}</b> — 경쟁강도 {nicheRatio}로 가장 낮아요
        </Alert>
      )}

      {/* ① 트렌드 겹침 차트 (12개월, 동일 스케일) */}
      {hasTrend && (
        <BlockCard>
          <BlockLabel>검색 트렌드</BlockLabel>
          <Legend>
            {entries.map((entry, index) => (
              <LegendItem key={entry.keyword}>
                <LegendSwatch style={{ backgroundColor: lineColors[index % lineColors.length] }} />
                <Typography variant="caption">{entry.keyword}{index === 0 ? ' (기준)' : ''}</Typography>
              </LegendItem>
            ))}
          </Legend>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
              {entries.map((entry, index) => (
                <Line
                  key={entry.keyword}
                  type="monotone"
                  dataKey={entry.keyword}
                  stroke={lineColors[index % lineColors.length]}
                  strokeWidth={index === 0 ? 2.5 : 1.75}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
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
                    {/* 뱃지 위·키워드 아래 고정 — 뱃지 유무와 무관하게 키워드 텍스트 높이 통일 (th는 bottom 정렬) */}
                    <Stack spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                      {(index === 0 || entry.keyword === nicheKeyword) && (
                        <Stack direction="row" spacing={0.5}>
                          {index === 0 && <Chip size="small" variant="outlined" label="기준" />}
                          {entry.keyword === nicheKeyword && <Chip size="small" color="success" label="틈새 추천" />}
                        </Stack>
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'keep-all' }}>
                        {entry.keyword}
                      </Typography>
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
                label="월간 클릭수"
                entries={entries}
                render={(entry) =>
                  entry.monthlyClicks !== null
                    ? `${entry.monthlyClicks.toLocaleString()}${entry.avgCtr !== null ? ` (${entry.avgCtr}%)` : ''}`
                    : '—'
                }
              />
              <MetricRow
                label="상품 수"
                entries={entries}
                render={(entry) => (entry.productCount !== null ? entry.productCount.toLocaleString() : '—')}
              />
              <MetricRow
                label="경쟁강도"
                entries={entries}
                render={(entry) => (entry.ratio !== null ? String(entry.ratio) : '—')}
              />
              <tr>
                <td>
                  <Typography variant="caption" color="text.secondary">판정</Typography>
                </td>
                {entries.map((entry) => {
                  const verdict = judgeCompetition(entry.ratio);
                  return (
                    <td key={entry.keyword}>
                      <Chip
                        size="small"
                        label={verdict.label}
                        color={verdict.color}
                        variant={verdict.color === 'default' ? 'outlined' : 'filled'}
                      />
                    </td>
                  );
                })}
              </tr>
              <MetricRow
                label="기기"
                entries={entries}
                render={(entry) =>
                  entry.deviceRatio ? `PC ${entry.deviceRatio.pc}% / 모바일 ${entry.deviceRatio.mobile}%` : '—'
                }
              />
              <MetricRow
                label="성별"
                entries={entries}
                render={(entry) =>
                  entry.genderRatio ? `남 ${entry.genderRatio.male}% / 여 ${entry.genderRatio.female}%` : '—'
                }
              />
              <MetricRow label="연령 1위" entries={entries} render={(entry) => entry.ageTop ?? '—'} />
            </tbody>
          </CompareTable>
        </TableScroll>
        <Typography variant="caption" color="text.secondary">
          트렌드 지수는 이 비교 안에서만 서로 비교할 수 있어요.
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
  '& th': {
    verticalAlign: 'bottom', // 뱃지 유무와 무관하게 키워드 텍스트를 같은 높이(하단)에 정렬
  },
  '& td:first-of-type': {
    textAlign: 'left',
  },
  '& tbody tr:last-of-type td': {
    borderBottom: 'none',
  },
}));
