'use client';

//////////////////////////////////////// 다음 행동 말풍선 (공통) ////////////////////////////////////////
// 현재 스텝에서 사용자가 해야 할 "첫 행동"을 가리키는 말풍선 — 대상 요소 바로 위에 놓는다.
// 원칙: 화면에 동시에 1개만 (남발하면 안내 가치가 죽는다 — 2026-07-24 대표 합의).

import type { ReactNode } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

type NextActionBubbleProps = {
  children: ReactNode; // 주 행동 (1문장)
  hint?: ReactNode; // 보조 정보 — 수직 배치, 작고 연하게 (— 수평 연결 금지: 가독성 원칙 2026-07-24)
};

export default function NextActionBubble({ children, hint }: NextActionBubbleProps) {
  return (
    <Wrap>
      <Bubble>
        {children}
        {hint && <Hint>{hint}</Hint>}
      </Bubble>
    </Wrap>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
// 은은한 상하 부유 — 시선 유도용 최소 움직임
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

const Wrap = styled.div({
  display: 'flex',
  justifyContent: 'center',
  animation: `${float} 2.2s ease-in-out infinite`,
});

const Bubble = styled.div(({ theme }) => ({
  position: 'relative',
  maxWidth: 480,
  padding: theme.spacing(1.25, 2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.5,
  textAlign: 'center',
  boxShadow: theme.shadows[3],
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  // 아래 꼬리 — 대상 요소를 가리킨다
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -6,
    left: '50%',
    transform: 'translateX(-50%)',
    borderLeft: '7px solid transparent',
    borderRight: '7px solid transparent',
    borderTop: `7px solid ${theme.palette.primary.main}`,
  },
}));

// 보조 정보 줄 — 주 행동보다 작고 연하게
const Hint = styled.span({
  fontSize: 12,
  fontWeight: 400,
  opacity: 0.85,
});
