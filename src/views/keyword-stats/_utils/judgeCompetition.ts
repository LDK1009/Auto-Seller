//////////////////////////////////////// 경쟁강도 판정 (상품수 ÷ 월간 검색수 — 낮을수록 틈새) ////////////////////////////////////////
// 스탯 카드·연관 표·비교 표가 공유하는 단일 기준.
// 구간 재설계 (2026-07-24, 실측 32개 분포 기준 — ROADMAP "판정 구간 재설계 스펙"):
// - 검색량 게이트 선행: 월 100 미만이면 ratio를 보지 않는다 — 롱테일은 나눗셈이 폭발해
//   "수요 없음"이 "경쟁 치열"로 오판되던 문제(전 키워드 빨강 수렴)의 근본 원인
// - ratio 컷은 실측 분위수 근처: 10(p10=7)·50(p25=38)·200(중앙 81~p75 524 사이)

export type CompetitionVerdict = {
  label: string; // 판정 단어만 (뱃지용) — 수치는 별도 작은 텍스트로 병기
  color: 'success' | 'info' | 'warning' | 'error' | 'default';
  note?: string; // 보조 표시 (예: "수요 적음") — 노출 여부는 호출부 판단
};

const LOW_DEMAND_GATE = 100; // 월간 검색수 미만 = 수요 없음 (판정 불가)
const LOW_DEMAND_WARN = 500; // 판정과 별개 "수요 적음" 보조 표시 상한

export function judgeCompetition(ratio: number | null, monthlySearches: number | null): CompetitionVerdict {
  // 0) 수요 게이트 — 검색량이 바닥이면 경쟁 판정 자체가 무의미
  if (monthlySearches !== null && monthlySearches < LOW_DEMAND_GATE) {
    return { label: '수요 없음', color: 'default' };
  }
  if (ratio === null) return { label: '—', color: 'default' };

  const note =
    monthlySearches !== null && monthlySearches < LOW_DEMAND_WARN ? '수요 적음' : undefined;

  if (ratio < 10) return { label: '기회', color: 'success', note };
  if (ratio < 50) return { label: '해볼만', color: 'info', note };
  if (ratio < 200) return { label: '빡셈', color: 'warning', note };
  return { label: '치열', color: 'error', note };
}
