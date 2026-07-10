//////////////////////////////////////// 인증·인허가 지뢰 감지 ////////////////////////////////////////
// 상품명·카테고리 키워드 기반으로 KC 인증/인허가 대상 가능성을 경고한다 (규칙 기반 — 판정이 아니라 주의 환기).
// 초보 셀러의 최대 공포 = "모르고 팔았다가 제재" — 인증 필요 가능성을 등록 전에 알려주는 것 자체가 가치.

export type ComplianceRisk = {
  type: string; // 인증 유형
  matched: string[]; // 감지된 키워드
  guide: string; // 확인 안내
};

const RISK_RULES: { type: string; keywords: string[]; guide: string }[] = [
  {
    type: 'KC 전기용품 인증',
    keywords: ['전구', '조명', '랜턴', 'led', '충전기', '어댑터', '배터리', '보조배터리', '멀티탭', '가습기', '선풍기', '히터', '드라이기', '전기'],
    guide: '전기용품은 KC 인증번호 없이 판매 시 제재 대상입니다. 공급사에 KC 인증서를 요청하세요.',
  },
  {
    type: 'KC 어린이제품 인증',
    keywords: ['유아', '아동', '키즈', '어린이', '완구', '장난감', '신생아', '베이비', '유모차', '카시트'],
    guide: '어린이제품은 KC 인증 필수입니다. 인증 없는 상품은 첫 실험에서 피하는 것을 권장합니다.',
  },
  {
    type: '식품 인허가',
    keywords: ['식품', '과자', '영양제', '비타민', '유산균', '건강기능', '홍삼', '분말', '원액'],
    guide: '식품은 건강기능식품 판매업 신고 등 인허가가 필요할 수 있습니다.',
  },
  {
    type: '화장품 책임판매',
    keywords: ['화장품', '크림', '로션', '세럼', '샴푸', '에센스', '마스크팩', '선크림', '앰플'],
    guide: '화장품은 책임판매업 등록 상품인지 공급사에 확인하세요.',
  },
  {
    type: '의료기기·의약외품',
    keywords: ['마스크', '살균', '소독', '체온계', '의료', '멸균'],
    guide: '의료기기·의약외품은 허가 없이 판매할 수 없습니다. 일반 공산품인지 확인하세요.',
  },
];

export function detectComplianceRisk(title: string, categoryPath: string | null): ComplianceRisk[] {
  const haystack = `${title} ${categoryPath ?? ''}`.toLowerCase();

  const risks: ComplianceRisk[] = [];
  for (const rule of RISK_RULES) {
    const matched = rule.keywords.filter((keyword) => haystack.includes(keyword));
    if (matched.length > 0) {
      risks.push({ type: rule.type, matched, guide: rule.guide });
    }
  }
  return risks;
}
