//////////////////////////////////////// 라우트 진입점: /excel-import ////////////////////////////////////////

import ExcelImportView from '@/views/excel-import/ExcelImportView';

import type { Metadata } from 'next';

// SEO — 제목은 루트 템플릿(%s | 오토셀러)으로 완성된다
export const metadata: Metadata = {
  title: '엑셀 대량 가공 — 대량등록 이미지 일괄 처리',
  description: '대량등록 엑셀 속 상품 이미지를 모아 배경 제거까지 한 번에 처리합니다. 무료, 가입 없음.',
  alternates: { canonical: '/excel-import' },
};

export default function Page() {
  return <ExcelImportView />;
}
