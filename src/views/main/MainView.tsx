'use client';

//////////////////////////////////////// 메인 화면 ////////////////////////////////////////
// 서비스 소개 + 도구 목록 그리드.

import styled from '@emotion/styled';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import CalculateIcon from '@mui/icons-material/Calculate';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import { APP_NAME, APP_DESCRIPTION } from '@/shared/constants/app';

//////////////////// 도구 목록 ////////////////////
const TOOLS = [
  {
    href: '/background-removal',
    icon: <AutoFixHighIcon color="primary" fontSize="large" />,
    title: '대량 이미지 누끼',
    description: '여러 상품 이미지의 배경을 한 번에 제거하고 원하는 배경으로 교체',
  },
  {
    href: '/image-resize',
    icon: <AspectRatioIcon color="primary" fontSize="large" />,
    title: '이미지 규격 변환',
    description: '마켓별 대표이미지 규격(1000×1000 등)에 맞춰 일괄 변환',
  },
  {
    href: '/margin-calculator',
    icon: <CalculateIcon color="primary" fontSize="large" />,
    title: '마진 계산기',
    description: '판매가·원가·수수료·배송비로 개당 순이익과 마진율 계산',
  },
  {
    href: '/image-check',
    icon: <FactCheckIcon color="primary" fontSize="large" />,
    title: '이미지 규정 검사',
    description: '대표이미지가 마켓 규정(해상도·비율·용량)에 맞는지 즉시 검사',
  },
  {
    href: '/watermark',
    icon: <BrandingWatermarkIcon color="primary" fontSize="large" />,
    title: '워터마크 일괄 삽입',
    description: '텍스트/로고 워터마크를 여러 이미지에 한 번에 합성 (도용 방지)',
  },
  {
    href: '/image-split',
    icon: <VerticalSplitIcon color="primary" fontSize="large" />,
    title: '상세페이지 분할',
    description: '긴 상세 이미지를 마켓 높이 제한에 맞춰 순서대로 자동 분할',
  },
];

export default function MainView() {
  return (
    <Container maxWidth="md">
      <Stack spacing={5} sx={{ py: 10 }}>
        {/* 히어로 */}
        <Stack spacing={1.5}>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            {APP_NAME}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            {APP_DESCRIPTION}
          </Typography>
        </Stack>

        {/* 도구 그리드 */}
        <ToolGrid>
          {TOOLS.map((tool) => (
            <ToolCard key={tool.href} href={tool.href}>
              {tool.icon}
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tool.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tool.description}
              </Typography>
            </ToolCard>
          ))}
        </ToolGrid>
      </Stack>
    </Container>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
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
  transition: 'border-color 0.15s, transform 0.15s',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    transform: 'translateY(-2px)',
  },
}));
