# AI 판단 기능 셋업 가이드 (운영자용)

키워드 분석 페이지의 "AI 판단" (카카오 로그인 + 하루 5회 무료)을 가동하기 위한 대표 액션 3가지.
전부 완료 전까지 UI는 "준비 중" 안내로 안전하게 동작한다.

## 1. 카카오 로그인 연결 (카카오 개발자 → Supabase)

1. https://developers.kakao.com → 애플리케이션 추가 (앱 이름: 오토셀러)
2. [앱 설정 > 플랫폼] Web 플랫폼 등록: `https://www.auto-seller.co.kr` (+ 로컬 테스트용 `http://localhost:3000`)
3. [제품 설정 > 카카오 로그인] 활성화 ON
4. **Redirect URI 등록**: `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
   - Supabase 대시보드 > Authentication > Providers > Kakao 화면에 정확한 Callback URL이 표시됨 — 그대로 복사
5. [제품 설정 > 카카오 로그인 > 동의항목] 닉네임·이메일 동의 설정 (이메일은 선택 동의로 시작 가능)
6. [앱 설정 > 앱 키]의 **REST API 키** + [제품 설정 > 카카오 로그인 > 보안]의 **Client Secret**(발급+활성화) 확보
7. Supabase 대시보드 > Authentication > Providers > **Kakao 활성화** → REST API 키/Client Secret 입력
8. Supabase > Authentication > URL Configuration:
   - Site URL: `https://www.auto-seller.co.kr`
   - Redirect URLs에 `https://www.auto-seller.co.kr/**`, `http://localhost:3000/**` 추가

## 2. Anthropic API 키

1. https://console.anthropic.com → API Keys → 키 발급
2. `.env.local`에 추가 후 **Vercel 환경변수에도 동일 등록** (Production):

```
ANTHROPIC_API_KEY=sk-ant-...
# (선택) 모델 오버라이드 — 기본값 claude-haiku-4-5-20251001
# ANTHROPIC_VERDICT_MODEL=claude-sonnet-5
```

- `NEXT_PUBLIC_` 접두사 금지 (서버 전용 키)
- 비용 감각: Haiku 기준 판단 1회 ≈ 1원 미만 → 하루 5회 × 사용자 수로 통제됨

## 3. 사용량 테이블 생성 (Supabase SQL Editor에서 1회 실행)

> Supabase MCP 인증 후 요청하면 Claude가 `apply_migration`으로 대신 적용 가능.

```sql
-- AI 판단 일일 사용량 기록 (KST 자정 기준 카운트)
create table if not exists public.ai_verdict_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_verdict_usage_user_created_idx
  on public.ai_verdict_usage (user_id, created_at desc);

alter table public.ai_verdict_usage enable row level security;

-- 본인 행만 조회/기록 가능. delete/update 정책 없음 = 사용자가 쿼터를 리셋할 수 없음
create policy "select own usage" on public.ai_verdict_usage
  for select using (auth.uid() = user_id);
create policy "insert own usage" on public.ai_verdict_usage
  for insert with check (auth.uid() = user_id);
```

## 완료 확인

1. 키워드 분석 > 검색 → 최상단 AI 판단 카드에 [카카오 로그인하고 AI 판단 받기] 노출
2. 카카오 로그인 → 원래 페이지(`?keyword=` 유지)로 복귀
3. [AI 판단 받기] → 판정(추천/보류/비추천) + 근거 + 남은 횟수 표시
4. 6회째 시도 → "오늘 무료 횟수(5회)를 모두 사용했어요" 안내

## 정책 결정 기록 (2026-07-09)

- 게이트 범위: **AI 판단만 로그인** — 나머지 도구는 무가입 유지 (SERVICE 포지셔닝 보존)
- 로그인 수단: 카카오 단일 (구글·네이버는 수요 확인 후)
- 과금: 로그인 무료 + 일일 5회 제한 → 반응 검증 후 유료 전환 검토 (결제 인프라 별도)
