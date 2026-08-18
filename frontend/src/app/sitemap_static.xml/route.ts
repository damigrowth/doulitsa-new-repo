import type { MetadataRoute } from 'next';

/**
 * Route handler for /sitemap_static.xml
 * Generates sitemap for static pages
 */
export async function GET() {
  const baseUrl: string = process.env.LIVE_URL || 'https://doulitsa.gr';

  const staticPaths: string[] = [
    'about',
    'contact',
    'faq',
    'articles',
    'privacy',
    'terms',
    'cookies',
    'politiki-akirosis',
    'login',
    'register',
    'for-pros',
    'categories',
    'ipiresies',
    'directory',
    'dir',
  ];

  const staticUrls: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${baseUrl}/${path}`,
    lastModified: new Date(),
  }));

  const allUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    ...staticUrls,
  ];

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (entry) => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified instanceof Date ? entry.lastModified.toISOString() : new Date(entry.lastModified!).toISOString()}</lastmod>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
