'use client';

//////////////////////////////////////// 메인 화면 (랜딩) ////////////////////////////////////////
// 구성: 히어로(슬로건 3행 + 서브카피 + CTA 1개) → 여정 3단계 → 약속 3가지 → 도구 그리드 → 푸터.
// 문구는 docs/BRAND.md 준수 — 검증 안 된 수치·과장 금지, 지금 제공하는 것만 사실대로.

import styled from '@emotion/styled';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import NoAccountsIcon from '@mui/icons-material/NoAccounts';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { APP_NAME_EN, SLOGAN_LINES } from '@/shared/constants/app';
import { TOOLS } from '@/shared/constants/tools';

//////////////////// 여정 3단계 (핵심 메시지: 도구 나열이 아니라 흐름) ////////////////////
const JOURNEY_STEPS = [
  {
    step: '1',
    title: '도매매 링크 붙여넣기',
    description: '팔 상품의 링크 하나면 준비 끝. 대표·상세 이미지를 모아옵니다.',
  },
  {
    step: '2',
    title: '브라우저에서 이미지 가공',
    description: '누끼, 배경 교체, 규격 변환, 워터마크까지 — 포토샵 없이.',
  },
  {
    step: '3',
    title: 'ZIP으로 한 번에 다운로드',
    description: '등록용 이미지 세트가 완성됩니다. 남은 건 등록뿐.',
  },
];

//////////////////// 약속 3가지 (BRAND 6장 핵심 메시지 블록) ////////////////////
const PROMISES = [
  { icon: <MoneyOffIcon color="primary" />, title: '무료', description: '장당 과금 없이 무제한' },
  { icon: <NoAccountsIcon color="primary" />, title: '가입 없음', description: '열면 바로 사용' },
  {
    icon: <LockOutlinedIcon color="primary" />,
    title: '내 이미지는 브라우저에서',
    description: '내가 올린 이미지는 서버로 가지 않습니다',
  },
];

export default function MainView() {
  return (
    <>
      {/* 히어로 */}
      <HeroSection>
        <CheckerboardLayer aria-hidden />
        <Container maxWidth="md">
          <Stack spacing={4} sx={{ position: 'relative', alignItems: 'center', textAlign: 'center' }}>
            <Typography component="h1" variant="h3" sx={{ lineHeight: 1.25 }}>
              {/* 슬로건은 3행 줄바꿈 그대로 (BRAND 3장) */}
              {SLOGAN_LINES.map((line, index) => (
                <SloganLine key={line} $isAccent={index === 2}>
                  {line}
                </SloganLine>
              ))}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: 560 }}>
              도매매 링크 하나로 — 이미지 가공부터 다운로드까지.
              <br />
              무료 · 가입 없음 · 내 이미지는 서버로 가지 않습니다.
            </Typography>

            {/* 핵심 행동 1개 (BRAND 7장 원칙 1) */}
            <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
              <Button
                component={Link}
                href="/domeme-import"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
              >
                도매매 링크로 시작하기
              </Button>
              <QuietLink href="/background-removal">
                <Typography variant="body2" color="text.secondary">
                  이미지만 올려서 시작하기 →
                </Typography>
              </QuietLink>
            </Stack>
          </Stack>
        </Container>
      </HeroSection>

      <Container maxWidth="md">
        <Stack spacing={8} sx={{ pb: 10 }}>
          {/* 여정 3단계 */}
          <Stack spacing={3}>
            <Typography variant="h5" sx={{ textAlign: 'center' }}>
              밤에 하던 노가다, 세 단계로 끝냅니다
            </Typography>
            <StepGrid>
              {JOURNEY_STEPS.map((item) => (
                <StepCard key={item.step}>
                  <StepBadge>{item.step}</StepBadge>
                  <Typography variant="subtitle1">{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </StepCard>
              ))}
            </StepGrid>
          </Stack>

          {/* 약속 3가지 */}
          <PromiseRow>
            {PROMISES.map((promise) => (
              <PromiseItem key={promise.title}>
                {promise.icon}
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2">{promise.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {promise.description}
                  </Typography>
                </Stack>
              </PromiseItem>
            ))}
          </PromiseRow>

          {/* 도구 그리드 */}
          <Stack spacing={3}>
            <Typography variant="h5" sx={{ textAlign: 'center' }}>
              도구 전부, 그대로 무료
            </Typography>
            <ToolGrid>
              {TOOLS.map((tool) => (
                <ToolCard key={tool.href} href={tool.href}>
                  {tool.icon}
                  <Typography variant="subtitle1">{tool.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tool.description}
                  </Typography>
                </ToolCard>
              ))}
            </ToolGrid>
          </Stack>

          {/* 푸터 */}
          <Stack spacing={2}>
            <Divider />
            <Stack direction="row" sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }} useFlexGap>
              <Typography variant="caption" color="text.secondary">
                © 2026 {APP_NAME_EN}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                내가 올린 이미지는 서버로 가지 않습니다
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const HeroSection = styled.section(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  padding: theme.spacing(12, 0, 10),
}));

// 시그니처 모티프: 투명 체커보드 (누끼의 상징 — BRAND 7장 원칙 6)
const CheckerboardLayer = styled.div(({ theme }) => {
  const cell = theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.035)' : 'rgba(255, 255, 255, 0.05)';
  return {
    position: 'absolute',
    inset: 0,
    backgroundImage: [
      `linear-gradient(45deg, ${cell} 25%, transparent 25%)`,
      `linear-gradient(-45deg, ${cell} 25%, transparent 25%)`,
      `linear-gradient(45deg, transparent 75%, ${cell} 75%)`,
      `linear-gradient(-45deg, transparent 75%, ${cell} 75%)`,
    ].join(','),
    backgroundSize: '28px 28px',
    backgroundPosition: '0 0, 0 14px, 14px -14px, -14px 0',
    maskImage: 'radial-gradient(ellipse 70% 65% at 50% 40%, black 20%, transparent 75%)',
  };
});

const SloganLine = styled.span<{ $isAccent: boolean }>(({ theme, $isAccent }) => ({
  display: 'block',
  color: $isAccent ? theme.palette.primary.main : theme.palette.text.primary,
}));

const QuietLink = styled(Link)({
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
});

const StepGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
  },
}));

const StepCard = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const StepBadge = styled.div(({ theme }) => ({
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontSize: 14,
  fontWeight: 700,
}));

const PromiseRow = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
  },
}));

const PromiseItem = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(1.5),
  padding: theme.spacing(2, 2.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
}));

const ToolGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: theme.spacing(2),
}));

const ToolCard = styled(Link)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: theme.spacing(3),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  textDecoration: 'none',
  color: 'inherit',
  transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[3],
  },
}));
