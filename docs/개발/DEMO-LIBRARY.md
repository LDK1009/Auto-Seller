# 데모 영상 라이브러리 (2026-07-23 신설)

기존 숏츠(타이머 실측 챌린지)는 **광고처럼 읽혀 폐기**. 쓰레드 등 소셜에 붙일 **기능 시연 영상**을 기능별·케이스별로 나눠 만든다.

## 숏츠와 무엇이 다른가

| | 구 숏츠 (폐기) | 데모 영상 |
|---|---|---|
| 목적 | "몇 초 만에!" 임팩트 | **뭘 하는 건지 이해시키기** |
| 연출 | 타이머·결과 카드·BGM | 없음. 화면 + 자막 + 강조만 |
| 훅 | 광고 카피 | **씬 제목** (좌상단 상시) |
| 길이 | 25-30초 고정 | 기능에 맞게 (15-60초) |
| 단위 | 하루치 소재 | **기능·케이스별 재사용 자산** |

**핵심: 광고가 아니라 설명서.** 담백하게, 대신 어디를 봐야 하는지 확실하게.

## 화면 구성 (고정)

```
┌─────────────────────────────┐
│ [씬 제목]        ← 좌상단 상시  │
│                             │
│      실제 서비스 화면          │
│   (부드러운 커서 + 강조 링)     │
│                             │
│        [자막]     ← 하단      │
└─────────────────────────────┘
```

- **씬 제목**: 지금 뭘 하는 단계인지. 화면 바뀔 때마다 교체
- **강조 링**: 조작 대상 영역을 감싼다 (`showSection` 좌표 자동)
- **자막**: 한 동작 = 한 줄. 전문장
- **커서**: 곡선 이동 + 감속 (기존 `humanize.ts`)
- **비율**: 세로 1080×1920 (쓰레드·릴스 모바일 기준)

## 영상 목록

### 원링크 (플래그십 — 풀 + 부분)

| ID | 내용 | 길이 |
|---|---|---|
| `onelink-full` | 검색 → 상품 선택 → 시트 전체 훑기 → 복사 | 60초 |
| `onelink-search` | 검색어로 상품 찾기 (인기순·낱개 필터) | 20초 |
| `onelink-link` | 도매꾹 링크 붙여넣기 → 시트 생성 | 15초 |
| `onelink-moq` | 최소구매수량 경고 + 묶음 원가 역산 | 25초 |
| `onelink-category` | 카테고리 추천 3개 → 복사 | 20초 |
| `onelink-name` | 상품명 조합 + 검사(금지어·글자수) → 복사 | 30초 |
| `onelink-price` | 추천 판매가·손익분기·정가 분해 | 25초 |
| `onelink-option` | 옵션 조합표 → 엑셀 다운로드 | 25초 |
| `onelink-image` | 이미지 슬롯 구성 → 편집 → ZIP | 35초 |
| `onelink-detail` | 상세설명 HTML 복사 | 20초 |
| `onelink-tag` | 태그 후보 10개 → 콤마 복사 | 20초 |
| `onelink-kc` | KC 인증·인허가 배지 | 20초 |

### 이미지 도구 (케이스별)

| ID | 내용 | 길이 |
|---|---|---|
| `nukki-basic` | 여러 장 배경 제거 → ZIP | 25초 |
| `nukki-bg-color` | 누끼 후 배경색 교체 | 25초 |
| `nukki-bg-search` | 누끼 후 검색 이미지 배경 | 30초 |
| `resize-basic` | 규격 일괄 변환 (1000×1000) | 20초 |
| `resize-preset` | 마켓별 프리셋 전환 | 20초 |
| `check-basic` | 규정 검사 → 불합격만 표시 | 20초 |
| `check-to-resize` | 검사 → 변환 연결 | 25초 |
| `watermark-text` | 텍스트 워터마크 일괄 | 20초 |
| `watermark-logo` | 로고 워터마크 | 20초 |
| `split-basic` | 긴 상세 이미지 분할 → ZIP | 25초 |
| `excel-import` | 엑셀에서 이미지 추출 → 누끼 | 35초 |

### 소싱·계산

| ID | 내용 | 길이 |
|---|---|---|
| `keyword-basic` | 키워드 분석 → 검색수÷상품수 판정 | 25초 |
| `keyword-chart` | 종합 차트 훑기 (트렌드·시즌·연령) | 30초 |
| `keyword-compare` | 키워드 4개 비교 | 25초 |
| `keyword-related` | 연관 키워드 30개 확장 | 20초 |
| `search-filter` | 도매꾹 검색 인기순·낱개 필터 | 20초 |
| `margin-basic` | 순이익 계산 | 20초 |
| `margin-reverse` | 목표 마진 → 판매가 역산 | 20초 |
| `roas-basic` | 손익분기 ROAS | 20초 |
| `vat-basic` | 부가세 예상액 (간이/일반) | 20초 |

**총 32편.** 하나씩 쌓되 쓰레드 발행 순서에 맞춰 우선순위대로.

## 우선순위 (설문 1위 = 이미지)

```
1차: nukki-basic · nukki-bg-color · onelink-full · onelink-moq · split-basic
2차: resize-basic · watermark-text · keyword-basic · check-basic
3차: 나머지
```

## 파일 구조

```
tools/shorts-studio/
├─ scenarios/demo/           ← 데모 전용 시나리오
│   ├─ onelink-full.ts
│   ├─ nukki-basic.ts
│   └─ ...
├─ remotion/demo/
│   ├─ Demo.tsx              ← 데모 컴포지션 (세로)
│   └─ schema.ts
└─ scripts/build-demo.ts     ← npm run demo -- {id}

출력: docs/마케팅/영상/데모/{id}.mp4
```

## 대본 형식

시나리오 파일 안에 씬 제목·자막을 함께 정의한다 (별도 md 불필요 — 짧고 조작과 1:1).

```ts
export const demo: DemoScenario = {
  id: "nukki-basic",
  title: "이미지 여러 장 배경 제거",
  url: "/background-removal",
  scenes: [
    { title: "이미지 올리기", caption: "가공할 이미지를 한 번에 올립니다" },
    { title: "배경 제거", caption: "버튼 한 번이면 전부 처리됩니다" },
    { title: "받기", caption: "완성된 이미지를 묶어서 내려받습니다" },
  ],
  run: async (p) => { ... },
};
```
