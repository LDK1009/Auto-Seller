//////////////////////////////////////// robots (/robots.txt) ////////////////////////////////////////

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/shared/constants/app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dev/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
