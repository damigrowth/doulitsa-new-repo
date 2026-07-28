import { NextResponse } from 'next/server';

/**
 * Sitemap Index
 * Returns a sitemap index XML that links to all sub-sitemaps
 *
 * This replaces the default sitemap.xml with a sitemap index
 * that points to individual sitemaps for each section
 */
export async function GET() {
  const baseUrl = process.env.LIVE_URL || 'https://doulitsa.gr';

  const sitemaps = [
    `${baseUrl}/sitemap_static.xml`,
    `${baseUrl}/s/sitemap.xml`,
    `${baseUrl}/categories/sitemap.xml`,
    `${baseUrl}/profile/sitemap.xml`,
    `${baseUrl}/ipiresies/sitemap.xml`,
    `${baseUrl}/dir/sitemap.xml`,
    `${baseUrl}/articles/sitemap.xml`,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (url) => `  <sitemap>
    <loc>${url}</loc>
  </sitemap>`,
  )
  .join('\n')}
</sitemapindex>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
