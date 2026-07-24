'use client';

//////////////////////////////////////// 로그인 필요 다이얼로그 (공통) ////////////////////////////////////////
// 조건부 기능(저장·구독 등) 안내는 토스트가 아니라 다이얼로그로 (2026-07-24 대표 확정).
// 무가입 원칙 보존 — "이 기능만" 로그인이 필요함을 명시한다.

import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useSnackbar } from 'notistack';
import { signInWithKakao } from '@/shared/services/authService';

type LoginRequiredDialogProps = {
  open: boolean;
  description: string; // 이 기능에 로그인이 왜 필요한지 (기능별 문구)
  onClose: () => void;
};

export default function LoginRequiredDialog({ open, description, onClose }: LoginRequiredDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const handleLogin = async () => {
    try {
      await signInWithKakao();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '로그인에 실패했습니다.', { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableScrollLock>
      <Stack spacing={2.5} sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography variant="h6">로그인이 필요해요</Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            다른 도구는 지금처럼 로그인 없이 계속 쓸 수 있어요.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button color="inherit" onClick={onClose} sx={{ color: 'text.secondary' }}>
            다음에
          </Button>
          <Button variant="contained" onClick={handleLogin}>
            로그인
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
}
