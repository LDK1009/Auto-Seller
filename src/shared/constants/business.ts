//////////////////////////////////////// 사업자 정보 (법적 표기·PG 심사 요건) ////////////////////////////////////////
// ⚠️ 플레이스홀더 — 대표가 실값으로 교체할 것. 푸터·이용약관·개인정보처리방침이 공용으로 참조한다.

export const BUSINESS_INFO = {
  companyName: '오토셀러', // 상호 (사업자등록증 기준)
  representative: '(대표자명 입력)', // 대표자명
  registrationNumber: '000-00-00000', // 사업자등록번호
  address: '(사업장 주소 입력)', // 사업장 소재지
  email: 'devpreneur.ko@gmail.com', // 대표 연락 이메일 (CS 창구)
  phone: '(연락처 입력)', // 전화번호 — PG 심사 요건
} as const;

// 약관·방침 시행일 (갱신 시 이력 추가)
export const LEGAL_EFFECTIVE_DATE = '2026-07-22';
