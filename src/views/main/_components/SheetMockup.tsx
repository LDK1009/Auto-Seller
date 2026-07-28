'use client';

//////////////////////////////////////// 원링크 결과 목업 (히어로 비주얼) ////////////////////////////////////////
// 와우 모먼트: "이런 상품에서 → 이런 정보가 한 번에" 를 좌우로 보여준다 (모바일은 상하).
// 좌: 도매꾹 상품 카드(예시) / 우: 등록 정보 시트 축소판 — 행이 순차로 차오르며 자동 추출 인상.
// 실제 시트의 디자인 언어(번호 뱃지·행 구조·복사 아이콘)를 그대로 축소 (제품과 다른 그림 금지 — 갭 관리).

import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { alpha } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';

// 예시 상품 (가상 — 실존 브랜드·상호 아님)
const MOCK_PRODUCT = {
  title: '3단 자동우산 UV차단 암막 골프우산',
  price: '4,300원',
  meta: '최소구매 2개 · 재고 1,240개',
};

// 시트가 자동으로 채워주는 값 (실제 12섹션 중 대표 5개)
const MOCK_ROWS = [
  { number: 1, label: '카테고리', value: '생활/건강 > 우산 > 장우산' },
  { number: 2, label: '상품명', value: '3단 자동 장우산 UV차단 암막 골프우산' },
  { number: 3, label: '판매가', value: '12,900원 · 순이익 3,480원' },
  { number: 6, label: '이미지', value: '대표 1장 + 추가 4장 · 누끼 완료' },
  { number: 11, label: '태그', value: '#자동우산 #골프우산 외 8개' },
];

export default function SheetMockup() {
  return (
    <Split aria-hidden>
      {/* 좌: 도매꾹 상품 (입력) */}
      <Panel>
        <PanelLabel>도매꾹 상품 링크</PanelLabel>
        <ProductCard>
          <ProductThumb>
            <ImageOutlinedIcon sx={{ fontSize: 30, color: 'text.disabled' }} />
          </ProductThumb>
          <Stack spacing={0.25} sx={{ minWidth: 0, textAlign: 'left' }}>
            <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
              {MOCK_PRODUCT.title}
            </Typography>
            <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
              {MOCK_PRODUCT.price}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {MOCK_PRODUCT.meta}
            </Typography>
          </Stack>
        </ProductCard>
      </Panel>

      {/* 변환 화살표 */}
      <ArrowSlot>
        <ArrowBadge>
          <ArrowForwardIcon sx={{ fontSize: 18 }} />
        </ArrowBadge>
      </ArrowSlot>

      {/* 우: 등록 정보 시트 (출력) */}
      <Panel>
        <PanelLabel>스마트스토어 등록 정보</PanelLabel>
        <SheetCard>
          {MOCK_ROWS.map((row, index) => (
            <MockRow key={row.number} style={{ animationDelay: `${0.35 + index * 0.18}s` }}>
              <RowBadge>{row.number}</RowBadge>
              <Typography variant="caption" color="text.secondary" sx={{ width: 52, flexShrink: 0, textAlign: 'left' }}>
                {row.label}
              </Typography>
              <RowValue variant="caption">{row.value}</RowValue>
              <ContentCopyIcon sx={{ fontSize: 12, color: 'text.disabled', flexShrink: 0 }} />
            </MockRow>
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ pt: 0.25 }}>
            + 재고·옵션·상세설명·배송·반품까지 12개 섹션
          </Typography>
        </SheetCard>
      </Panel>
    </Split>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const rowIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Split = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'stretch',
  gap: theme.spacing(1.5),
  width: '100%',
  maxWidth: 760,
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'center',
  },
}));

const Panel = styled.div(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.75),
  [theme.breakpoints.down('sm')]: {
    width: '100%',
  },
}));

const PanelLabel = styled.span(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  color: theme.palette.text.secondary,
  textAlign: 'left',
}));

const ProductCard = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.25),
  flex: 1,
  padding: theme.spacing(1.5),
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
}));

const ProductThumb = styled.div(({ theme }) => ({
  width: 64,
  height: 64,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
}));

// 화살표 — 데스크톱은 가로(→), 모바일은 세로(↓)
const ArrowSlot = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  paddingTop: 18, // 라벨 높이만큼 내려 카드 중앙과 맞춤
  [theme.breakpoints.down('sm')]: {
    paddingTop: 0,
    transform: 'rotate(90deg)',
  },
}));

const ArrowBadge = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

const SheetCard = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  padding: theme.spacing(1.5),
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[4],
}));

const MockRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  padding: theme.spacing(0.75, 1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  opacity: 0,
  animation: `${rowIn} 0.45s ease-out forwards`,
}));

const RowBadge = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 16,
  height: 16,
  flexShrink: 0,
  borderRadius: '50%',
  fontSize: 9,
  fontWeight: 700,
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
}));

const RowValue = styled(Typography)({
  flex: 1,
  minWidth: 0,
  fontWeight: 600,
  textAlign: 'left',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
