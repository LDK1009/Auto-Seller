'use client';

//////////////////////////////////////// 슬롯 텍스트 (공통) ////////////////////////////////////////
// value가 바뀌면 이전 텍스트는 위로 빠지고 새 텍스트가 아래에서 올라온다(슬롯머신 느낌).

import type { ReactNode } from 'react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';

type SlideUpTextProps = {
  value: string | number; // 변경 감지 키 (이 값이 바뀌면 슬라이드)
  children: ReactNode;
};

export default function SlideUpText({ value, children }: SlideUpTextProps) {
  return (
    <Mask>
      {/* popLayout: 이전/새 요소가 레이아웃을 밀지 않고 겹쳐서 전환 */}
      <AnimatePresence mode="popLayout" initial={false}>
        <Item
          key={value}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ ease: 'easeInOut', duration: 0.3 }}
        >
          {children}
        </Item>
      </AnimatePresence>
    </Mask>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Mask = styled.span({
  display: 'inline-flex',
  overflow: 'hidden',
  lineHeight: 1.4,
});

const Item = styled(motion.span)({
  display: 'inline-block',
  whiteSpace: 'nowrap',
});
