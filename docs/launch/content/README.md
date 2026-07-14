# 발행 콘텐츠 폴더 — 캘린더 겸 인덱스

> 계획 본체: [MARKETING.md](../../MARKETING.md) · W1 시작 = 2026-07-14 (계정 3종 개설일)
> **발행 완료 시 아래 표의 상태를 ✅로 바꾸고, 실제 발행일 기입.**

## 명명 규칙

```
{채널}-w{발행주차}-{슬러그}.md          예) blog-w4-image-specs.md
```

- 채널 = 폴더명과 동일: `cafe` `blog` `threads` `shorts`
- 주차 = 발행 목표 주 (W1 = 07-14~20, 이후 +7일). 스레드처럼 여러 주 걸치면 `w1w2`
- 같은 주 2건이면 슬러그로 구분 (순번 불필요)
- 파일 상단에 발행 채널·목표일·조준 검색어(블로그) 명시

## 발행 캘린더

| 목표 주 | 날짜 | 채널 | 파일 | 할 일 | 상태 |
|---------|------|------|------|------|------|
| W1 | 07-14~20 | threads | [threads-w1w2-daily14.md](threads/threads-w1w2-daily14.md) 1~7번 | 매일 밤 1포스트 (말투 다듬어서) | ⬜ |
| W1 | 07-14~20 | shorts | [shorts-w1-onelink-demo.md](shorts/shorts-w1-onelink-demo.md) | 녹화 + GIF 추출 (카페 글 의존물 — W2 전 필수) | ⬜ |
| W1 | 07-14~20 | (준비) | — | 카페 등업·댓글 활동, R-10 시험구매 발주 | ⬜ |
| W2 | 07-21~27 | cafe | [cafe-w2-first-post.md](cafe/cafe-w2-first-post.md) | **아사장 발행** (화~목 밤 9~11시) + 48h 댓글 상주 | ⬜ |
| W2 | 07-21~27 | threads | 위 파일 8~14번 | 매일 지속 (10번 = 카페 발행일에 맞춤) | ⬜ |
| W3 | 07-28~08-03 | cafe | cafe-w3-selleroceon.md (예정 — 아사장 반응 반영해 작성) | **셀러오션 발행** | ⬜ |
| W4 | 08-04~10 | blog | [blog-w4-image-specs.md](blog/blog-w4-image-specs.md) | 블로그 발행 (판매자센터 대조 후) + 카페 요약 공유 | ⬜ |
| W4 | 08-04~10 | shorts | W1 녹화본 | 유튜브 쇼츠 업로드 | ⬜ |
| W5 | 08-11~17 | blog | blog-w5-margin-traps.md (예정) | 마진 계산 함정 3개 | ⬜ |
| W5~ | — | threads | threads-w3plus 배치 (예정) | 주간 리듬: 일지 3 + 질문 1 + 팁 1 | ⬜ |

## 채널별 폴더

| 폴더 | 채널 | 발행 규칙 |
|------|------|----------|
| [cafe/](cafe/) | 아사장·셀러오션 | 곳당 월 1~2편, 가치글만, 발행 후 24h 댓글 응답 |
| [blog/](blog/) | 네이버 블로그 (오토셀러) | 주 1편, 검색어 조준, 글 끝 도구 링크 + UTM |
| [threads/](threads/) | 스레드 (오토셀러) | 1일 1포스트 밤 9~11시, 링크는 지정 포스트만 |
| [shorts/](shorts/) | 유튜브 쇼츠 | 스토리보드 → 녹화 → 카페 GIF·쇼츠 겸용 |

## 공통 규칙 (전 파일 적용)

- 초안 = Claude 생산, 발행 전 대표가 말투 다듬기 — **자동 발행 금지**
- 링크에 UTM: `utm_source={cafe|blog|threads|youtube}&utm_medium={post|shorts}&utm_campaign=launch-01`
- 금지 (BRAND 9장): 검증 안 된 수치 · 수익 보장 · 경쟁사 언급 · 도배 · 셀러 경험 사칭
