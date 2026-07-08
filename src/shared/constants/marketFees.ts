//////////////////////////////////////// 마켓 수수료·마진 상수 (전역 공유) ////////////////////////////////////////
// 사용처: 마진 계산기 + 원링크 등록 준비 패키지

// 마켓별 대략 수수료율 프리셋 (%)
// ⚠️ 실제 수수료는 카테고리·결제수단·등급별로 다르다 — 대략치이며 직접 수정 가능함을 UI에 고지.
export const FEE_PRESETS: { key: string; label: string; rate: number }[] = [
  { key: 'smartstore', label: '스마트스토어', rate: 5.6 },
  { key: 'coupang', label: '쿠팡', rate: 10.8 },
  { key: 'street11', label: '11번가', rate: 13 },
  { key: 'gmarket', label: 'G마켓·옥션', rate: 13 },
];

export const FEE_DISCLAIMER =
  '수수료율은 대략치입니다. 실제 수수료는 카테고리·결제수단·판매자 등급에 따라 다르니 필요하면 직접 수정하세요.';

// 목표 마진율 프리셋 (%)
export const TARGET_MARGIN_PRESETS = [10, 15, 20, 30];
