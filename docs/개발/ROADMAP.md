# Auto-Seller 개발 로드맵

> 작성: 2026-07-15 (제로베이스 재작성 — 구 ROADMAP 폐기, 완료 이력은 git log 참조)
> **전략·게이트·리스크의 기준은 [../기획/PLAN.md](../기획/PLAN.md)** — 이 문서는 "무엇을 어떤 순서로 만드는가"만 다룬다.
> 태스크 규칙: 작업 시작 전 해당 항목 확인, 완료 시 `[x]` 처리.

---

## 현재 위치

- **S0 후반 — MVP 개발 완료, 출시(커뮤니티 첫 공유) 전** · 사용자 0
- 라이브(www.auto-seller.co.kr): 원링크(이미지 편집 모달 + 등록 정보 시트 ①~⑫) · 이미지 도구 5종 · 키워드 분석(차트 13종·비교) · 도매꾹 검색 · 계산기 4종 · 랜딩 베스트 후킹 · SEO 인프라 · GA4

---

## 이월 후보 (구 로드맵 미완분 — 대표 판정 후 본 로드맵에 편입/폐기)

| # | 항목 | 상태 | 판정 |
|---|------|------|------|
| 1 | 원링크 미검증 리스크 3종 실사용 판정 — 상세 HTML 핫링크·누끼 WASM 프로덕션·옵션 엑셀 업로드 | 미검증 | ☐ 편입 / ☐ 폐기 |
| 2 | 도매꾹 소싱 브리지 — 키워드 분석 → 상품 후보 → 마진 → 원링크 (07-09 다음 개발 확정분) | 미착수 | ☐ 편입 / ☐ 폐기 |
| 3 | L-6b 인기검색어 위젯 — Private API 권한 승인 대기 (07-07 신청) | 승인 대기 | ☐ 편입 / ☐ 폐기 |
| 4 | R-10 시험구매 1건 — 도매꾹 개인구매 위탁 실효성 판정 (기준 3개 = PLAN 11장 R-10) | 미실행 | ☐ 편입 / ☐ 폐기 |
| 5 | AI 판단 가동 — 구현 완료·임시 숨김 상태, 가동 절차는 아래 섹션 | 셋업 대기 | ☐ 편입 / ☐ 폐기 |
| 6 | S2 백로그 — AI 상품명 생성기·태그 추천+제한태그 검증·AI 상세·AI 응대 문구 / **선행: @imgly AGPL 정리(R-4)** | S2 게이트 대기 | ☐ 편입 / ☐ 폐기 |
| 7 | (법인·입점 후) 스마트스토어 이미지 업로드·원클릭 등록 — `POST /v1/product-images/upload`, `POST /v2/products` | S2 법인 커플링 | ☐ 편입 / ☐ 폐기 |
| 8 | (원링크 v3) 동일 공급사 연관 상품 → 추가상품 제안 (합배송 = 운영 스테이션 복선) | 아이디어 | ☐ 편입 / ☐ 폐기 |
| 9 | S5 — 스스 주문 → 도매꾹 자동 발주 (Private API 주문서 생성) | S2 후 신호 기반 | ☐ 편입 / ☐ 폐기 |

---

## 로드맵 (신규 — PLAN.md 기준으로 작성 예정)

> 이월 후보 판정 완료 후, 기획서(장별 삭제 검토 포함) 확정 방향에 맞춰 채운다.

- [ ] (작성 대기)

---

## AI 판단 가동 절차 (구 launch/ai-verdict-setup.md 흡수 — 운영자용)

키워드 분석 페이지의 "AI 판단" (카카오 로그인 + 하루 5회 무료)을 가동하기 위한 대표 액션 3가지.
전부 완료 전까지 UI는 "준비 중" 안내로 안전하게 동작한다.

### 1. 카카오 로그인 연결 (카카오 개발자 → Supabase)

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

### 2. Anthropic API 키

1. https://console.anthropic.com → API Keys → 키 발급
2. `.env.local`에 추가 후 **Vercel 환경변수에도 동일 등록** (Production):

```
ANTHROPIC_API_KEY=sk-ant-...
# (선택) 모델 오버라이드 — 기본값 claude-haiku-4-5-20251001
# ANTHROPIC_VERDICT_MODEL=claude-sonnet-5
```

- `NEXT_PUBLIC_` 접두사 금지 (서버 전용 키)
- 비용 감각: Haiku 기준 판단 1회 ≈ 1원 미만 → 하루 5회 × 사용자 수로 통제됨

### 3. 사용량 테이블 생성 (Supabase SQL Editor에서 1회 실행)

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

### 완료 확인

1. 키워드 분석 > 검색 → 최상단 AI 판단 카드에 [카카오 로그인하고 AI 판단 받기] 노출
2. 카카오 로그인 → 원래 페이지(`?keyword=` 유지)로 복귀
3. [AI 판단 받기] → 판정(추천/보류/비추천) + 근거 + 남은 횟수 표시
4. 6회째 시도 → "오늘 무료 횟수(5회)를 모두 사용했어요" 안내

### 정책 결정 기록 (2026-07-09)

- 게이트 범위: **AI 판단만 로그인** — 나머지 도구는 무가입 유지 (기획서 포지셔닝 보존)
- 로그인 수단: 카카오 단일 (구글·네이버는 수요 확인 후)
- 과금: 로그인 무료 + 일일 5회 제한 → 반응 검증 후 유료 전환 검토 (결제 인프라 별도)

---

## 운영 메모 (구 launch/naver-keys-guide.md 회수분)

- **네이버 검색광고 CUSTOMER_ID 함정**: 우상단 계정/회원 ID가 아님 — 광고시스템 > 도구 > API 사용 관리 화면에서 **라이선스와 한 세트로 표기된 CUSTOMER_ID**가 정답 (07-09 실측: 계정 ID로 403 auth-failed 4회)
- **검색광고 API 운영 원칙**: 약관이 광고 관리 목적 중심 — 대량·상업적 재판매성 이용은 회색지대. 서버 24h 캐싱 유지 + 호출량 모니터링 전제, 경고 신호(메일 등) 수신 시 즉시 공유
- 키 관련 env는 로컬 `.env.local` + Vercel Production 양쪽 동기화 (키 미설정 시 화면은 자동 안내 모드 — 에러 아님)
