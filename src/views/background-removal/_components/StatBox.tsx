'use client';

//////////////////////////////////////// 통계 박스 ////////////////////////////////////////
// 라벨 + 숫자를 담는 작은 박스 (예: 전체 / 완료 파일 수).

import styled from '@emotion/styled';
import Typography from '@mui/material/Typography';

type StatBoxProps = {
  label: string;
  value: number;
};

export default function StatBox({ label, value }: StatBoxProps) {
  return (
    <Box>
      <Label variant="caption">{label}</Label>
      <Value variant="subtitle2">{value}</Value>
    </Box>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Box = styled.div(({ theme }) => ({
  minWidth: 76,
  padding: theme.spacing(1, 2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default, // paper 컨테이너 위에서 흰색으로 부각
  textAlign: 'center',
}));

const Label = styled(Typography)(({ theme }) => ({
  display: 'block',
  color: theme.palette.text.secondary,
}));

const Value = styled(Typography)({
  fontWeight: 700,
  lineHeight: 1.2,
});
