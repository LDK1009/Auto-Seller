'use client';

//////////////////////////////////////// 메인 화면 ////////////////////////////////////////
// 라우트 진입 컴포넌트(컨테이너). 실제 화면 로직은 이 View에서 조립한다.

import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import Link from 'next/link';
import { APP_NAME, APP_DESCRIPTION } from '@/shared/constants/app';

export default function MainView() {
  return (
    <Container maxWidth="md">
      <Stack spacing={3} sx={{ py: 12, alignItems: 'flex-start' }}>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          {APP_NAME}
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          {APP_DESCRIPTION}
        </Typography>
        <Button
          component={Link}
          href="/background-removal"
          variant="contained"
          size="large"
          startIcon={<AutoFixHighIcon />}
        >
          대량 이미지 누끼
        </Button>
      </Stack>
    </Container>
  );
}
