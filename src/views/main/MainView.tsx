'use client';

//////////////////////////////////////// 메인 화면 (랜딩) ////////////////////////////////////////
// 구성: 히어로(슬로건 + 링크 입력) → 진행 3단계(타임라인) → STEP별 도구 → 약속 → FAQ → 하단 CTA → 푸터.
// 레이아웃 원칙:
// - 세로 리스트, 항목 = [왼쪽 순번/아이콘 + 오른쪽 제목·설명] 한 덩어리
// - 흰/회색 밴드 교차로 섹션 호흡 (토스식 리듬)
// - 문구는 docs/기획/PLAN.md 9장(브랜드·마케팅) + docs/개발/design/README.md UX 라이팅 준수 (검증 안 된 수치·과장 금지)

import { Fragment, useRef, useState } from 'react';
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
import { BUSINESS_INFO } from '@/shared/constants/business';
import BestProductsSection from './_components/BestProductsSection';
import { TOOLS, TOOL_GROUPS, FLAGSHIP_TOOL } from '@/shared/constants/tools';
import { transientOptions } from '@/shared/utils/emotionTransientProps';
import { trackEvent } from '@/shared/utils/analytics';

//////////////////// 진행 3단계 (여정 메시지 — 도구 나열이 아니라 흐름) ////////////////////
const JOURNEY_STEPS = [
  {
    step: '1',
    title: '도매꾹 링크 붙여넣기',
    description: '팔 상품의 링크 하나면 준비 끝. 이미지·가격·옵션·배송 정보를 모아와요.',
  },
  {
    step: '2',
    title: '이미지 클릭해서 편집',
    description: '누끼, 배경 교체, 워터마크, 상세 잘라오기까지 — 포토샵 없이 브라우저에서.',
  },
  {
    step: '3',
    title: '등록 정보 그대로 붙여넣기',
    description: '카테고리부터 상품명·판매가·태그까지, 스마트스토어 폼 순서 그대로 복사해 넣으면 끝.',
  },
];

//////////////////// 약속 3가지 (BRAND 6장 핵심 메시지 블록) ////////////////////
const PROMISES = [
  {
    icon: <MoneyOffIcon color="primary" />,
    title: '무료',
    description: '지금 제공하는 모든 도구는 장당 과금 없이 무제한이에요.',
  },
  {
    icon: <NoAccountsIcon color="primary" />,
    title: '가입 없음',
    description: '열면 바로 사용 — 계정도 로그인도 없어요.',
  },
  {
    icon: <LockOutlinedIcon color="primary" />,
    title: '내 이미지는 브라우저에서',
    description: '내가 올린 이미지는 서버로 가지 않아요.',
  },
];

