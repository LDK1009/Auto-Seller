'use client';

//////////////////////////////////////// 원링크 시트 목업 (히어로 비주얼) ////////////////////////////////////////
// 와우 모먼트: "링크 하나 넣으면 이렇게 나온다"를 스크린샷 없이 CSS로 재현.
// 실제 시트의 디자인 언어(번호 뱃지·행 구조·복사 버튼)를 그대로 축소 — 제품과 다른 그림 금지 (갭 관리).
// 행이 순차 페이드인되며 "자동으로 채워지는" 인상을 준다 (1회 재생).

import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// 실제 원링크 시트가 만들어주는 값의 축소 예시 (가상의 예시 상품 — 실존 브랜드·상호 아님)
const MOCK_ROWS = [
  { number: 1, label: '카테고리', value: '생활/건강 > 우산 > 장우산' },
  { number: 2, label: '상품명', value: '3단 자동 장우산 UV차단 암막 골프우산' },
  { number: 3, label: '판매가', value: '12,900원 · 순이익 3,480원 (27%)' },
  { number: 6, label: '상품이미지', value: '대표 1장 + 추가 4장 · 누끼 완료' },
  { number: 11, label: '태그', value: '#자동우산 #골프우산 #암막양산 외 7개' },
];

export default function SheetMockup() {
  return (
    <Frame aria-hidden>
      {/* 브라우저 프레임 헤더 */}
      <FrameHeader>
        <Dot style={{ backgroundColor: '#FF5F57' }} />
        <Dot style={{ backgroundColor: '#FEBC2E' }} />
        <Dot style={{ backgroundColor: '#28C840' }} />
        <AddressBar>auto-seller.co.kr — 등록 정보</AddressBar>
      </FrameHeader>

      {/* 시트 축소판 — 행 순차 등장 */}
      <Body>
        {MOCK_ROWS.map((row, index) => (
          <MockRow key={row.number} style={{ animationDelay: `${0.25 + index * 0.18}s` }}>
            <RowBadge>{row.number}</RowBadge>
            <Typography variant="caption" color="text.secondary" sx={{ width: 76, flexShrink: 0, textAlign: 'left' }}>
              {row.label}
            </Typography>
            <Typography
              variant="caption"
              sx={{ flex: 1, minWidth: 0, fontWeight: 600, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {row.value}
            </Typography>
            <ContentCopyIcon sx={{ fontSize: 13, color: 'text.disabled', flexShrink: 0 }} />
          </MockRow>
        ))}
        <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
          카테고리부터 태그까지, 스마트스토어 등록 폼 순서 그대로 12개 섹션
        </Typography>
      </Body>
    </Frame>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const rowIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Frame = styled.div(({ theme }) => ({
  width: '100%',
  maxWidth: 560,
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[6],
  overflow: 'hidden',
}));

const FrameHeader = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: theme.spacing(1, 1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
}));

const Dot = styled.span({
  width: 9,
  height: 9,
  borderRadius: '50%',
});

const AddressBar = styled.span(({ theme }) => ({
  marginLeft: 8,
  padding: '2px 10px',
  borderRadius: 6,
  fontSize: 11,
  color: theme.palette.text.secondary,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
}));

const Body = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.75),
  padding: theme.spacing(2),
}));

const MockRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.25),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  opacity: 0,
  animation: `${rowIn} 0.45s ease-out forwards`,
}));

const RowBadge = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  flexShrink: 0,
  borderRadius: '50%',
  fontSize: 10,
  fontWeight: 700,
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
}));
