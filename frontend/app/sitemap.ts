import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bananaaquapark.com';
const locales = ['es', 'en'];
const pages = ['', '/rooms', '/daypass', '/events', '/gallery', '/contact', '/privacy', '/terms'];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const page of pages) {
      const url = `${SITE_URL}/${locale}${page}`;
      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'weekly' : 'monthly',
        priority: page === '' ? 1.0 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${SITE_URL}/${l}${page}`])
          ),
        },
      });
    }
  }

  return entries;
}
