'use client';

//////////////////////////////////////// 환불 규정 ////////////////////////////////////////
// 구독형 유료 서비스 기준 초안 — PG(빌링) 심사 요건. 법률 검토 전.

import LegalDocument, { type LegalSection } from '@/shared/components/LegalDocument';
import { BUSINESS_INFO } from '@/shared/constants/business';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. 적용 범위',
    paragraphs: [
      '이 규정은 오토셀러의 유료 구독 서비스 결제에 적용됩니다. 무료 도구에는 결제가 발생하지 않습니다.',
    ],
  },
  {
    heading: '2. 청약철회 (결제 후 7일 이내)',
    paragraphs: [
      '결제일로부터 7일 이내에 유료 기능을 사용한 이력이 없는 경우, 전액 환불을 요청할 수 있습니다. 전자상거래 등에서의 소비자보호에 관한 법률에 따릅니다.',
    ],
  },
  {
    heading: '3. 구독 해지',
    paragraphs: [
      '· 이용자는 언제든지 구독을 해지할 수 있습니다.\n· 해지 시 다음 결제일부터 결제가 중단되며, 이미 결제한 이용 기간이 끝날 때까지 유료 기능을 계속 이용할 수 있습니다.\n· 이용 기간 중도 해지에 따른 잔여 기간의 일할 환불은 회사 귀책 사유가 있는 경우에 한합니다.',
    ],
  },
  {
    heading: '4. 회사 귀책 사유로 인한 환불',
    paragraphs: [
      '회사의 시스템 장애 등으로 결제 후 유료 서비스를 정상 이용하지 못한 경우, 이용하지 못한 기간에 대해 일할 계산하여 환불하거나 이용 기간을 연장합니다.',
    ],
  },
  {
    heading: '5. 환불 방법 및 처리 기간',
    paragraphs: [
      `· 환불 요청: ${BUSINESS_INFO.email}\n· 환불은 결제에 사용한 결제수단으로 처리되며, 승인 취소 또는 환불 처리는 요청 접수일로부터 영업일 기준 3일 이내에 진행합니다. (카드사 사정에 따라 실제 반영은 3~7일 소요될 수 있습니다)`,
    ],
  },
];

export default function RefundPolicyView() {
  return <LegalDocument title="환불 규정" sections={SECTIONS} />;
}
