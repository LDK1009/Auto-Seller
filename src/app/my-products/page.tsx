//////////////////////////////////////// 라우트 진입점: /my-products ////////////////////////////////////////
// 개인 목록 — 검색엔진 색인 제외.

import type { Metadata } from 'next';
import MyProductsView from '@/views/my-products/MyProductsView';

export const metadata: Metadata = {
  title: '내 상품 목록',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MyProductsView />;
}
