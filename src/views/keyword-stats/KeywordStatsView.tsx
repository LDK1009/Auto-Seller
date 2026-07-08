'use client';

//////////////////////////////////////// 키워드 검색량 조회 화면 ////////////////////////////////////////
// 월간 검색수(검색광고 API) + 등록 상품 수(쇼핑 오픈API) → 경쟁강도(상품수÷검색수)로 틈새 판정.
// 소싱 실험 계획서의 "키워드 통과 기준"을 자동화한 도구 — 검색 유입용 독립 페이지.

import { useState } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import { useSnackbar } from 'notistack';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import { fetchKeywordStats } from '@/shared/services/keywordStatsService';
import type { KeywordStat } from '@/shared/types/keywordStats';

const MAX_KEYWORDS = 10;

////////// 경쟁강도 판정 (상품수 ÷ 월간 검색수 — 낮을수록 틈새)
function judgeRatio(ratio: number | null): { label: string; color: 'success' | 'warning' | 'error' | 'default' } {
  if (ratio === null) return { label: '—', color: 'default' };
  if (ratio < 1) return { label: `${ratio} 틈새`, color: 'success' };
  if (ratio <= 5) return { label: `${ratio} 보통`, color: 'warning' };
  return { label: `${ratio} 치열`, color: 'error' };
}

export default function KeywordStatsView() {
  const { enqueueSnackbar } = useSnackbar();

  // 순수 UI 상태
  const [rawInput, setRawInput] = useState('');
  const [stats, setStats] = useState<KeywordStat[]>([]);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleLookup = async () => {
    const keywords = rawInput
      .split(/[,\n]/)
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0)
      .slice(0, MAX_KEYWORDS);
    if (keywords.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetchKeywordStats(keywords);
      setIsConfigured(response.configured);
      // 경쟁강도 낮은 순 (틈새 먼저)
      setStats(
        [...response.stats].sort((a, b) => (a.ratio ?? Number.MAX_VALUE) - (b.ratio ?? Number.MAX_VALUE)),
      );
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '조회에 실패했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout
      title="키워드 검색량 조회"
      description="월간 검색수와 등록 상품 수로 키워드의 경쟁강도를 판정합니다."
      maxWidth="md"
      help={
        <HelpPanel storageKey="keyword-stats">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 후보 키워드를 쉼표나 줄바꿈으로 구분해 입력하세요 (최대 {MAX_KEYWORDS}개)</Typography>
            <Typography variant="body2">② 경쟁강도 = 등록 상품 수 ÷ 월간 검색수 — 1 미만이면 틈새, 5 초과면 치열</Typography>
            <Typography variant="body2">③ 틈새 키워드를 도매꾹에서 역검색하면 소싱 후보가 나옵니다 (원링크로 투입)</Typography>
            <Typography variant="caption" color="text.secondary">
              네이버 검색광고·쇼핑 데이터 기준이며 24시간 캐시로 갱신됩니다.
            </Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3}>
        {/* 입력 */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <TextField
              multiline
              minRows={2}
              label="키워드 (쉼표 또는 줄바꿈 구분)"
              placeholder={'캠핑 미니랜턴\n건전지 랜턴, 감성 랜턴'}
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
            />
            <Button
              variant="contained"
              onClick={handleLookup}
              disabled={isLoading || rawInput.trim().length === 0}
              startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              sx={{ alignSelf: 'flex-start' }}
            >
              검색량 조회
            </Button>
          </Stack>
        </Paper>

        {/* 키 미설정 안내 */}
        {!isConfigured && (
          <Alert severity="info">
            아직 준비 중인 기능입니다. (운영자: 네이버 API 키 발급 후 환경변수 설정 —
            docs/launch/naver-keys-guide.md)
          </Alert>
        )}

        {/* 결과 표 */}
        {stats.length > 0 && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={1}>
              <HeaderRow>
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>키워드</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ width: 110, textAlign: 'right' }}>월간 검색수</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ width: 110, textAlign: 'right' }}>상품 수</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ width: 110, textAlign: 'center' }}>경쟁강도</Typography>
              </HeaderRow>
              {stats.map((stat) => {
                const verdict = judgeRatio(stat.ratio);
                return (
                  <StatRow key={stat.keyword}>
                    <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, minWidth: 0, wordBreak: 'break-all' }}>
                      {stat.keyword}
                    </Typography>
                    <Typography variant="body2" sx={{ width: 110, textAlign: 'right' }}>
                      {stat.monthlySearches === null ? '—' : stat.isLowVolume ? '10 미만' : stat.monthlySearches.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ width: 110, textAlign: 'right' }}>
                      {stat.productCount !== null ? stat.productCount.toLocaleString() : '—'}
                    </Typography>
                    <ChipCell>
                      <Chip size="small" label={verdict.label} color={verdict.color} variant={verdict.color === 'default' ? 'outlined' : 'filled'} />
                    </ChipCell>
                  </StatRow>
                );
              })}
              <Typography variant="caption" color="text.secondary">
                경쟁강도(상품수÷검색수)가 낮은 순으로 정렬했습니다. 검색량이 있어도 경쟁정도
                {stats.some((stat) => stat.competition) && ' (광고 경쟁: ' + Array.from(new Set(stats.map((s) => s.competition).filter(Boolean))).join('·') + ')'}
                와 1페이지 리뷰 수는 직접 확인하세요.
              </Typography>
            </Stack>
          </Paper>
        )}
      </Stack>
    </PageLayout>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const HeaderRow = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  padding: theme.spacing(0, 1.5),
}));

const StatRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1, 1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
}));

const ChipCell = styled.div({
  width: 110,
  display: 'flex',
  justifyContent: 'center',
});
