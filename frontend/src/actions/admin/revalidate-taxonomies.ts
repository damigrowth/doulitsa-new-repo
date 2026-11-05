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

    // XC-DEADREVAL: this action used to clear the OLD app's tag names
    // ('categories', 'navigation-menu', archive:all, …) which no fetch in the
    // new data layer uses — the button was a no-op. These are the tags the
    // current fetches actually carry (lib/api/{core,services,profiles}.ts).
    const liveTags = [
      'categories-page',
      'nav:menu',
      'archive:services',
      'archive:profiles',
      'services:all',
      'profiles:all',
      'search:suggestions',
      'taxonomy-paths',
      CACHE_TAGS.home, // page:home
    ];
    for (const tag of liveTags) {
      revalidateTag(tag);
      revalidated.push(`tag:${tag}`);
    }

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