//////////////////// FAQ (사실 기반 — BRAND 4장 톤) ////////////////////
const FAQS = [
  {
    question: '정말 무료인가요?',
    answer: '네. 지금 제공하는 모든 도구는 장당 과금 없이 무료로 쓸 수 있어요.',
  },
  {
    question: '가입 없이 어떻게 쓰나요?',
    answer:
      '이미지 처리가 브라우저 안에서 끝나기 때문에 계정이 필요 없어요. 페이지를 열면 바로 작업을 시작할 수 있어요.',
  },
  {
    question: '내 이미지는 어디로 가나요?',
    answer:
      '내가 올린 이미지는 서버로 전송되지 않고 내 브라우저에서만 처리돼요. 도매꾹 링크로 가져온 상품 이미지는 전달용으로만 서버를 거치며 저장하지 않아요.',
  },
  {
    question: '도매꾹 상품 이미지는 마음대로 써도 되나요?',
    answer:
      '공급사마다 이미지 사용 조건이 달라요. 원링크에서 공급사의 사용 조건 원문을 보여드리니, 확인 후 진행하세요.',
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
              {APP_DESCRIPTION}
            </Typography>
            <HeroActions />
          </Stack>
        </Container>
      </HeroBand>

      {/* 베스트 상품 후킹 — 링크 없이 온 방문자를 클릭 한 번으로 원링크 체험에 태운다 */}
      <Band $tone="default">
        <Container maxWidth="md">
          <BestProductsSection />
        </Container>
      </Band>

      {/* 진행 3단계 — 타임라인 (흰 밴드) */}
      <Band $tone="paper">
        <Container maxWidth="md">
          <SectionColumn>
            <Typography variant="h5" sx={{ textAlign: 'center' }}>
              밤에 하던 노가다, 세 단계로 끝내요
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
              <Typography variant="h5">필요한 기능만 골라 쓸 수도 있어요</Typography>
              <Typography variant="body2" color="text.secondary">
                셀러의 작업 순서 그대로 배치했어요
              </Typography>
            </Stack>

            {TOOL_GROUPS.map((group) => (
              <Fragment key={group.key}>
                <Stack spacing={1.5}>
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

                {/* STEP 3 — 등록 (준비 중 예고): 여정 순서상 등록 준비(2) 바로 다음 */}
                {group.key === 'image' && (
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <StepNumber>3</StepNumber>
                      <Stack>
                        <Typography variant="subtitle1">등록</Typography>
                        <Typography variant="caption" color="text.secondary">
                          완성한 이미지로 마켓에 올려요
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
                          준비된 이미지 세트를 스마트스토어에 바로 등록하는 기능을 만들고 있어요.
                        </Typography>
                      </Stack>
                    </UpcomingRow>
                  </Stack>
                )}
              </Fragment>
            ))}
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
            <Typography variant="h5">지금 링크 하나면 시작돼요</Typography>
            <HeroActions />
          </Stack>
        </Container>
      </CtaBand>

      {/* 푸터 — 사업자 표기(PG 심사·전자상거래법 요건) + 법적 문서 링크 */}
      <Band $tone="default">
        <Container maxWidth="md">
          <Stack spacing={2}>
            <Divider />
            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}
              useFlexGap
            >
              <Stack spacing={0.75}>
                <Typography variant="subtitle2">{APP_NAME_EN}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {APP_DESCRIPTION}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  상호: {BUSINESS_INFO.companyName} · 대표: {BUSINESS_INFO.representative}
                  <br />
                  사업자등록번호: {BUSINESS_INFO.registrationNumber}
                  <br />
                  주소: {BUSINESS_INFO.address}
                  <br />
                  문의: {BUSINESS_INFO.email} · {BUSINESS_INFO.phone}
                </Typography>
              </Stack>
              <Stack spacing={0.75} sx={{ alignItems: 'flex-end' }}>
                <Stack direction="row" spacing={1.5}>
                  <FooterLink href="/terms">이용약관</FooterLink>
                  <FooterLink href="/privacy">개인정보처리방침</FooterLink>
                  <FooterLink href="/refund-policy">환불 규정</FooterLink>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  © 2026 {APP_NAME_EN}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </Band>
    </>
  );
}

//////////////////// 히어로 액션 블록 (히어로·하단 CTA 공용 — 3단 위계) ////////////////////
// 1순위: 링크 입력(원링크) / 2순위: 워크스페이스(구경 방문자) / 3순위: 키워드 분석(소싱 미결정자)
function HeroActions() {
  return (
    <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 640, alignItems: 'center' }}>
      <LinkForm />
      <Button
        component={Link}
        href={FLAGSHIP_TOOL.href}
        variant="outlined"
        size="large"
        fullWidth
        onClick={() => trackEvent('workspace_from_landing')}
        sx={{
          // 체커보드 배경 위에서 묻히지 않게 흰 배경
          backgroundColor: 'background.paper',
          '&:hover': { backgroundColor: 'background.paper' },
        }}
      >
        가입 없이 워크스페이스 시작
      </Button>
      {/* 소싱 미결정자 탈출구 (SERVICE 1장 수용 원칙) — 클릭률이 높아지면 여정 서사 개편 근거 */}
      <Typography variant="body2" color="text.secondary">
        아직 팔 상품을 못 정했다면?{' '}
        <StarterHintLink href="/keyword-stats" onClick={() => trackEvent('keyword_start_from_landing')}>
          키워드 분석으로 시작 →
        </StarterHintLink>
      </Typography>
    </Stack>
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
    router.push(`/domeggook-import?input=${encodeURIComponent(trimmed)}`);
  };

  return (
    <ActionCard>
      <TextField
        fullWidth
        size="medium"
        placeholder="도매꾹 상품 링크를 붙여넣으세요"
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

// 푸터 법적 문서 링크
const FooterLink = styled(Link)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: 12,
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
}));

// 소싱 미결정자용 보조 링크 (히어로 전용)
const StarterHintLink = styled(Link)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: 600,
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
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
