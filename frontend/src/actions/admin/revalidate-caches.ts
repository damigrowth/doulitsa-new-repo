'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { CACHE_TAGS } from '@/lib/cache';

/**
 * Revalidate ALL caches after a deployment
 *
 * This clears all cached data so users see fresh content immediately.
 * Called automatically by Vercel deploy webhook.
 *
 * Cost: Zero - revalidation just marks cache entries as stale.
 * The actual regeneration happens on first user visit.
 */
export async function revalidateAllCaches(): Promise<{
  success: boolean;
  message: string;
  revalidated?: string[];
}> {
  try {
    const revalidated: string[] = [];

    // ============================================
    // 1. COLLECTION TAGS (bulk invalidation)
    // ============================================
    revalidateTag(CACHE_TAGS.collections.profiles);
    revalidated.push(`tag:${CACHE_TAGS.collections.profiles}`);

    revalidateTag(CACHE_TAGS.collections.services);
    revalidated.push(`tag:${CACHE_TAGS.collections.services}`);

    revalidateTag(CACHE_TAGS.collections.verifications);
    revalidated.push(`tag:${CACHE_TAGS.collections.verifications}`);

    // ============================================
    // 2. ARCHIVE TAGS
    // ============================================
    revalidateTag(CACHE_TAGS.archive.all);
    revalidated.push(`tag:${CACHE_TAGS.archive.all}`);

    revalidateTag(CACHE_TAGS.archive.servicesFiltered);
    revalidated.push(`tag:${CACHE_TAGS.archive.servicesFiltered}`);

    // ============================================
    // 3. SEARCH TAGS
    // ============================================
    revalidateTag(CACHE_TAGS.search.taxonomies);
    revalidated.push(`tag:${CACHE_TAGS.search.taxonomies}`);

    revalidateTag(CACHE_TAGS.search.all);
    revalidated.push(`tag:${CACHE_TAGS.search.all}`);

    // ============================================
    // 4. ADMIN TAGS
    // ============================================
    revalidateTag(CACHE_TAGS.admin.all);
    revalidated.push(`tag:${CACHE_TAGS.admin.all}`);

    revalidateTag(CACHE_TAGS.admin.profiles);
    revalidated.push(`tag:${CACHE_TAGS.admin.profiles}`);

    revalidateTag(CACHE_TAGS.admin.services);
    revalidated.push(`tag:${CACHE_TAGS.admin.services}`);

    revalidateTag(CACHE_TAGS.admin.verifications);
    revalidated.push(`tag:${CACHE_TAGS.admin.verifications}`);

    // ============================================
    // 5. DIRECTORY/CATEGORIES TAGS
    // ============================================
    revalidateTag(CACHE_TAGS.directory.all);
    revalidated.push(`tag:${CACHE_TAGS.directory.all}`);

    revalidateTag(CACHE_TAGS.categories.all);
    revalidated.push(`tag:${CACHE_TAGS.categories.all}`);

    // ============================================
    // 6. PAGE TAGS
    // ============================================
    revalidateTag(CACHE_TAGS.home);
    revalidated.push(`tag:${CACHE_TAGS.home}`);

    // ============================================
    // 7. TAXONOMY-SPECIFIC TAGS (from getCategoriesPageData)
    // ============================================
    revalidateTag('services');
    revalidated.push('tag:services');

    revalidateTag('categories');
    revalidated.push('tag:categories');

    revalidateTag('categories-page');
    revalidated.push('tag:categories-page');

    revalidateTag('navigation-menu');
    revalidated.push('tag:navigation-menu');

    // ============================================
    // 8. KEY PUBLIC PATHS
    // ============================================
    revalidatePath('/');
    revalidated.push('path:/');

    // Invalidate dynamic route patterns (covers all instances of [param])
    revalidatePath('/categories/[category]', 'page');
    revalidated.push('path:/categories/[category]');

    revalidatePath('/ipiresies', 'page');
    revalidated.push('path:/ipiresies');

    revalidatePath('/ipiresies/[subcategory]', 'page');
    revalidated.push('path:/ipiresies/[subcategory]');

    revalidatePath('/ipiresies/[subcategory]/[subdivision]', 'page');
    revalidated.push('path:/ipiresies/[subcategory]/[subdivision]');

    revalidatePath('/dir', 'page');
    revalidated.push('path:/dir');

    revalidatePath('/dir/[category]', 'page');
    revalidated.push('path:/dir/[category]');

    revalidatePath('/dir/[category]/[subcategory]', 'page');
    revalidated.push('path:/dir/[category]/[subcategory]');

    revalidatePath('/directory');
    revalidated.push('path:/directory');

    console.log(
      '[REVALIDATE_ALL] Successfully revalidated all caches:',
      revalidated.length,
      'items',
    );

    return {
      success: true,
      message: `Successfully revalidated ${revalidated.length} cache entries`,
      revalidated,
    };
  } catch (error) {
    console.error('[REVALIDATE_ALL] Error:', error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to revalidate caches',
    };
  }
}
