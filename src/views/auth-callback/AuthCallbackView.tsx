'use client';

//////////////////////////////////////// 로그인 복귀 처리 (/auth/callback) ////////////////////////////////////////
// OAuth 복귀 전용 착지 지점. 세션이 확정되면 ?next= 로 받은 원래 페이지로 되돌린다.
// 왜 필요한가: 복귀 주소에 경로가 없으면(예: 랜딩에서 로그인) Supabase 허용목록 `도메인/**` 매칭이
// 실패해 Site URL(프로덕션)로 강제 착지한다 → 로컬 개발에서 프로덕션으로 튀는 문제. 고정 경로로 우회.

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { getCurrentSession, subscribeAuthState } from '@/shared/services/authService';

const FALLBACK_PATH = '/';
const TIMEOUT_MS = 8000; // 세션 확정이 안 되면 그냥 돌려보낸다 (무한 로딩 방지)

export default function AuthCallbackView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('로그인 중이에요…');

  useEffect(() => {
    // 열린 리다이렉트 방지 — 외부 URL은 무시하고 내부 경로만 허용
    const rawNext = searchParams.get('next') ?? FALLBACK_PATH;
    const nextPath = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : FALLBACK_PATH;

    let done = false;
    const goNext = () => {
      if (done) return;
      done = true;
      router.replace(nextPath);
    };

    // 1) 이미 세션이 확정됐으면 즉시 이동
    getCurrentSession()
      .then((session) => {
        if (session) goNext();
      })
      .catch((error) => console.error(error));

    // 2) supabase-js가 URL의 인증 정보를 처리하는 즉시 통지받아 이동
    const unsubscribe = subscribeAuthState((session) => {
      if (session) goNext();
    });

    // 3) 안전망 — 그래도 안 되면 원래 페이지로 (로그인 실패 문구는 그 화면에서 다시 유도)
    const timer = setTimeout(() => {
      setMessage('잠시 후 이동해요…');
      goNext();
    }, TIMEOUT_MS);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Stack spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Stack>
  );
}
