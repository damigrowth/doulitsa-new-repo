import { NextResponse } from 'next/server';

/**
 * Sitemap Index Route Handler
 * Generates sitemap index that references all individual sitemaps
 * All sitemaps use Next.js 15 built-in sitemap.ts approach (Option B)
 */

// ISR revalidation - update sitemap index daily
export const revalidate = 86400;

export async function GET() {
  try {
    const baseUrl: string = process.env.LIVE_URL || 'https://doulitsa.gr';

    const sitemaps: string[] = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/s/sitemap.xml`,
      `${baseUrl}/profile/sitemap.xml`,
      `${baseUrl}/categories/sitemap.xml`,
      `${baseUrl}/ipiresies/sitemap.xml`,
      `${baseUrl}/dir/sitemap.xml`,
      `${baseUrl}/articles/sitemap.xml`,
    ];

    const sitemapIndexXML: string = buildSitemapIndex(sitemaps);

    return new NextResponse(sitemapIndexXML, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(sitemapIndexXML).toString(),
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    return NextResponse.error();
  }
}

function buildSitemapIndex(sitemaps: string[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  for (const sitemapURL of sitemaps) {
    xml += '<sitemap>';
    xml += `<loc>${sitemapURL}</loc>`;
    xml += '</sitemap>';
  }

  xml += '</sitemapindex>';
  return xml;
}
