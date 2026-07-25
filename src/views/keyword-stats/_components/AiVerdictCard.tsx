'use client';

//////////////////////////////////////// AI 판단 카드 (분석 결과 최상단) ////////////////////////////////////////
// 상태: 비로그인 → 카카오 로그인 / 로그인 → [AI 판단 받기] / 로딩 / 결과 / 한도 소진.
// 서비스 유일의 로그인 게이트 기능 — 다른 도구는 무가입 유지 (SERVICE 포지셔닝).

import { useState } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useSnackbar } from 'notistack';
import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { isAuthConfigured, signInWithKakao } from '@/shared/services/authService';
import { fetchAiVerdict } from '@/shared/services/keywordStatsService';
import type { KeywordStat } from '@/shared/types/keywordStats';
import type { KeywordDetail } from '@/shared/types/keywordDetail';
import type { AiVerdict } from '@/shared/types/keywordVerdict';
import { AI_VERDICT_DAILY_LIMIT } from '@/shared/types/keywordVerdict';

const VERDICT_COLORS = {
  '추천': 'success',
  '보류': 'warning',
  '비추천': 'error',
} as const;

type PropsType = {
  keyword: string;
  stat: KeywordStat;
  detail: KeywordDetail | null; // 로드 중이면 null — 기본 지표만으로도 판단 가능
};

export default function AiVerdictCard({ keyword, stat, detail }: PropsType) {
  const { enqueueSnackbar } = useSnackbar();
  const { session, isSessionLoading, accessToken } = useAuthSession();

  const [verdict, setVerdict] = useState<AiVerdict | null>(null);
  const [verdictKeyword, setVerdictKeyword] = useState(''); // 재검색 시 이전 결과 노출 방지
  const [isJudging, setIsJudging] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  const currentVerdict = verdictKeyword === keyword ? verdict : null;

  ////////// AI 판단 실행
  const handleJudge = async () => {
    if (!accessToken) return;
    setIsJudging(true);
    try {
      const response = await fetchAiVerdict({ keyword, stat, detail, accessToken });
      setIsConfigured(response.configured);
      if (response.verdict) {
        setVerdict(response.verdict);
        setVerdictKeyword(keyword);
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : 'AI 판단에 실패했어요.', { variant: 'error' });
    } finally {
      setIsJudging(false);
    }
  };

  ////////// 카카오 로그인
  const handleLogin = async () => {
    try {
      await signInWithKakao();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '로그인에 실패했어요.', { variant: 'error' });
    }
  };

  return (
    <GradientCard>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <AutoAwesomeIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2">AI 판단</Typography>
        {currentVerdict && (
          <Chip size="small" color={VERDICT_COLORS[currentVerdict.verdict]} label={currentVerdict.verdict} sx={{ fontWeight: 700 }} />
        )}
      </Stack>

      {/* 키·인증 인프라 미설정 (운영자 안내) */}
      {(!isConfigured || !isAuthConfigured) && (
        <Typography variant="caption" color="text.secondary">
          AI 판단은 준비 중이에요. (운영자: docs/개발/ROADMAP.md의 AI 판단 가동 절차)
        </Typography>
      )}

      {/* 결과 */}
      {isConfigured && currentVerdict && (
        <Stack spacing={1}>
          <Typography variant="body2">{currentVerdict.summary}</Typography>
          {currentVerdict.reasons.length > 0 && (
            <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
              {currentVerdict.reasons.map((reason) => (
                <Typography key={reason} component="li" variant="caption" color="text.secondary">
                  {reason}
                </Typography>
              ))}
            </Stack>
          )}
          <Typography variant="caption" color="text.secondary">
            네이버 실측 지표 기반 AI 의견 — 최종 판단은 셀러 몫이에요. 오늘 남은 횟수 {currentVerdict.remaining}회
          </Typography>
        </Stack>
      )}

      {/* 액션 (결과 없을 때) */}
      {isConfigured && isAuthConfigured && !currentVerdict && !isSessionLoading && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          {session ? (
            <>
              <Button
                variant="contained"
                size="small"
                onClick={handleJudge}
                disabled={isJudging}
                startIcon={isJudging ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
              >
                {isJudging ? '판단 중…' : 'AI 판단 받기'}
              </Button>
              <Typography variant="caption" color="text.secondary">
                13종 지표를 종합해 진입 여부를 판단해드려요 (하루 {AI_VERDICT_DAILY_LIMIT}회 무료)
              </Typography>
            </>
          ) : (
            <>
              <KakaoButton size="small" onClick={handleLogin}>
                카카오 로그인하고 AI 판단 받기
              </KakaoButton>
              <Typography variant="caption" color="text.secondary">
                로그인하면 하루 {AI_VERDICT_DAILY_LIMIT}회 무료 — 다른 도구는 로그인 없이 그대로 쓸 수 있어요
              </Typography>
            </>
          )}
        </Stack>
      )}
    </GradientCard>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const GradientCard = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.25),
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.primary.light}`,
  background: `linear-gradient(135deg, ${theme.palette.primary.main}0D, ${theme.palette.background.paper})`,
}));

// 카카오 브랜드 가이드 색 (노랑 배경 + 검정 텍스트)
const KakaoButton = styled(Button)({
  backgroundColor: '#FEE500',
  color: 'rgba(0, 0, 0, 0.85)',
  fontWeight: 700,
  '&:hover': {
    backgroundColor: '#F4DC00',
  },
});
