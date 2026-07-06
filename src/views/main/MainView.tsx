'use client';

//////////////////////////////////////// 메인 화면 (랜딩) ////////////////////////////////////////
// 구성: 히어로(슬로건 + 링크 입력) → 진행 3단계(타임라인) → STEP별 도구 → 약속 → FAQ → 하단 CTA → 푸터.
// 레이아웃 원칙:
// - 세로 리스트, 항목 = [왼쪽 순번/아이콘 + 오른쪽 제목·설명] 한 덩어리
// - 흰/회색 밴드 교차로 섹션 호흡 (토스식 리듬)
// - 문구는 docs/BRAND.md 준수 (검증 안 된 수치·과장 금지)

import { useRef, useState } from 'react';
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
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import NoAccountsIcon from '@mui/icons-material/NoAccounts';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { APP_NAME, APP_NAME_EN, APP_DESCRIPTION, SLOGAN_LINES } from '@/shared/constants/app';
import { TOOLS, TOOL_GROUPS } from '@/shared/constants/tools';
import { transientOptions } from '@/shared/utils/emotionTransientProps';

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
  {
    icon: <MoneyOffIcon color="primary" />,
    title: '무료',
    description: '지금 제공하는 모든 도구는 장당 과금 없이 무제한입니다.',
  },
  {
    icon: <NoAccountsIcon color="primary" />,
    title: '가입 없음',
    description: '열면 바로 사용 — 계정도 로그인도 없습니다.',
  },
  {
    icon: <LockOutlinedIcon color="primary" />,
    title: '내 이미지는 브라우저에서',
    description: '내가 올린 이미지는 서버로 가지 않습니다.',
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
  return (
    <>
      {/* 히어로 — 슬로건 + 메인 액션 */}
      <HeroBand>
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
            <LinkForm />
          </Stack>
        </Container>
      </HeroBand>

      {/* 진행 3단계 — 타임라인 (흰 밴드) */}
      <Band $tone="paper">
        <Container maxWidth="md">
          <SectionColumn>
            <Typography variant="h5" sx={{ textAlign: 'center' }}>
              밤에 하던 노가다, 세 단계로 끝냅니다
            </Typography>
            <Stack>
              {JOURNEY_STEPS.map((item, index) => (
                <TimelineRow key={item.step}>
                  <TimelineRail>
                    <StepNumber>{item.step}</StepNumber>
                    {index < JOURNEY_STEPS.length - 1 && <TimelineConnector />}
                  </TimelineRail>
                  <Stack spacing={0.5} sx={{ pb: index < JOURNEY_STEPS.length - 1 ? 4 : 0 }}>
                    <Typography variant="h6">{item.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </Stack>
                </TimelineRow>
              ))}
            </Stack>
          </SectionColumn>
        </Container>
      </Band>

      {/* STEP별 도구 (회색 밴드) */}
      <Band $tone="default">
        <Container maxWidth="md">
          <SectionColumn>
            <Stack spacing={1} sx={{ textAlign: 'center' }}>
              <Typography variant="h5">필요한 기능만 골라 쓸 수도 있습니다</Typography>
              <Typography variant="body2" color="text.secondary">
                셀러의 작업 순서 그대로 배치했습니다
              </Typography>
            </Stack>

            {TOOL_GROUPS.map((group) => (
              <Stack key={group.key} spacing={1.5}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <StepNumber>{group.step}</StepNumber>
                  <Stack>
                    <Typography variant="subtitle1">{group.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.description}
                    </Typography>
                  </Stack>
                </Stack>
                <Stack spacing={1.5}>
                  {TOOLS.filter((tool) => tool.group === group.key).map((tool) => (
                    <ToolRow key={tool.href} href={tool.href}>
                      <ToolIconBox>{tool.icon}</ToolIconBox>
                      <Stack spacing={0.25} sx={{ flex: 1 }}>
                        <Typography variant="subtitle1">{tool.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {tool.description}
                        </Typography>
                      </Stack>
                      <ChevronRightIcon color="disabled" />
                    </ToolRow>
                  ))}
                </Stack>
              </Stack>
            ))}

            {/* STEP 3 — 등록 (준비 중 예고) */}
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <StepNumber>3</StepNumber>
                <Stack>
                  <Typography variant="subtitle1">등록</Typography>
                  <Typography variant="caption" color="text.secondary">
                    완성한 이미지로 마켓에 올립니다
                  </Typography>
                </Stack>
              </Stack>
              <UpcomingRow>
                <ToolIconBox>
                  <StorefrontIcon color="disabled" fontSize="large" />
                </ToolIconBox>
                <Stack spacing={0.25} sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="subtitle1" color="text.secondary">
                      스마트스토어 원클릭 등록
                    </Typography>
                    <Chip size="small" label="준비 중" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    준비된 이미지 세트를 스마트스토어에 바로 등록하는 기능을 만들고 있습니다.
                  </Typography>
                </Stack>
              </UpcomingRow>
            </Stack>
          </SectionColumn>
        </Container>
      </Band>

      {/* 약속 (흰 밴드) */}
      <Band $tone="paper">
        <Container maxWidth="md">
          <SectionColumn>
            <Typography variant="h5" sx={{ textAlign: 'center' }}>
              {APP_NAME}의 약속
            </Typography>
            <Stack spacing={1.5}>
              {PROMISES.map((promise) => (
                <PromiseRow key={promise.title}>
                  <ToolIconBox>{promise.icon}</ToolIconBox>
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle1">{promise.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {promise.description}
                    </Typography>
                  </Stack>
                </PromiseRow>
              ))}
            </Stack>
          </SectionColumn>
        </Container>
      </Band>

      {/* FAQ (회색 밴드) */}
      <Band $tone="default">
        <Container maxWidth="md">
          <SectionColumn>
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
          </SectionColumn>
        </Container>
      </Band>

      {/* 하단 CTA (흰 밴드 + 체커보드) */}
      <CtaBand>
        <CheckerboardLayer aria-hidden />
        <Container maxWidth="md">
          <Stack spacing={3} sx={{ position: 'relative', alignItems: 'center', textAlign: 'center' }}>
            <Typography variant="h5">지금 링크 하나면 시작됩니다</Typography>
            <LinkForm />
          </Stack>
        </Container>
      </CtaBand>

      {/* 푸터 */}
      <Band $tone="default">
        <Container maxWidth="md">
          <Stack spacing={2}>
            <Divider />
            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}
              useFlexGap
            >
              <Stack spacing={0.25}>
                <Typography variant="subtitle2">{APP_NAME_EN}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {APP_DESCRIPTION}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                © 2026 {APP_NAME_EN}
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Band>
    </>
  );
}

//////////////////// 링크 입력 폼 (히어로·하단 CTA 공용) ////////////////////
function LinkForm() {
  const router = useRouter();
  const [linkInput, setLinkInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 버튼은 항상 활성 — 빈 입력이면 입력창으로 포커스 유도
  const startWithLink = () => {
    const trimmed = linkInput.trim();
    if (trimmed.length === 0) {
      inputRef.current?.focus();
      return;
    }
    router.push(`/domeme-import?input=${encodeURIComponent(trimmed)}`);
  };

  return (
    <ActionCard>
      <TextField
        fullWidth
        size="medium"
        placeholder="도매매 상품 링크를 붙여넣으세요"
        value={linkInput}
        inputRef={inputRef}
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
        sx={{ flexShrink: 0 }}
      >
        시작하기
      </Button>
    </ActionCard>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
// 섹션 밴드: 흰/회색 교차로 호흡
const Band = styled('section', transientOptions)<{ $tone: 'paper' | 'default' }>(({ theme, $tone }) => ({
  backgroundColor: theme.palette.background[$tone],
  padding: theme.spacing(9, 0),
}));

const HeroBand = styled.section(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  padding: theme.spacing(11, 0, 9),
}));

const CtaBand = styled.section(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  padding: theme.spacing(9, 0),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
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

const SloganLine = styled('span', transientOptions)<{ $isAccent: boolean }>(({ theme, $isAccent }) => ({
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

// 섹션 공통: 중앙 정렬 세로 컬럼 (읽기 폭 제한으로 시선 집중)
const SectionColumn = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(4),
  width: '100%',
  maxWidth: 720,
  margin: '0 auto',
}));

//////////////////// 진행 3단계 타임라인 ////////////////////
const TimelineRow = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2.5),
}));

const TimelineRail = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const TimelineConnector = styled.div(({ theme }) => ({
  width: 2,
  flex: 1,
  backgroundColor: theme.palette.divider,
  borderRadius: 1,
}));

const StepNumber = styled.div(({ theme }) => ({
  width: 36,
  height: 36,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontSize: 16,
  fontWeight: 700,
}));

//////////////////// 도구·약속 리스트 ////////////////////
const ToolIconBox = styled.div({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
});

const ToolRow = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2.5),
  padding: theme.spacing(2.5, 3),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  textDecoration: 'none',
  color: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: theme.shadows[3],
  },
}));

const UpcomingRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2.5),
  padding: theme.spacing(2.5, 3),
  borderRadius: theme.shape.borderRadius,
  border: `1px dashed ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

// 약속: 흰 밴드 위 회색 인셋 박스
const PromiseRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2.5),
  padding: theme.spacing(2.5, 3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
}));

const FaqAccordion = styled(Accordion)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: `${theme.shape.borderRadius}px !important`,
  backgroundColor: theme.palette.background.paper,
  '&::before': { display: 'none' },
}));
