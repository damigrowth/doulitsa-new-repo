import type { MetadataRoute } from 'next';
import { getProTaxonomyPaths } from '@/actions/profiles/get-profiles';

// Revalidate every 1 hour to keep in sync with directory taxonomy updates
export const revalidate = 3600;

/**
 * Generates sitemap for unified directory (all professional profiles)
 * Routes:
 * - /dir/[category] (e.g., /dir/electrician)
 * - /dir/[category]/[subcategory] (e.g., /dir/electrician/residential)
 *
 * Fetches unique taxonomy paths from all published professional profiles (both freelancers and companies)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl: string = process.env.LIVE_URL || 'https://doulitsa.gr';

  try {
    // Get paths for all types (no type filter = both freelancers and companies)
    const result = await getProTaxonomyPaths();

    if (!result.success || !result.data) {
      return [];
    }

    const urls: MetadataRoute.Sitemap = [];

    // Get unique categories
    const uniqueCategories = Array.from(
      new Set(
        result.data
          .filter((path) => path.category)
          .map((path) => path.category!),
      ),
    );

    // Add category URLs
    uniqueCategories.forEach((categorySlug) => {
      urls.push({
        url: `${baseUrl}/dir/${categorySlug}`,
        lastModified: new Date(),
      });
    });

    // Add subcategory URLs
    const subcategoryPaths = result.data.filter(
      (path) => path.category && path.subcategory,
    );

    subcategoryPaths.forEach((path) => {
      urls.push({
        url: `${baseUrl}/dir/${path.category}/${path.subcategory}`,
        lastModified: new Date(),
      });
    });

    return urls;
  } catch (error) {
    console.error('Error generating directory sitemap:', error);
    return [];
  }
}
