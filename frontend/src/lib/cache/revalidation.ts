/**
 * Centralized cache revalidation utilities
 * Simplifies and standardizes cache invalidation across server actions
 */

import { revalidateTag, revalidatePath } from 'next/cache';
import { CACHE_TAGS } from './index';





/**
 * Log cache revalidation for monitoring (development/production)
 */
export function logCacheRevalidation(
  type: 'service' | 'profile' | 'review',
  id: string | number,
  context?: string
) {
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_LOG_CACHE === 'true') {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` (${context})` : '';
    console.log(`[Cache Revalidation] ${type}:${id}${contextStr} at ${timestamp}`);
  }
}


// ---------------------------------------------------------------------------
// Public-page invalidation for the Django-backed data cache
// ---------------------------------------------------------------------------
// These match the tags attached by lib/api/profiles.ts / services.ts /
// core.ts and the unstable_cache archive wrappers in actions/*/get-*.ts:
//   page:profile:{username} | profiles:all | archive:profiles
//   service:id:{id} | service:slug:{slug} | services:all | archive:services
//   page:home | nav:menu | categories-page
// Call after any successful mutation that changes public content, so cached
// pages update instantly instead of waiting out the 5-minute TTL.

/** Invalidate one profile's public page (or ALL profiles when username is unknown). */
export async function revalidatePublicProfile(username?: string | null) {
  if (username) {
    revalidateTag(CACHE_TAGS.profile.page(username)); // page:profile:{u}
  } else {
    revalidateTag(CACHE_TAGS.collections.profiles); // profiles:all
  }
  revalidateTag('archive:profiles');
  revalidateTag(CACHE_TAGS.home); // page:home (featured profiles section)
  revalidatePath('/');
}

/** Invalidate one service's public page (or ALL services when id is unknown). */
export async function revalidatePublicService(
  serviceId?: number,
  opts?: { countsChanged?: boolean },
) {
  if (serviceId) {
    revalidateTag(CACHE_TAGS.service.byId(serviceId)); // service:id:{n}
  } else {
    revalidateTag(CACHE_TAGS.collections.services); // services:all
  }
  revalidateTag('archive:services');
  revalidateTag(CACHE_TAGS.home); // page:home (featured services section)
  revalidatePath('/');
  if (opts?.countsChanged) {
    // create/delete/status changes alter per-category counts.
    revalidateTag('nav:menu');
    revalidateTag('categories-page');
  }
}

/**
 * Invalidate the LOGGED-IN user's public profile page. Resolves the username
 * from the session; falls back to the broad profiles purge when unavailable.
 */
export async function revalidateMyPublicProfile() {
  try {
    const { getSession } = await import('@/actions/auth/server');
    const r = await getSession();
    const username =
      r.success && r.data?.user ? (r.data.user as { username?: string | null }).username : null;
    await revalidatePublicProfile(username ?? undefined);
  } catch {
    await revalidatePublicProfile();
  }
}

/** Invalidate the public blog (article pages + listings) after article writes. */
export async function revalidatePublicBlog(slug?: string | null) {
  if (slug) revalidateTag(CACHE_TAGS.article.bySlug(slug)); // article:slug:{s}
  revalidateTag(CACHE_TAGS.blog.articles); // blog:articles
}
