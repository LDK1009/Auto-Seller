'use client';

//////////////////////////////////////// 애니메이션 진행바 (공통) ////////////////////////////////////////
// determinate: value(0~1)까지 durationMs 동안 linear로 채운다(긴 단계는 천천히 기어가는 진행감).
// indeterminate: 값 없이 흐르는 스트라이프로 "진행 중"만 표시(예: 다운로드 구간).

import styled from '@emotion/styled';
import { motion } from 'framer-motion';

type AnimatedProgressBarProps = {
  value: number; // 0~1 (determinate)
  durationMs?: number; // value까지 채우는 시간
  indeterminate?: boolean;
  height?: number;
};

export default function AnimatedProgressBar({
  value,
  durationMs = 400,
  indeterminate = false,
  height = 6,
}: AnimatedProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <Track style={{ height }}>
      {indeterminate ? (
        <IndeterminateFill
          animate={{ x: ['-45%', '160%'] }}
          transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
        />
      ) : (
        <Fill
          animate={{ width: `${clamped * 100}%` }}
          transition={{ duration: durationMs / 1000, ease: 'linear' }}
        />
      )}
    </Track>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Track = styled.div(({ theme }) => ({
  position: 'relative',
  width: '100%',
  borderRadius: 999,
  backgroundColor: theme.palette.action.hover,
  overflow: 'hidden',
}));

const Fill = styled(motion.div)(({ theme }) => ({
  height: '100%',
  width: '0%',
  borderRadius: 999,
  backgroundColor: theme.palette.primary.main,
}));

const IndeterminateFill = styled(motion.div)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  height: '100%',
  width: '40%',
  borderRadius: 999,
  backgroundColor: theme.palette.primary.main,
}));
