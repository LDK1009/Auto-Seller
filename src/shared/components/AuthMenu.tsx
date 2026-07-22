'use client';

//////////////////////////////////////// 인증 메뉴 (헤더 우측) ////////////////////////////////////////
// 비로그인: [로그인] 버튼 (카카오 OAuth) / 로그인: 아바타 → 메뉴(닉네임·구독 관리·로그아웃).
// 도구 사용에 로그인 불필요 (무가입 약속) — 결제·구독 관리 전용 진입점.

import { useState } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { isAuthConfigured, signInWithKakao, signOut } from '@/shared/services/authService';

export default function AuthMenu() {
  const { enqueueSnackbar } = useSnackbar();
  const { session, isSessionLoading } = useAuthSession();
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);

  // Supabase 미설정 환경(로컬 등) — 메뉴 자체 숨김 (기능 강등)
  if (!isAuthConfigured || isSessionLoading) return null;

  ////////// 로그인
  const handleSignIn = async () => {
    try {
      await signInWithKakao();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '로그인에 실패했습니다.', { variant: 'error' });
    }
  };

  ////////// 로그아웃
  const handleSignOut = async () => {
    setMenuAnchorEl(null);
    try {
      await signOut();
      enqueueSnackbar('로그아웃했습니다.', { variant: 'success' });
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '로그아웃에 실패했습니다.', { variant: 'error' });
    }
  };

  if (!session) {
    return (
      <Button size="small" color="inherit" onClick={handleSignIn} sx={{ color: 'text.secondary' }}>
        로그인
      </Button>
    );
  }

  const metadata = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  const nickname =
    (typeof metadata.name === 'string' && metadata.name) ||
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    session.user.email ||
    '회원';
  const avatarUrl = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : undefined;

  return (
    <>
      <IconButton size="small" onClick={(event) => setMenuAnchorEl(event.currentTarget)} aria-label="계정 메뉴">
        <Avatar src={avatarUrl} alt={nickname} sx={{ width: 28, height: 28, fontSize: 13 }}>
          {nickname.slice(0, 1)}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={menuAnchorEl}
        open={menuAnchorEl !== null}
        onClose={() => setMenuAnchorEl(null)}
        disableScrollLock
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem disabled sx={{ opacity: '1 !important' }}>
          <ListItemText
            primary={<Typography variant="subtitle2">{nickname}</Typography>}
            secondary={session.user.email ?? undefined}
          />
        </MenuItem>
        <Divider />
        <MenuItem component={Link} href="/pricing" onClick={() => setMenuAnchorEl(null)}>
          구독 관리
        </MenuItem>
        <MenuItem onClick={handleSignOut}>로그아웃</MenuItem>
      </Menu>
    </>
  );
}
