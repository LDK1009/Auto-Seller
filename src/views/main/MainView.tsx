'use client';

//////////////////////////////////////// 메인 화면 (랜딩) ////////////////////////////////////////
// 구성: 히어로(슬로건 + 메인 액션 = 도매매 링크 입력) → 진행 3단계 → STEP별 도구 → 약속 3가지 → FAQ → 푸터.
// 원칙: 메인 액션 1개 — 링크만 넣으면 여정이 시작된다. 문구는 docs/BRAND.md 준수 (검증 안 된 수치·과장 금지).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from '@emotion/styled';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import NoAccountsIcon from '@mui/icons-material/NoAccounts';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { APP_NAME_EN, SLOGAN_LINES } from '@/shared/constants/app';
import { TOOLS, TOOL_GROUPS } from '@/shared/constants/tools';

//////////////////// 진행 3단계 (여정 메시지 — 도구 나열이 아니라 흐름) ////////////////////
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
  { icon: <MoneyOffIcon color="primary" />, title: '무료', description: '지금 제공하는 모든 도구는 장당 과금 없이 무제한' },
  { icon: <NoAccountsIcon color="primary" />, title: '가입 없음', description: '열면 바로 사용 — 계정도 로그인도 없습니다' },
  {
    icon: <LockOutlinedIcon color="primary" />,
    title: '내 이미지는 브라우저에서',
    description: '내가 올린 이미지는 서버로 가지 않습니다',
  },
];

//////////////////// FAQ (사실 기반 — BRAND 4장 톤) ////////////////////
const FAQS = [
  {
    question: '정말 무료인가요?',
    answer: '네. 지금 제공하는 모든 도구는 장당 과금 없이 무료로 쓸 수 있습니다.',
  },
  {
    question: '가입 없이 어떻게 쓰나요?',
    answer:
      '이미지 처리가 브라우저 안에서 끝나기 때문에 계정이 필요 없습니다. 페이지를 열면 바로 작업을 시작할 수 있습니다.',
  },
  {
    question: '내 이미지는 어디로 가나요?',
    answer:
      '내가 올린 이미지는 서버로 전송되지 않고 내 브라우저에서만 처리됩니다. 도매매 링크로 가져온 상품 이미지는 전달용으로만 서버를 거치며 저장하지 않습니다.',
  },
  {
    question: '도매매 상품 이미지는 마음대로 써도 되나요?',
    answer:
      '공급사마다 이미지 사용 조건이 다릅니다. 도매매 가져오기에서 공급사의 사용 조건 원문을 보여드리니, 확인 후 진행하세요.',
  },
];

export default function MainView() {
  const router = useRouter();
  const [linkInput, setLinkInput] = useState('');

  ////////// 메인 액션: 링크 입력 → 도매매 가져오기 자동 조회 진입
  const startWithLink = () => {
    const trimmed = linkInput.trim();
    if (trimmed.length === 0) return;
    router.push(`/domeme-import?input=${encodeURIComponent(trimmed)}`);
  };

  return (
    <>
      {/* 히어로 — 슬로건 + 메인 액션 */}
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
            </Typography>

            {/* 메인 액션: 링크 입력 */}
            <ActionCard>
              <TextField
                fullWidth
                size="medium"
                placeholder="도매매 상품 링크를 붙여넣으세요"
                value={linkInput}
                onChange={(event) => setLinkInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') startWithLink();
                }}
              />
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={startWithLink}
                disabled={linkInput.trim().length === 0}
                sx={{ flexShrink: 0 }}
              >
                시작하기
              </Button>
            </ActionCard>
            <Typography variant="caption" color="text.secondary">
              무료 · 가입 없음 · 내가 올린 이미지는 서버로 가지 않습니다
            </Typography>
          </Stack>
        </Container>
      </HeroSection>

      <Container maxWidth="md">
        <Stack spacing={9} sx={{ pb: 10 }}>
          {/* 진행 3단계 */}
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

          {/* STEP별 도구 (작업 플로우 순서) */}
          <Stack spacing={5}>
            <Stack spacing={1} sx={{ textAlign: 'center' }}>
              <Typography variant="h5">필요한 기능만 골라 쓸 수도 있습니다</Typography>
              <Typography variant="body2" color="text.secondary">
                셀러의 작업 순서 그대로 배치했습니다
              </Typography>
            </Stack>

            {TOOL_GROUPS.map((group) => (
              <Stack key={group.key} spacing={2}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <StepBadge>{group.step}</StepBadge>
                  <Stack>
                    <Typography variant="subtitle1">{group.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.description}
                    </Typography>
                  </Stack>
                </Stack>
                <ToolGrid>
                  {TOOLS.filter((tool) => tool.group === group.key).map((tool) => (
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
            ))}

            {/* STEP 3 — 등록 (준비 중 예고) */}
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <StepBadge>3</StepBadge>
                <Stack>
                  <Typography variant="subtitle1">등록</Typography>
                  <Typography variant="caption" color="text.secondary">
                    완성한 이미지로 마켓에 올립니다
                  </Typography>
                </Stack>
              </Stack>
              <UpcomingCard>
                <StorefrontIcon color="disabled" fontSize="large" />
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    스마트스토어 원클릭 등록
                  </Typography>
                  <Chip size="small" label="준비 중" />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  준비된 이미지 세트를 스마트스토어에 바로 등록하는 기능을 만들고 있습니다.
                </Typography>
              </UpcomingCard>
            </Stack>
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

          {/* FAQ */}
          <Stack spacing={3}>
            <Typography variant="h5" sx={{ textAlign: 'center' }}>
              자주 묻는 질문
            </Typography>
            <Stack spacing={1}>
              {FAQS.map((faq) => (
                <FaqAccordion key={faq.question} disableGutters elevation={0}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">{faq.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary">
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </FaqAccordion>
              ))}
            </Stack>
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
  padding: theme.spacing(11, 0, 9),
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

// 메인 액션 카드: 링크 입력 + 시작 버튼
const ActionCard = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  width: '100%',
  maxWidth: 640,
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[4],
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}));

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
  flexShrink: 0,
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

const UpcomingCard = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  border: `1px dashed ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const FaqAccordion = styled(Accordion)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: `${theme.shape.borderRadius}px !important`,
  backgroundColor: theme.palette.background.paper,
  '&::before': { display: 'none' },
}));
