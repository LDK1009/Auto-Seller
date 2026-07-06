# 디자인 레퍼런스

**원칙: 별도 스킬 없이, 아래 규칙 문서를 UI 작업의 기본 기준으로 준수한다** (2026-07-06 대표 결정).

## 1차 소스 — 토스 공식

- [앱인토스 개발자센터 · TDS 컴포넌트](https://developers-apps-in-toss.toss.im/design/components.html)
- [TDS Mobile 문서](https://tossmini-docs.toss.im/tds-mobile/)
- UI 패턴·컴포넌트 규칙이 필요할 때 여기부터 확인

## 벤더링 자료

출처: [bitjaru/styleseed](https://github.com/bitjaru/styleseed) (MIT License) — v2.6.0 기준, 2026-07-06 벤더링.

| 파일 | 내용 | 우리의 사용법 |
|------|------|--------------|
| `DESIGN-LANGUAGE.md` | 토스류 디자인 판단 규칙 74개 (28개 챕터: 텍스트 위계·숫자 표기·그림자·금지 규칙 등) | UI 작업 시 판단 기준으로 항상 준수 |
| `toss-skin-tokens.css` | Toss 스킨 토큰 원본 (색·그림자·라운드·텍스트 위계) | **MUI 테마로 이식할 소스** — Tailwind CSS 변수를 그대로 쓰지 않고 [theme.ts](../../src/shared/theme/theme.ts) 토큰으로 번역 |
| `toss-skin.json` | 스킨 메타 | 참고용 |

## 주의

- StyleSeed의 컴포넌트·생성 스킬(/ss-setup 등)은 **React+Tailwind v4 전용**이라 이식하지 않았다. 우리 스택은 MUI+Emotion — 규칙과 토큰 값만 차용한다.
- 브랜드 컬러는 우리 것(인디고 `#4F46E5`) 유지 — Toss 퍼플(`#721FE5`)로 바꾸지 않는다. 가져오는 건 위계·그림자·라운드·서피스 체계다.
- 원본 갱신 확인: https://github.com/bitjaru/styleseed
