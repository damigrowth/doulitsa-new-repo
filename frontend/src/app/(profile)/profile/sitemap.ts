import type { MetadataRoute } from 'next';

// Revalidate every 1 hour to keep in sync with profile updates
export const revalidate = 3600;

const API_BASE: string =
  process.env.DJANGO_INTERNAL_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

interface SitemapEntry {
  slug: string; // username for profiles
  updated_at: string | null;
}

/**
 * Generates sitemap for all published user profiles at /profile/[username]
 * Fetches username + updated_at from the Django backend
 * (GET /api/seo/sitemap-entries?kind=profiles), mirroring the legacy
 * Prisma-based sitemap (published, active, username set, user confirmed
 * and not blocked).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl: string = process.env.LIVE_URL || 'https://doulitsa.gr';

  try {
    const res = await fetch(
      `${API_BASE}/api/seo/sitemap-entries?kind=profiles&limit=50000`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as { entries?: SitemapEntry[] };

    return (data.entries ?? [])
      .filter((entry) => Boolean(entry.slug))
      .map((entry) => ({
        url: `${baseUrl}/profile/${encodeURIComponent(entry.slug)}`,
        lastModified: entry.updated_at ? new Date(entry.updated_at) : new Date(),
      }));
  } catch (error) {
    console.error('Error generating profiles sitemap:', error);
    return [];
  }
}
