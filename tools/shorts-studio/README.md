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

## Phase B (예정) — 녹화 자동화

- `scripts/lib/humanize.ts` 인간 페이싱 (타이핑 딜레이·스무스 스크롤·대기)
- `scripts/lib/cursor.ts` 가짜 커서 오버레이 + 클릭 리플
- `scripts/lib/recorder.ts` 세로 뷰포트 녹화 + 클릭 좌표 이벤트 로그 → focuses 자동 생성
- `scenarios/01~16` 기능별 시연 시나리오
- `scripts/build-episode.ts` 녹화→파싱→렌더 원커맨드
- `scripts/capture-screens.ts` 블로그 [사진] 슬롯 캡처
```
