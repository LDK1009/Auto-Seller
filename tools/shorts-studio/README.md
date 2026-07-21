# shorts-studio — 숏츠 자동 생성 스튜디오

대본(`docs/마케팅/컨텐츠/…/숏츠.md`) + 시연 녹화 파일 → 완성 숏츠(1080×1920 mp4).
컨셉: 타이머 실측 챌린지 (MARKETING.md 숏츠 가이드 참조). 앱과 의존성 분리된 독립 워크스페이스.

## 사용법 (Phase A — 편집 자동화)

```bash
cd tools/shorts-studio
npm install

# 1) 대본 파싱 → props JSON
npm run parse -- 2026-07 16          # → out/props/2026-07-16.json

# 2) props 편집 (필수 2개)
#    - resultTime: 촬영 실측값 기입 (예: "1:12") — 창작 금지(금지 체크)
#    - videoSrc:   시연 녹화 파일 경로 (절대 경로 or public/)

# 3) 렌더
npx remotion render TimerShort out/16.mp4 --props=out/props/2026-07-16.json --browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"

# 미리보기 스튜디오
npm run studio
```

## ⚠️ 이 PC 전용 우회

리모션 기본 헤드리스 셸이 이 PC에서 실행 거부됨(스폰 EFTYPE) → **`--browser-executable`로 설치된 크롬 지정 필수** (위 명령에 포함돼 있음).

## 구조

```
remotion/
├ Root.tsx          컴포지션 등록 (1080×1920·30fps, durationSec 동적)
├ TimerShort.tsx    메인: 훅(0~3s) → 시연+타이머 → 결과 카드(끝 5s)
├ schema.ts         props 스키마 (zod) — 파서 출력 형식
├ theme.ts          브랜드 컬러(#6366F1)·안전존(상250·하420·우160)·폰트
└ components/
  ├ SafeArea.tsx    3분할 레이아웃 (헤더=자막+타이머 / 중단=시연 / 하단 자막)
  ├ Timer.tsx       스톱워치 — 프레임 동기 (표시 시간 = 실경과)
  ├ Caption.tsx     자막 타임라인 (화면당 1문장, 페이드 등장)
  ├ ResultCard.tsx  엔딩 — 실측 숫자 대형 + CTA + 댓글 유도
  └ ZoomVideo.tsx   녹화 재생 + 포커스 좌표 줌·팬 (videoSrc 없으면 플레이스홀더)
scripts/
└ parse-script.ts   숏츠.md → props JSON (훅·자막 표·결과 라벨 추출)
```

## Phase B — 녹화 자동화 (코어 검증 완료)

```bash
# 사전: 로컬 dev 서버 실행 (기본 대상이 http://localhost:3000)
npm run dev   # 저장소 루트에서

# 원커맨드: 녹화(로컬 실조작) → 파싱 → 렌더
npm run episode -- 20        # → docs/마케팅/컨텐츠/2026-07/20/숏츠/{영상제목}.mp4

# 화면 캡처(블로그용)도 동일하게 로컬 대상
npx tsx scripts/capture-screens.ts

# 프로덕션 대상이 꼭 필요할 때만 명시 (권장하지 않음)
$env:SHORTS_BASE_URL="https://www.auto-seller.co.kr"; npm run episode -- 20
```

> ⚠️ **자동화는 로컬 dev 서버 대상이 기본 (2026-07-21).** 프로덕션에 돌리면 GA 지표가 봇 트래픽으로 오염된다(7/20 사고: 활성 60명 중 대부분이 스크립트). 추가 안전장치로 **애널리틱스 요청을 Playwright에서 차단**한다 (`recorder.ts` `ANALYTICS_BLOCK` — 로컬도 `.env.local`에 `NEXT_PUBLIC_GA_ID`가 있어 gtag가 붙기 때문).

- `scripts/lib/humanize.ts` 인간 페이싱 (타이핑 딜레이·스무스 스크롤·대기·이벤트 로그)
- `scripts/lib/cursor.ts` 가짜 커서 오버레이 + 클릭 리플 (DOM 주입)
- `scripts/lib/recorder.ts` 세로 뷰포트(414×896) 녹화 → `public/rec/` + 이벤트 로그
- `scenarios/16-onelink.ts` 시나리오 1호 (검색→카드→시트 훑기) — **나머지 15개 추가 필요**
- `scripts/build-episode.ts` 오케스트레이터 — 실측 시간·줌 포커스 자동 주입

### 남은 개선 (다음 작업)

1. 시나리오 2~16 작성 (에피소드별)
2. **자막-장면 싱크 마커** — 현재는 대본 자막을 실측 길이에 비율 배치라 장면과 어긋날 수 있음 → 시나리오가 단계별 마커 시각을 로그하고 자막을 마커에 스냅
3. `capture-screens.ts` 블로그 [사진] 슬롯 캡처 (Phase B 잔여)
4. `report-data.ts` C⑦ 리포트 수치 수집 (Phase C)
5. 화질 — 녹화가 뷰포트 CSS 픽셀(414px) 기준이라 업스케일됨. 필요 시 CDP 스크린캐스트로 교체 검토
```
