// app/robots.ts — SEO robots configuration
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/'],
      },
    ],
    sitemap: 'https://www.remixip.icu/sitemap.xml',
  };
}
