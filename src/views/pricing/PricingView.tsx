'use client';

//////////////////////////////////////// 구독 관리 (/pricing) ////////////////////////////////////////
// 판매 비노출 상태 — 어디서도 링크하지 않음(프로필 메뉴 제외), noindex. S2 판매 개시 시 노출 스위치만 켠다.
// 비로그인: 로그인 유도 / 로그인+무구독: 플랜 카드+구독 시작 / 구독 중: 상태·다음 결제일·해지.

import styled from '@emotion/styled';
import dayjs from 'dayjs';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { useSnackbar } from 'notistack';
import { signInWithKakao } from '@/shared/services/authService';
import { SUBSCRIPTION_PLAN } from '@/shared/constants/billing';
import { useSubscription } from './_hooks/useSubscription';

const STATUS_LABEL: Record<string, { label: string; color: 'success' | 'default' | 'error' }> = {
  active: { label: '구독 중', color: 'success' },
  canceled: { label: '해지됨', color: 'default' },
  past_due: { label: '결제 실패 — 재시도 예정', color: 'error' },
};

export default function PricingView() {
  const { enqueueSnackbar } = useSnackbar();
  const { session, isSessionLoading, subscription, isLoading, isProcessing, subscribe, cancel } = useSubscription();

  const handleSignIn = async () => {
    try {
      await signInWithKakao();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '로그인에 실패했습니다.', { variant: 'error' });
    }
  };

  const isBusy = isSessionLoading || isLoading;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={4}>
        <Stack spacing={1} sx={{ textAlign: 'center' }}>
          <Typography component="h1" variant="h4">
            구독 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            결제·구독 상태를 관리합니다
          </Typography>
        </Stack>

        {isBusy ? (
          <Stack sx={{ alignItems: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : !session ? (
          // 비로그인
          <PlanCard>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              구독 관리는 로그인 후 이용할 수 있습니다.
            </Typography>
            <Button variant="contained" size="large" onClick={handleSignIn}>
              로그인
            </Button>
          </PlanCard>
        ) : subscription && subscription.status !== 'canceled' ? (
          // 구독 중 (active·past_due)
          <PlanCard>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">{SUBSCRIPTION_PLAN.name}</Typography>
              <Chip
                size="small"
                color={STATUS_LABEL[subscription.status]?.color ?? 'default'}
                label={STATUS_LABEL[subscription.status]?.label ?? subscription.status}
              />
            </Stack>
            <Divider />
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                월 {SUBSCRIPTION_PLAN.monthlyPrice.toLocaleString()}원
              </Typography>
              {subscription.current_period_end && (
                <Typography variant="body2" color="text.secondary">
                  다음 결제일: {dayjs(subscription.current_period_end).format('YYYY년 M월 D일')}
                </Typography>
              )}
            </Stack>
            <Button color="error" size="small" onClick={cancel} disabled={isProcessing} sx={{ alignSelf: 'flex-start' }}>
              구독 해지
            </Button>
          </PlanCard>
        ) : (
          // 무구독 (또는 해지됨) — 플랜 카드
          <PlanCard>
            <Stack spacing={0.5}>
              <Typography variant="h6">{SUBSCRIPTION_PLAN.name}</Typography>
              <Typography variant="h4">
                월 {SUBSCRIPTION_PLAN.monthlyPrice.toLocaleString()}원
              </Typography>
            </Stack>
            <Divider />
            {subscription?.status === 'canceled' && subscription.current_period_end && (
              <Typography variant="caption" color="text.secondary">
                해지된 구독의 이용 기간: {dayjs(subscription.current_period_end).format('YYYY년 M월 D일')}까지
              </Typography>
            )}
            <Button variant="contained" size="large" onClick={subscribe} disabled={isProcessing}>
              {isProcessing ? '처리 중…' : '카드 등록하고 구독 시작'}
            </Button>
            <Typography variant="caption" color="text.secondary">
              등록한 카드로 매월 자동 결제됩니다. 언제든 해지할 수 있으며, 해지 시 남은 기간까지 이용
              가능합니다. 환불은 환불 규정을 따릅니다.
            </Typography>
          </PlanCard>
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
