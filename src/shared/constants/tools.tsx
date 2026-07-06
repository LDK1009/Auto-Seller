//////////////////////////////////////// 도구 목록 (전역 공유) ////////////////////////////////////////
// 랜딩 카드 그리드·헤더 GNB 메뉴가 함께 사용한다. 추가·삭제는 여기 한 곳에서.

import type { ReactNode } from 'react';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import CalculateIcon from '@mui/icons-material/Calculate';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import LinkIcon from '@mui/icons-material/Link';

export type ToolInfo = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  group: 'sourcing' | 'image' | 'calculator';
};

export const TOOLS: ToolInfo[] = [
  {
    href: '/domeme-import',
    icon: <LinkIcon color="primary" fontSize="large" />,
    title: '도매매 가져오기',
    description: '상품 링크 하나로 대표·상세 이미지를 모아 이미지 작업에 바로 투입',
    group: 'sourcing',
  },
  {
    href: '/background-removal',
    icon: <AutoFixHighIcon color="primary" fontSize="large" />,
    title: '대량 이미지 누끼',
    description: '여러 상품 이미지의 배경을 한 번에 제거하고 원하는 배경으로 교체',
    group: 'image',
  },
  {
    href: '/image-resize',
    icon: <AspectRatioIcon color="primary" fontSize="large" />,
    title: '이미지 규격 변환',
    description: '마켓별 대표이미지 규격(1000×1000 등)에 맞춰 일괄 변환',
    group: 'image',
  },
  {
    href: '/image-check',
    icon: <FactCheckIcon color="primary" fontSize="large" />,
    title: '이미지 규정 검사',
    description: '대표이미지가 마켓 규정(해상도·비율·용량)에 맞는지 즉시 검사',
    group: 'image',
  },
  {
    href: '/watermark',
    icon: <BrandingWatermarkIcon color="primary" fontSize="large" />,
    title: '워터마크 일괄 삽입',
    description: '텍스트/로고 워터마크를 여러 이미지에 한 번에 합성 (도용 방지)',
    group: 'image',
  },
  {
    href: '/image-split',
    icon: <VerticalSplitIcon color="primary" fontSize="large" />,
    title: '상세페이지 분할',
    description: '긴 상세 이미지를 마켓 높이 제한에 맞춰 순서대로 자동 분할',
    group: 'image',
  },
  {
    href: '/margin-calculator',
    icon: <CalculateIcon color="primary" fontSize="large" />,
    title: '마진 계산기',
    description: '순이익 계산과 목표 마진 최소 판매가 역산',
    group: 'calculator',
  },
];
