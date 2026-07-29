'use client';

//////////////////////////////////////// 요금제·구독 관리 (/pricing) ////////////////////////////////////////
// 2026-07-29 유료화 재구성 (가격정책.md):
// - 구독 월 9,900 = 품절 자동감시(50개) + 월 30크레딧
// - 크레딧 = AI 생성 종량 (썸네일 1 · 상세 5 · 누끼 0 무료), 충전팩 3종
// 판매 개시 전에는 결제 API가 킬스위치로 차단되므로 버튼을 눌러도 안내만 나온다.

import styled from '@emotion/styled';
import dayjs from 'dayjs';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import CheckIcon from '@mui/icons-material/Check';
import { useSnackbar } from 'notistack';
import { signInWithKakao } from '@/shared/services/authService';
import { SUBSCRIPTION_PLAN, CREDIT_PACKS, CREDIT_COST, SIGNUP_BONUS_CREDITS } from '@/shared/constants/billing';
import { useSubscription } from './_hooks/useSubscription';

const STATUS_LABEL: Record<string, { label: string; color: 'success' | 'default' | 'error' }> = {
  active: { label: '구독 중', color: 'success' },
  canceled: { label: '해지됨', color: 'default' },
  past_due: { label: '결제 실패 — 재시도 예정', color: 'error' },
};

// 구독에 포함되는 것 (셀러 언어로)
const SUBSCRIPTION_BENEFITS = [
  `품절 자동감시 ${SUBSCRIPTION_PLAN.watchLimit}개 — 도매처 품절되면 알림톡으로 알려드려요`,
  `AI 생성 크레딧 매월 ${SUBSCRIPTION_PLAN.includedCredits}개 — 썸네일 ${SUBSCRIPTION_PLAN.includedCredits}장 분량`,
  '누끼·규격·워터마크 등 기존 도구는 계속 무료',
];

export default function PricingView() {
  const { enqueueSnackbar } = useSnackbar();
  const {
    session,
    isSessionLoading,
    subscription,
    creditBalance,
    isLoading,
    isProcessing,
    subscribe,
    purchase,
    cancel,
  } = useSubscription();

  const handleSignIn = async () => {
    try {
      await signInWithKakao();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '로그인에 실패했어요.', { variant: 'error' });
    }
  };

  const isBusy = isSessionLoading || isLoading;
  const isSubscribed = Boolean(subscription && subscription.status !== 'canceled');

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Stack spacing={5}>
        <Stack spacing={1} sx={{ textAlign: 'center' }}>
          <Typography component="h1" variant="h4">
            요금제
          </Typography>
          <Typography variant="body2" color="text.secondary">
            지금 있는 도구는 계속 무료예요. 자동감시와 AI 생성만 유료예요.
          </Typography>
        </Stack>

        {isBusy ? (
          <Stack sx={{ alignItems: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : !session ? (
          <PlanCard>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              로그인하면 요금제를 시작하고 크레딧을 관리할 수 있어요.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              처음 로그인하면 체험용 크레딧 {SIGNUP_BONUS_CREDITS}개를 드려요.
            </Typography>
            <Button variant="contained" size="large" onClick={handleSignIn}>
              로그인
            </Button>
          </PlanCard>
        ) : (
          <>
            {/* 크레딧 잔액 */}
            <BalanceCard>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  보유 크레딧
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {creditBalance ?? 0}
                  <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 0.5 }}>
                    개
                  </Typography>
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                썸네일 {CREDIT_COST.thumbnail}개 · 상세페이지 {CREDIT_COST.detail_page}개
                <br />
                누끼는 크레딧 없이 무료
              </Typography>
            </BalanceCard>

            {/* 구독 */}
            <PlanCard>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">{SUBSCRIPTION_PLAN.name}</Typography>
                {isSubscribed && subscription && (
                  <Chip
                    size="small"
                    color={STATUS_LABEL[subscription.status]?.color ?? 'default'}
                    label={STATUS_LABEL[subscription.status]?.label ?? subscription.status}
                  />
                )}
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                월 {SUBSCRIPTION_PLAN.monthlyPrice.toLocaleString()}원
              </Typography>
              <Divider />
              <Stack spacing={1}>
                {SUBSCRIPTION_BENEFITS.map((benefit) => (
                  <Stack key={benefit} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <CheckIcon color="primary" sx={{ fontSize: 18, mt: 0.25 }} />
                    <Typography variant="body2" color="text.secondary">
                      {benefit}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              {isSubscribed && subscription?.current_period_end && (
                <Typography variant="body2" color="text.secondary">
                  다음 결제일: {dayjs(subscription.current_period_end).format('YYYY년 M월 D일')}
                </Typography>
              )}

              {isSubscribed ? (
                <Button color="error" size="small" onClick={cancel} disabled={isProcessing} sx={{ alignSelf: 'flex-start' }}>
                  구독 해지
                </Button>
              ) : (
                <Button variant="contained" size="large" onClick={subscribe} disabled={isProcessing}>
                  {isProcessing ? '처리 중…' : '구독 시작하기'}
                </Button>
              )}
            </PlanCard>

            {/* 크레딧 충전 */}
            <Stack spacing={1.5}>
              <Typography variant="h6">크레딧 충전</Typography>
              <Typography variant="body2" color="text.secondary">
                구독 없이도 충전해서 쓸 수 있어요. 등록한 카드로 바로 결제돼요.
              </Typography>
              <PackGrid>
                {CREDIT_PACKS.map((pack) => (
                  <PackCard key={pack.id}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {pack.credits}개
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pack.price.toLocaleString()}원
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      개당 {Math.round(pack.price / pack.credits)}원
                    </Typography>
                    <Button variant="outlined" fullWidth onClick={() => purchase(pack.id)} disabled={isProcessing}>
                      충전
                    </Button>
                  </PackCard>
                ))}
              </PackGrid>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              등록한 카드로 매월 자동 결제되고, 언제든 해지할 수 있어요. 해지해도 남은 기간까지는 이용할 수 있어요.
              환불은 환불 규정을 따라요.
            </Typography>
          </>
        )}
      </Stack>
    </Container>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const PlanCard = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const BalanceCard = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  padding: theme.spacing(2.5, 3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
}));

const PackGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: theme.spacing(1.5),
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: '1fr',
  },
}));

const PackCard = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  padding: theme.spacing(2.5),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  textAlign: 'center',
  alignItems: 'center',
}));
