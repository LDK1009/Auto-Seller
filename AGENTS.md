<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 프로젝트 문서 지도 (docs/)

docs는 **기획 / 개발 / 마케팅** 3역할로 관리한다 (2026-07-15 재편). 기능·UI·우선순위 판단 전에 반드시 아래 기준 문서를 참조할 것.

| 문서 | 성격 | 용도 |
|------|------|------|
| `docs/기획/PLAN.md` | 기획서 (전략+브랜드 통합) | 미션·타겟·경쟁·수익화·게이트·리스크·**비목표** + 브랜드(9장: 네이밍·슬로건·마케팅 원칙·금지 표현) — **모든 판단의 기준**. 진행 상태는 다루지 않음(로드맵 소관) |
| `docs/개발/ROADMAP.md` | 개발 로드맵 | 기능 체크리스트·실행 순서·개발 원칙 — **태스크 파일**: 작업 시작 전 항목 확인, 완료 시 `[x]` 처리. AI 판단 가동 절차·운영 메모 포함 |
| `docs/개발/FEATURES.md` | 기능 스냅샷 | **현재 배포된 화면에 실제로 있는 기능** — 단일 출처. 기획서·마케팅 문서는 여기를 링크만 하고 복제하지 않는다 (만들 예정=로드맵, 왜 만드나=기획서) |
| `docs/개발/design/` | 디자인 레퍼런스 | 디자인 원칙 6개·비주얼 토큰·**UX 라이팅(톤앤매너·UI 문구)**(README.md) + 토스 공식 TDS 링크 + 토스류 디자인 규칙(DESIGN-LANGUAGE.md)·Toss 토큰. **UI 작업·사용자 노출 문구 작성 시 기본 준수 (별도 스킬 없음)** |
| `docs/마케팅/MARKETING.md` | 콘텐츠 생산 체계 | 대외 표현 + 채널별 운영 + 콘텐츠 3축(A 문제해결·B 여정·C 정보성) 작성 플로우 — 마케팅 콘텐츠 작성 시 기준. **주축 = 유튜브 롱폼** (2026-07-21 전환) |
| `docs/개발/LONGFORM-PIPELINE.md` | 롱폼 제작 파이프라인 | 대본 포맷·TTS 연동·타임라인 조립·숏폼 추출 설계 — 영상 자동화 작업 시 참조 |
| `docs/마케팅/소재/` | 소재 리서치 | 검색 키워드·질문 채굴·경쟁 채널 분석 — 콘텐츠 소재 선정 시 참조 |

> ⚠️ **갱신 트리거:** 사용자 노출 기능(원링크 시트·도구·계산기)을 추가·변경·삭제하면 같은 작업에서 `docs/개발/FEATURES.md`를 갱신할 것 — 마케팅 콘텐츠가 이 표 기준으로 생산되므로 어긋나면 실제 화면과 다른 글이 발행된다.
