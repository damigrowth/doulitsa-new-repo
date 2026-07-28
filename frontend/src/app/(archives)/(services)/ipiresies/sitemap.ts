import type { MetadataRoute } from 'next';
import { getServiceTaxonomyPaths } from '@/actions/services/get-services';

// Revalidate every 1 hour to keep in sync with service taxonomy updates
export const revalidate = 3600;

/**
 * Generates sitemap for service subcategories and subdivisions
 * Routes:
 * - /ipiresies/[subcategory] (e.g., /ipiresies/plumbing)
 * - /ipiresies/[subcategory]/[subdivision] (e.g., /ipiresies/plumbing/emergency)
 *
 * Fetches unique taxonomy paths from published services using the same query as generateStaticParams
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl: string = process.env.LIVE_URL || 'https://doulitsa.gr';

  try {
    const result = await getServiceTaxonomyPaths();

    if (!result.success || !result.data) {
      return [];
    }

    const urls: MetadataRoute.Sitemap = [];

    const uniqueSubcategories = Array.from(
      new Set(
        result.data
          .filter((path) => path.category && path.subcategory)
          .map((path) => path.subcategory!),
      ),
    );

    uniqueSubcategories.forEach((subcategorySlug) => {
      urls.push({
        url: `${baseUrl}/ipiresies/${subcategorySlug}`,
        lastModified: new Date(),
      });
    });

    const subdivisionPaths = result.data.filter(
      (path) => path.category && path.subcategory && path.subdivision,
    );

    subdivisionPaths.forEach((path) => {
      urls.push({
        url: `${baseUrl}/ipiresies/${path.subcategory}/${path.subdivision}`,
        lastModified: new Date(),
      });
    });

    return urls;
  } catch (error) {
    console.error('Error generating ipiresies sitemap:', error);
    return [];
  }
}
