# 네이버 API 키 발급 가이드 (검색량·상품수 기능용)

> 발급 후 `.env.local`의 빈 값을 채우고, **Vercel 환경변수(Production)에도 동일하게 추가**해야 라이브에 반영된다.
> 키가 비어 있으면 관련 기능은 화면에서 자동으로 안내 모드로 동작한다 (에러 아님).

## 1) 검색광고 API — 월간 검색수·경쟁정도

발급 대상: `NAVER_SEARCHAD_API_KEY` / `NAVER_SEARCHAD_SECRET_KEY` / `NAVER_SEARCHAD_CUSTOMER_ID`

1. https://searchad.naver.com 접속 → 네이버 계정으로 **검색광고 계정 신규 가입** (사업자 정보 입력 — 광고 집행·결제 없이 가입만 하면 됨)
2. 가입 후 **광고시스템** 진입 → 우상단 계정명 클릭 → **도구 > API 사용 관리**
3. **네이버 검색광고 API 서비스 신청** → 약관 동의 → 즉시 발급:
   - **액세스라이선스** → `NAVER_SEARCHAD_API_KEY`
   - **비밀키** → `NAVER_SEARCHAD_SECRET_KEY`
4. `CUSTOMER_ID`: ⚠️ **우상단 계정/회원 ID가 아니다!** API 사용 관리 화면에서 **라이선스와 한 세트로 표기된 CUSTOMER_ID**를 쓸 것 (2026-07-09 실제로 이 함정에 걸려 403 auth-failed 4회 — 라이선스 화면의 숫자가 정답) → `NAVER_SEARCHAD_CUSTOMER_ID`

## 2) 네이버 오픈API — 쇼핑 검색 (키워드별 등록 상품 수)

발급 대상: `NAVER_OPENAPI_CLIENT_ID` / `NAVER_OPENAPI_CLIENT_SECRET`

1. https://developers.naver.com/apps 접속 → **애플리케이션 등록**
2. 애플리케이션 이름: `오토셀러` / **사용 API: "검색"** 선택
3. 환경 추가: **WEB 설정** → 웹 서비스 URL `https://www.auto-seller.co.kr`
4. 등록 즉시 발급되는 **Client ID / Client Secret** → 각 변수에 입력

## 3) 입력 위치 2곳

- 로컬: `.env.local` (이미 자리 만들어둠)
- 라이브: Vercel 대시보드 > auto-seller > Settings > Environment Variables (Production) — 5개 추가 후 재배포(아무 커밋 푸시)

## ⚠️ 운영 원칙

- 서버가 24시간 캐싱으로 호출을 최소화한다 (같은 키워드 재조회 시 API 호출 없음)
- 검색광고 API 약관은 광고 관리 목적 중심 — 대량·상업적 재판매성 이용은 회색지대이므로 **캐싱 유지 + 호출량 모니터링** 전제. 문제 신호(경고 메일 등) 수신 시 즉시 공유할 것
