//////////////////////////////////////// 도구 목록 (전역 공유) ////////////////////////////////////////
// 랜딩 그리드·헤더 GNB가 함께 사용. 배치 원칙: 셀러 작업 플로우 순서 (SERVICE 6장)
// ① 소싱 (뭘 팔지 정하고 마진 판단) → ② 이미지 준비 (가공 파이프라인 순) → ③ 등록 (준비 중)

import type { ReactNode } from 'react';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import CalculateIcon from '@mui/icons-material/Calculate';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';

export type ToolGroupKey = 'sourcing' | 'image';

export type ToolInfo = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  group: ToolGroupKey;
};

//////////////////// 플래그십: 원링크 ////////////////////
// 골(SERVICE 킬러 시나리오): 도매꾹 URL 하나 → 네이버 상품등록까지.
// 현재 구현 범위는 "등록 준비"(이미지 자동 가공)까지 — 사이드바 최상단 고정, 개별 도구와 분리 노출.
export const FLAGSHIP_TOOL = {
  href: '/domeme-import',
  title: '원링크',
  description: '링크 하나로 등록 준비까지',
};

// 플로우 그룹 정의 (표시 순서 = 작업 순서)
export const TOOL_GROUPS: { key: ToolGroupKey; step: string; label: string; description: string }[] = [
  { key: 'sourcing', step: '1', label: '소싱', description: '뭘 팔지 정하고, 남는 장사인지 확인합니다' },
  { key: 'image', step: '2', label: '이미지 준비', description: '등록용 이미지를 가공 순서대로 완성합니다' },
];

// 개별 도구 목록 (원링크는 FLAGSHIP_TOOL로 별도 — 같은 페이지 중복 노출 방지 위해 여기선 제외)
export const TOOLS: ToolInfo[] = [
  //////////////////// ① 소싱 ////////////////////
  {
    href: '/margin-calculator',
    icon: <CalculateIcon color="primary" fontSize="large" />,
    title: '마진 계산기',
    description: '순이익 계산과 목표 마진 최소 판매가 역산',
    group: 'sourcing',
  },
  //////////////////// ② 이미지 준비 (파이프라인 순) ////////////////////
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
];
