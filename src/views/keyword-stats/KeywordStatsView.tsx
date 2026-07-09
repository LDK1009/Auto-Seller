'use client';

//////////////////////////////////////// 키워드 분석 화면 (단일 키워드 리포트) ////////////////////////////////////////
// 키워드 1개 검색 → 핵심 지표 카드 + 종합차트 상시 노출 + 연관 키워드 표.
// 연관 키워드 클릭 = 재검색, 체크(≤4) 후 [키워드 비교] = 현재 키워드와 동일 스케일 비교.

import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useSnackbar } from 'notistack';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import {
  fetchKeywordStats,
  fetchKeywordDetail,
  fetchRelatedCompetition,
  fetchKeywordCompare,
} from '@/shared/services/keywordStatsService';
import type { KeywordStat, RelatedKeyword } from '@/shared/types/keywordStats';
import type { KeywordDetail } from '@/shared/types/keywordDetail';
import type { KeywordCompareResponse } from '@/shared/types/keywordCompare';
import KeywordDetailCard from './_components/KeywordDetailCard';
// import AiVerdictCard from './_components/AiVerdictCard'; // AI 판단 가동(카카오·키·테이블 셋업) 전까지 숨김 — 백로그 F-4
import {
  getSeasonalKeywords,
  STEADY_KEYWORDS,
  loadRecentKeywords,
  saveRecentKeyword,
} from './_constants/starterKeywords';
import StarterKeywordTable from './_components/StarterKeywordTable';
import StatSummaryCards from './_components/StatSummaryCards';
import RelatedKeywordTable from './_components/RelatedKeywordTable';
import CompareSection from './_components/CompareSection';

