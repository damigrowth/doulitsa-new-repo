import type { MetadataRoute } from 'next';
import { getServiceTaxonomyPaths } from '@/actions/services/get-services';

// Revalidate every 1 hour to keep in sync with service taxonomy updates
export const revalidate = 3600;

/**
 * Generates sitemap for service categories at /categories/[category]
 * Fetches unique categories from published services using the same query as generateStaticParams
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl: string = process.env.LIVE_URL || 'https://doulitsa.gr';

  try {
    const result = await getServiceTaxonomyPaths();

    if (!result.success || !result.data) {
      return [];
    }

    const uniqueCategories = Array.from(
      new Set(
        result.data
          .filter((path) => path.category)
          .map((path) => path.category!),
      ),
    );

    return uniqueCategories.map((categorySlug) => ({
      url: `${baseUrl}/categories/${categorySlug}`,
      lastModified: new Date(),
    }));
  } catch (error) {
    console.error('Error generating categories sitemap:', error);
    return [];
  }
}
