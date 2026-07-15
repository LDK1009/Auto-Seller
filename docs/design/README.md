# 디자인 레퍼런스

**원칙: 별도 스킬 없이, 아래 규칙 문서를 UI 작업의 기본 기준으로 준수한다** (2026-07-06 대표 결정).

---

## 디자인 원칙 (2026-07-06 확정 — 구 BRAND.md 7장, 2026-07-15 이관)

> **경쟁사(윈들리·드랩아트 등) 디자인은 참고하지 않는다.** 대신 이업종 선진 사례인 **토스의 UI/UX 노하우를 적극 차용**한다 — 단, 브랜드 얼굴(인디고·체커보드)은 우리 것 유지.

### 원칙 6개

1. **화면당 핵심 행동 1개** — 각 화면에서 사용자가 다음에 할 일이 하나로 보여야 한다 (주 CTA 1개, 나머지는 조용히)
2. **타이포 위계로 말한다** — 제목은 크고 무겁게(Pretendard 700~800), 부가정보는 작고 연하게. 균질한 밀도 금지
3. **여백·라운드·보더 중심** — 그림자 최소화, 얇은 보더 + 큰 라운드(토큰 2단계로 통일). 도구 화면은 밀도 있게, 안내 화면은 여백 크게
4. **모션은 기능 피드백만** — 상태 변화(완료·전환·진행)에만 스프링/이즈 모션 150~300ms. 장식 모션 금지 (과한 모션 = 싸구려)
5. **쉬운 한국어 UX 라이팅** — 기획서 10.4 톤앤매너를 UI에 그대로 적용
6. **시그니처 모티프: 투명 체커보드** — 누끼의 상징이자 제품에서 나온 우리 것. 로고·빈 화면·히어로 패턴에 재사용

### 구현 방식

- 디자인 시스템 = **코드** (MUI 중앙 테마 토큰 + `shared/components`) — 별도 Figma 없이 테마가 단일 진실
- **Toss 스킨 토큰 이식 완료(07-06)**: `toss-skin-tokens.css`의 텍스트 위계·서피스·그림자·라운드 체계를 MUI 테마로 번역 (Tailwind 변수 직접 사용 ❌, 브랜드 컬러는 인디고 계열 유지 — Toss 퍼플 ❌)
- 토큰 수술 대상: 그림자 스케일(card/hover/elevated/modal), 라운드 통일(0.625rem 기준), 텍스트 3위계(primary/secondary/tertiary), 인디고 틴트(`brand-tint` 상당), 숫자 tabular figure
- 품질 관리: UI 작업 시 DESIGN-LANGUAGE 규칙(특히 §3 위계·§12 그림자·§18 금지 규칙) 기본 준수 — 별도 스킬 없음

### 비주얼 토큰 (현행)

| 토큰 | 값 | 위치 |
|------|-----|------|
| Primary | 소프트 인디고 `#6366F1` (2026-07-06 A/B 실화면 비교 후 대표 확정 — 조용한 서피스와 온도를 맞춘 밝은 인디고) | [theme.ts](../../../src/shared/theme/theme.ts) |
| Secondary | 시안 `#06B6D4` | 〃 |
| 배경/페이퍼 | `#FFFFFF` / `#F7F8FB` | 〃 |
| 서체 | Pretendard (변수 폰트 self-host) | [pretendard.ts](../../../src/shared/theme/pretendard.ts) |
| 로고 | 텍스트 로고 + 아이콘 (임시 — 정식 로고 미정, 체커보드 모티프 후보) | AppHeader |

- 색·서체 변경은 테마 토큰에서만 (하드코딩 금지)

---

## 1차 소스 — 토스 공식

- [앱인토스 개발자센터 · TDS 컴포넌트](https://developers-apps-in-toss.toss.im/design/components.html)
- [TDS Mobile 문서](https://tossmini-docs.toss.im/tds-mobile/)
- UI 패턴·컴포넌트 규칙이 필요할 때 여기부터 확인

## 벤더링 자료

출처: [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT License) — v2.6.0 기준, 2026-07-06 벤더링.

| 파일 | 내용 | 우리의 사용법 |
|------|------|--------------|
| `DESIGN-LANGUAGE.md` | 토스류 디자인 판단 규칙 74개 (28개 챕터: 텍스트 위계·숫자 표기·그림자·금지 규칙 등) | UI 작업 시 판단 기준으로 항상 준수 |
| `toss-skin-tokens.css` | Toss 스킨 토큰 원본 (색·그림자·라운드·텍스트 위계) | **MUI 테마로 이식할 소스** — Tailwind CSS 변수를 그대로 쓰지 않고 [theme.ts](../../../src/shared/theme/theme.ts) 토큰으로 번역 |
| `toss-skin.json` | 스킨 메타 | 참고용 |

## 주의

- StyleSeed의 컴포넌트·생성 스킬(/ss-setup 등)은 **React+Tailwind v4 전용**이라 이식하지 않았다. 우리 스택은 MUI+Emotion — 규칙과 토큰 값만 차용한다.
- 브랜드 컬러는 우리 것(소프트 인디고 `#6366F1`) 유지 — Toss 퍼플(`#721FE5`)로 바꾸지 않는다. 가져오는 건 위계·그림자·라운드·서피스 체계다.
- 원본 갱신 확인: https://github.com/bitjaru/styleseed