export default function KeywordStatsView() {
  const { enqueueSnackbar } = useSnackbar();

  // 현재 리포트 상태
  const [inputValue, setInputValue] = useState('');
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [stat, setStat] = useState<KeywordStat | null>(null);
  const [detail, setDetail] = useState<KeywordDetail | null>(null);
  const [related, setRelated] = useState<RelatedKeyword[]>([]);
  const [productCounts, setProductCounts] = useState<Map<string, number | null>>(new Map());
  const [isCountsLoaded, setIsCountsLoaded] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // 시작 키워드 (빈 화면용 — 큐레이션을 실조회 데이터로 랭킹 + 최근 검색)
  const [recentKeywords, setRecentKeywords] = useState<string[]>([]);
  const [seasonalStats, setSeasonalStats] = useState<KeywordStat[]>([]);
  const [steadyStats, setSteadyStats] = useState<KeywordStat[]>([]);
  const [isStarterLoading, setIsStarterLoading] = useState(false);

  // 비교 상태
  const [checkedKeywords, setCheckedKeywords] = useState<Set<string>>(new Set());
  const [compare, setCompare] = useState<KeywordCompareResponse | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const compareSectionRef = useRef<HTMLDivElement>(null);

  ////////// 검색 실행 (연관 클릭 재검색 포함 단일 진입점)
  const runSearch = async (rawKeyword: string) => {
    const keyword = rawKeyword.trim();
    if (keyword.length === 0) return;

    // 리포트 초기화
    setCurrentKeyword(keyword);
    setInputValue(keyword);
    setStat(null);
    setDetail(null);
    setRelated([]);
    setProductCounts(new Map());
    setIsCountsLoaded(false);
    setCheckedKeywords(new Set());
    setCompare(null);
    setIsLoading(true);
    setIsDetailLoading(true);

    // URL 동기화 (공유·새로고침 대응) + 최근 검색 기록
    window.history.replaceState(null, '', `?keyword=${encodeURIComponent(keyword)}`);
    setRecentKeywords(saveRecentKeyword(keyword));

    // 종합차트는 별도 트랙으로 병렬 로드 (기본 지표보다 느림)
    fetchKeywordDetail(keyword)
      .then((result) => setDetail(result))
      .catch((error) => {
        console.error(error);
        enqueueSnackbar(error instanceof Error ? error.message : '상세 분석에 실패했습니다.', { variant: 'error' });
      })
      .finally(() => setIsDetailLoading(false));

    try {
      const response = await fetchKeywordStats([keyword]);
      setIsConfigured(response.configured);
      setStat(response.stats[0] ?? null);
      setRelated(response.related);

      // 연관 키워드 상품 수(경쟁강도) 지연 로드 — 표는 먼저 뜨고 칸이 점진적으로 채워짐
      if (response.related.length > 0) {
        loadRelatedCounts(response.related.map((entry) => entry.keyword));
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '조회에 실패했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  ////////// 연관 상품 수 로드 — 10개씩 순차 요청 (오픈API 속도 제한 회피, 429 실측 확인)
  const loadRelatedCounts = async (keywords: string[]) => {
    const BATCH_SIZE = 10;
    try {
      for (let index = 0; index < keywords.length; index += BATCH_SIZE) {
        const counts = await fetchRelatedCompetition(keywords.slice(index, index + BATCH_SIZE));
        setProductCounts((previous) => {
          const next = new Map(previous);
          for (const [keyword, count] of Object.entries(counts)) next.set(keyword, count);
          return next;
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsCountsLoaded(true);
    }
  };

  ////////// 시작 키워드 실조회 (검색수 내림차순 랭킹 — 요청당 10개 제한이라 스테디는 분할)
  const loadStarterStats = async () => {
    setIsStarterLoading(true);
    try {
      const rankBySearches = (stats: KeywordStat[]) =>
        [...stats].sort((a, b) => (b.monthlySearches ?? -1) - (a.monthlySearches ?? -1));
      const [seasonalResponse, steadyFirst, steadyRest] = await Promise.all([
        fetchKeywordStats(getSeasonalKeywords()),
        fetchKeywordStats(STEADY_KEYWORDS.slice(0, 10)),
        STEADY_KEYWORDS.length > 10 ? fetchKeywordStats(STEADY_KEYWORDS.slice(10)) : Promise.resolve(null),
      ]);
      setIsConfigured(seasonalResponse.configured);
      setSeasonalStats(rankBySearches(seasonalResponse.stats));
      setSteadyStats(rankBySearches([...steadyFirst.stats, ...(steadyRest?.stats ?? [])]));
    } catch (error) {
      console.error(error);
    } finally {
      setIsStarterLoading(false);
    }
  };

  ////////// 최초 진입: URL의 ?keyword= 자동 검색, 없으면 시작 키워드 로드 + 최근 검색 복원
  useEffect(() => {
    setRecentKeywords(loadRecentKeywords());
    const initialKeyword = new URLSearchParams(window.location.search).get('keyword');
    if (initialKeyword && initialKeyword.trim().length > 0) {
      runSearch(initialKeyword);
    } else {
      loadStarterStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  ////////// 비교 체크 토글
  const handleToggleCheck = (keyword: string) => {
    setCheckedKeywords((previous) => {
      const next = new Set(previous);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  };

  ////////// 키워드 비교 실행 (현재 키워드 + 체크 키워드 — 데이터랩 단일 요청으로 동일 스케일 확보)
  const handleCompare = async () => {
    if (checkedKeywords.size === 0 || currentKeyword.length === 0) return;
    setIsComparing(true);
    try {
      const result = await fetchKeywordCompare([currentKeyword, ...checkedKeywords]);
      setCompare(result);
      // 렌더 후 비교 섹션으로 스크롤
      requestAnimationFrame(() => {
        compareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '키워드 비교에 실패했습니다.', { variant: 'error' });
    } finally {
      setIsComparing(false);
    }
  };

  const hasResult = stat !== null;

  return (
    <PageLayout
      title="키워드 분석"
      description="검색수·경쟁강도부터 트렌드·시장 상황까지 — 팔릴 키워드를 판정합니다."
      maxWidth="md"
      help={
        <HelpPanel storageKey="keyword-stats">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 키워드를 입력하고 [분석]을 누르세요</Typography>
            <Typography variant="body2">② 연관 키워드를 클릭하면 그 키워드로 다시 분석됩니다</Typography>
            <Typography variant="body2">③ 비교할 키워드를 체크하고 [키워드 비교]를 누르세요</Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3} sx={{ pb: checkedKeywords.size > 0 ? 10 : 0 }}>
        {/* 검색바 */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack direction="row" spacing={1.5}>
            <TextField
              fullWidth
              size="medium"
              label="키워드"
              placeholder="캠핑 미니랜턴"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runSearch(inputValue);
              }}
            />
            <Button
              variant="contained"
              onClick={() => runSearch(inputValue)}
              disabled={isLoading || inputValue.trim().length === 0}
              startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              sx={{ flexShrink: 0, px: 3 }}
            >
              분석
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

        {/* 시작 키워드 (검색 전 빈 화면) — 랭킹 표 상하 배치 + 최근 검색. 도매꾹 인기검색어 승인 후 교체 예정 */}
        {!hasResult && !isLoading && (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <StarterKeywordTable
                title="이번 달 뜨는 키워드"
                stats={seasonalStats}
                isLoading={isStarterLoading}
                onSelectKeyword={runSearch}
              />
            </Paper>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <StarterKeywordTable
                title="일 년 내내 꾸준한 키워드"
                stats={steadyStats}
                isLoading={isStarterLoading}
                onSelectKeyword={runSearch}
              />
            </Paper>
            {recentKeywords.length > 0 && (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">최근 분석한 키워드</Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                    {recentKeywords.map((keyword) => (
                      <Chip key={keyword} label={keyword} variant="outlined" onClick={() => runSearch(keyword)} />
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}

        {/* ⓪ AI 판단 — 가동 셋업 완료 후 노출 (백로그 F-4)
        {hasResult && <AiVerdictCard keyword={currentKeyword} stat={stat} detail={detail} />} */}

        {/* ① 핵심 지표 카드 */}
        {hasResult && (
          <Stack spacing={1}>
            <Typography variant="subtitle2">‘{currentKeyword}’ 분석 결과</Typography>
            <StatSummaryCards stat={stat} />
          </Stack>
        )}

        {/* ② 종합차트 (상시 노출 — 검색과 동시에 로드) */}
        {hasResult && isDetailLoading && (
          <LoadingBox>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              트렌드·시장 상황 분석 중…
            </Typography>
          </LoadingBox>
        )}
        {hasResult && !isDetailLoading && detail && <KeywordDetailCard detail={detail} />}

        {/* ③ 연관 키워드 표 (체크 = 비교, 클릭 = 재검색) */}
        {hasResult && related.length > 0 && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <RelatedKeywordTable
              related={related}
              productCounts={productCounts}
              isCountsLoaded={isCountsLoaded}
              checkedKeywords={checkedKeywords}
              onToggleCheck={handleToggleCheck}
              onSelectKeyword={(keyword) => {
                runSearch(keyword);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </Paper>
        )}

        {/* ④ 비교 결과 섹션 */}
        {compare && compare.entries.length >= 2 && (
          <div ref={compareSectionRef}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <CompareSection entries={compare.entries} />
            </Paper>
          </div>
        )}
      </Stack>

      {/* 하단 고정 비교 바 (체크 1개 이상일 때) */}
      {checkedKeywords.size > 0 && (
        <CompareBar elevation={8}>
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ‘{currentKeyword}’ + {checkedKeywords.size}개 선택됨
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button size="small" color="inherit" onClick={() => setCheckedKeywords(new Set())} disabled={isComparing}>
              선택 해제
            </Button>
            <Button
              variant="contained"
              onClick={handleCompare}
              disabled={isComparing}
              startIcon={isComparing ? <CircularProgress size={16} color="inherit" /> : <CompareArrowsIcon />}
            >
              키워드 비교
            </Button>
          </Stack>
        </CompareBar>
      )}
    </PageLayout>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const LoadingBox = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(2.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
}));

const CompareBar = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2.5),
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: theme.zIndex.appBar,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  width: 'min(560px, calc(100vw - 32px))',
  padding: theme.spacing(1.25, 2),
  borderRadius: theme.spacing(2),
}));
