'use client';

//////////////////////////////////////// 개인정보처리방침 ////////////////////////////////////////
// 표준 템플릿 기반 초안 — 법률 검토 전. 실제 수집 항목과 일치하도록 유지할 것.

import LegalDocument, { type LegalSection } from '@/shared/components/LegalDocument';
import { BUSINESS_INFO } from '@/shared/constants/business';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. 수집하는 개인정보 항목 및 수집 방법',
    paragraphs: [
      '회사는 다음 정보를 수집합니다.\n· 회원 가입(카카오 로그인) 시: 카카오 계정 식별자, 이메일, 닉네임, 프로필 이미지(카카오 제공 범위 내)\n· 유료 서비스 결제 시: 결제 승인·이력 정보(결제수단 정보 자체는 결제대행사가 보관하며 회사는 카드번호 전체를 저장하지 않습니다)\n· 서비스 이용 과정에서 자동 수집: 접속 기록, 이용 기록(Google Analytics — 쿠키 기반 비식별 통계)',
    ],
  },
  {
    heading: '2. 개인정보의 처리 목적',
    paragraphs: [
      '· 회원 식별 및 로그인 상태 유지\n· 유료 서비스 결제 처리, 구독 관리, 환불 등 계약 이행\n· 서비스 개선을 위한 비식별 통계 분석\n· 법령상 의무 이행 (전자상거래법상 거래기록 보존 등)',
    ],
  },
  {
    heading: '3. 이용자가 업로드하는 이미지의 처리',
    paragraphs: [
      '이용자가 이미지 도구에 업로드하는 이미지는 이용자의 브라우저 내에서만 처리되며 회사 서버로 전송·저장되지 않습니다. 도매꾹 등 외부 상품 링크로 가져오는 공개 상품 이미지는 CORS 해소를 위한 전달 목적으로만 서버를 경유하며 저장하지 않습니다.',
    ],
  },
  {
    heading: '4. 개인정보의 보유 및 이용 기간',
    paragraphs: [
      '· 회원 정보: 회원 탈퇴 시 지체 없이 파기\n· 전자상거래 관련 기록(법정 보존): 계약·청약철회 기록 5년, 대금결제·재화 공급 기록 5년, 소비자 불만·분쟁처리 기록 3년\n· 접속 기록: 통신비밀보호법에 따라 3개월',
    ],
  },
  {
    heading: '5. 개인정보 처리의 위탁 및 제3자 제공',
    paragraphs: [
      '회사는 서비스 운영을 위해 다음 업체에 처리를 위탁합니다.\n· Supabase Inc. — 회원 데이터베이스 및 인증 인프라\n· Vercel Inc. — 서비스 호스팅\n· 토스페이먼츠(주) — 결제 처리\n· Google LLC — 이용 통계 분석(Google Analytics)\n회사는 이용자의 동의 없이 개인정보를 제3자에게 판매·제공하지 않습니다.',
    ],
  },
  {
    heading: '6. 이용자의 권리와 행사 방법',
    paragraphs: [
      `이용자는 언제든지 본인의 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다. 요청은 ${BUSINESS_INFO.email}로 접수하며, 회사는 지체 없이 조치합니다. 회원 탈퇴(계정 삭제) 요청 시 법정 보존 의무 대상을 제외한 정보를 파기합니다.`,
    ],
  },
  {
    heading: '7. 개인정보 보호책임자',
    paragraphs: [
      `개인정보 보호책임자: ${BUSINESS_INFO.representative}\n문의: ${BUSINESS_INFO.email}`,
    ],
  },
];

export default function PrivacyView() {
  return <LegalDocument title="개인정보처리방침" sections={SECTIONS} />;
}
