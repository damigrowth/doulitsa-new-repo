'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import { CACHE_TAGS } from '@/lib/cache';
import { logCacheRevalidation } from '@/lib/cache/revalidation';

import { getAdminSessionWithPermission } from './helpers';

/**
 * Revalidate all taxonomy-related caches
 *
 * Call this after taxonomy updates are deployed to ensure
 * all pages show fresh taxonomy data.
 *
 * Affected caches:
 * - Categories page data (unstable_cache with 24h TTL)
 * - Navigation menu data
 * - Search taxonomies
 * - Archive pages
 */
export async function revalidateTaxonomyCaches(): Promise<{
  success: boolean;
  message: string;
  revalidated?: string[];
}> {
  try {
    // Auth check - require taxonomy edit permission
    await getAdminSessionWithPermission(ADMIN_RESOURCES.TAXONOMIES, 'edit');

    const revalidated: string[] = [];

    // 1. Revalidate tags used by getCategoriesPageData
    // These exact tags are in src/actions/services/get-categories.ts
    // Note: 'services' tag removed - taxonomy changes don't affect existing service assignments
    revalidateTag('categories');
    revalidated.push('tag:categories');

    revalidateTag('categories-page');
    revalidated.push('tag:categories-page');

    // 2. Revalidate navigation menu cache
    revalidateTag('navigation-menu');
    revalidated.push('tag:navigation-menu');

    // 3. Revalidate CACHE_TAGS from the cache system
    revalidateTag(CACHE_TAGS.search.taxonomies);
    revalidated.push(`tag:${CACHE_TAGS.search.taxonomies}`);

    revalidateTag(CACHE_TAGS.archive.all);
    revalidated.push(`tag:${CACHE_TAGS.archive.all}`);

    revalidateTag(CACHE_TAGS.archive.servicesFiltered);
    revalidated.push(`tag:${CACHE_TAGS.archive.servicesFiltered}`);

    revalidateTag(CACHE_TAGS.categories.all);
    revalidated.push(`tag:${CACHE_TAGS.categories.all}`);

    revalidateTag(CACHE_TAGS.home);
    revalidated.push(`tag:${CACHE_TAGS.home}`);

    // 4. Revalidate key public paths (use dynamic segment pattern to cover all instances)
    const staticPaths = ['/'];
    for (const path of staticPaths) {
      revalidatePath(path);
      revalidated.push(`path:${path}`);
    }

    revalidatePath('/categories', 'page');
    revalidated.push('path:/categories');
    revalidatePath('/categories/[category]', 'page');
    revalidated.push('path:/categories/[category]');

    revalidatePath('/ipiresies', 'page');
    revalidated.push('path:/ipiresies');
    revalidatePath('/ipiresies/[subcategory]', 'page');
    revalidated.push('path:/ipiresies/[subcategory]');
    revalidatePath('/ipiresies/[subcategory]/[subdivision]', 'page');
    revalidated.push('path:/ipiresies/[subcategory]/[subdivision]');

    // Log for monitoring
    logCacheRevalidation('service', 'taxonomies', 'admin taxonomy refresh');

    console.log(
      '[REVALIDATE_TAXONOMIES] Successfully revalidated:',
      revalidated,
    );

    return {
      success: true,
      message: `Επιτυχής ανανέωση cache (${revalidated.length} items)`,
      revalidated,
    };
  } catch (error) {
    console.error('[REVALIDATE_TAXONOMIES] Error:', error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Αποτυχία ανανέωσης cache',
    };
  }
}
