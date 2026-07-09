//////////////////////////////////////// 경쟁강도 판정 (상품수 ÷ 월간 검색수 — 낮을수록 틈새) ////////////////////////////////////////
// 스탯 카드·연관 표·비교 표가 공유하는 단일 기준.

export type CompetitionVerdict = {
  label: string;
  color: 'success' | 'warning' | 'error' | 'default';
};

export function judgeCompetition(ratio: number | null): CompetitionVerdict {
  if (ratio === null) return { label: '—', color: 'default' };
  if (ratio < 1) return { label: `${ratio} 틈새`, color: 'success' };
  if (ratio <= 5) return { label: `${ratio} 보통`, color: 'warning' };
  return { label: `${ratio} 치열`, color: 'error' };
}
