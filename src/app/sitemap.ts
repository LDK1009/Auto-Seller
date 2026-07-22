//////////////////////////////////////// 사이트맵 (/sitemap.xml) ////////////////////////////////////////
// 공개 라우트 전체 — /dev·/api 제외. 새 도구 추가 시 여기에도 등록할 것.

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/shared/constants/app';

// [경로, 우선순위] — 랜딩·원링크가 핵심 유입 페이지
const PUBLIC_ROUTES: [string, number][] = [
  ['/', 1],
  ['/domeggook-import', 0.9],
  ['/domeggook-search', 0.7],
  ['/keyword-stats', 0.7],
  ['/margin-calculator', 0.7],
  ['/background-removal', 0.7],
  ['/image-resize', 0.6],
  ['/image-check', 0.6],
  ['/watermark', 0.6],
  ['/image-split', 0.6],
  ['/excel-import', 0.6],
  ['/roas-calculator', 0.6],
  ['/vat-calculator', 0.6],
  ['/terms', 0.2],
  ['/privacy', 0.2],
  ['/refund-policy', 0.2],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map(([path, priority]) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: 'weekly',
    priority,
  }));
}
