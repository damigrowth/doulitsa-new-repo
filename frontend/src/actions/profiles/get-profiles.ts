'use server';

import { unstable_cache } from 'next/cache';

import * as profilesApi from '@/lib/api/profiles';
import { ApiError } from '@/lib/api/client';
import { enrichProfileCard } from '@/lib/taxonomies/enrich';
import type { ActionResult } from '@/lib/types/api';
import type {
  ArchiveProfileCardData,
  ProfileArchivePageData,
} from '@/lib/types/components';
import type { DatasetItem } from '@/lib/types/datasets';
import { getCountiesForArchiveFilters } from '@/lib/utils/datasets';
import { locationOptions } from '@/constants/datasets/locations';

/**
 * Profile list / count / archive / taxonomy-paths — Django-backed.
 * The Django side handles caching internally for the cacheable variants
 * (count cached 30m, taxonomy-paths cached 24h, directory cached 2h).
 */

export interface ProfileFilters {
  category?: string;
  subcategory?: string | string[];
  role?: 'freelancer' | 'company';
  published?: boolean;
  county?: string;
  online?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

export async function getProfilesByFilters(
  filters: ProfileFilters,
): Promise<ActionResult<{ profiles: unknown[]; total: number; hasMore: boolean }>> {
  try {
    const data = (await profilesApi.searchProfiles(filters)) as {
      profiles: Array<Record<string, unknown>>;
      total: number;
      hasMore: boolean;
    };
    // Backend returns raw skill slugs / pro-taxonomy IDs. The cards expect
    // `skillsData / specialityData / categoryData / subcategoryData`. Enrich
    // here so the entire archive uses the right shapes.
    return {
      success: true,
      data: { ...data, profiles: data.profiles.map(enrichProfileCard) },
    };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getProfilesCount(filters: Partial<ProfileFilters>): Promise<ActionResult<number>> {
  try {
    const total = (await profilesApi.countProfiles(filters)) as number;
    return { success: true, data: total };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

async function _getProfileArchivePageDataUncached(params: {
  archiveType?: 'pros' | 'companies' | 'directory';
  categorySlug?: string;
  subcategorySlug?: string;
  limit?: number;
  searchParams: Record<string, unknown>;
}): Promise<ActionResult<ProfileArchivePageData>> {
  try {
    const bundle = (await profilesApi.getArchiveBundle(params)) as ProfileArchivePageData;
    // Enrich each profile in the bundle so card components find skillsData etc.,
    // and resolve the nav taxonomy (sidebar/chips/breadcrumb) from raw pro ids
    // to labels + slug-based /dir hrefs (otherwise they show cuids like "YQqkAO").
    const { findProBySlug, findProById, findServiceBySlug, findServiceById } =
      await import('@/lib/taxonomies');
    const lookup = (k: string | null | undefined) =>
      (findProBySlug(k) ?? findProById(k) ?? findServiceBySlug(k) ?? findServiceById(k)) as
        DatasetItem | null;
    const node = (n: DatasetItem | null | undefined): DatasetItem | null => {
      if (!n) return null;
      const f = lookup(n.slug ?? n.id);
      return f ? { ...n, ...f } : n;
    };
    // OLD get-profiles.ts:557-569 — unknown category/subcategory slug is a hard
    // 'Category not found' (the pages turn it into notFound()).
    if (params.categorySlug && !lookup(params.categorySlug)) {
      return { success: false, error: 'Category not found' };
    }
    if (params.subcategorySlug && !lookup(params.subcategorySlug)) {
      return { success: false, error: 'Category not found' };
    }
    const tax = bundle.taxonomyData ?? { categories: [] };
    const data: ProfileArchivePageData = {
      ...bundle,
      profiles: bundle.profiles.map((p) => enrichProfileCard({ ...p })),
      // OLD get-profiles.ts:732-737 — counties for the filter dropdown come from
      // the frontend location dataset (backend ships an empty list).
      counties: getCountiesForArchiveFilters(locationOptions as DatasetItem[]).map((l) => ({
        id: l.id,
        label: (l as { name?: string }).name ?? l.label,
        name: (l as { name?: string }).name ?? l.label,
        slug: l.slug,
      })) as unknown as ProfileArchivePageData['counties'],
      taxonomyData: {
        ...tax,
        categories: (tax.categories ?? []).map(node).filter((x): x is DatasetItem => x != null),
        currentCategory: node(tax.currentCategory),
        currentSubcategory: node(tax.currentSubcategory),
        currentSubdivision: node(tax.currentSubdivision),
        subcategories: (tax.subcategories ?? []).map(node).filter((x): x is DatasetItem => x != null),
        subdivisions: (tax.subdivisions ?? []).map(node).filter((x): x is DatasetItem => x != null),
      },
      availableSubcategories: (bundle.availableSubcategories ?? []).map((leaf) => {
        const r = lookup(leaf.subcategorySlug || leaf.slug);
        const cat = leaf.categorySlug ? lookup(leaf.categorySlug)?.slug ?? leaf.categorySlug : null;
        if (!r) return leaf;
        const slug = r.slug;
        return {
          ...leaf,
          id: r.id,
          label: r.label,
          slug,
          categorySlug: cat,
          subcategorySlug: slug,
          href: cat ? `/dir/${cat}/${slug}` : `/dir/${slug}`,
        };
      }),
      breadcrumbData: bundle.breadcrumbData
        ? {
            ...bundle.breadcrumbData,
            segments: (bundle.breadcrumbData.segments ?? []).map((seg) => ({
              ...seg,
              label: lookup(seg.label)?.label ?? seg.label,
              href:
                seg.href == null
                  ? seg.href
                  : seg.href.split('/').map((p) => lookup(p)?.slug ?? p).join('/'),
            })),
          }
        : bundle.breadcrumbData,
    };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getProTaxonomyPaths(
  role?: 'freelancer' | 'company',
): Promise<ActionResult<{ category?: string; subcategory?: string }[]>> {
  try {
    const data = (await profilesApi.getProfileTaxonomyPaths(role)) as {
      category?: string;
      subcategory?: string;
    }[];
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}


// Cached wrapper for the archive bundle: the data is public and identical for
// every visitor with the same filters, so cache the FINAL enriched result for
// 5 minutes, keyed by the filter combination. Failures are thrown inside so
// an error response is never cached; profile writes purge via the tags below.
const _cachedProfileArchive = unstable_cache(
  async (key: string) => {
    const res = await _getProfileArchivePageDataUncached(JSON.parse(key));
    if (!res.success) throw new Error(res.error || 'archive fetch failed');
    return res;
  },
  ['profile-archive-bundle'],
  { revalidate: 300, tags: ['archive:profiles', 'profiles:all'] },
);

export async function getProfileArchivePageData(
  params: Parameters<typeof _getProfileArchivePageDataUncached>[0],
): ReturnType<typeof _getProfileArchivePageDataUncached> {
  try {
    const res = await _cachedProfileArchive(JSON.stringify(params));
    // OLD get-profiles.ts:770-815 filled the filter dropdowns with pro
    // categories/subcategories THAT HAVE PROFILES; the backend ships
    // taxonomyData.categories empty, which left the archive filters blank
    // (QA). The directory payload is exactly that data. Merged HERE, outside
    // unstable_cache — inside it Next rejects the tagged fetch — using the
    // 5-min tagged directory cache shared with /directory, purged on
    // profile writes. Degrades to empty lists on failure.
    if (res.success && !(res.data.taxonomyData?.categories ?? []).length) {
      try {
        const dir = (await profilesApi.getDirectoryData({ limit: 1 })) as {
          categories?: Array<{ slug: string; subcategories?: Array<{ slug: string; count?: number; type?: string }> }>;
        };
        const { findProBySlug, findProById } = await import('@/lib/taxonomies');
        const look = (k: string | null | undefined) => findProBySlug(k) ?? findProById(k);
        const dirCats = dir.categories ?? [];
        const td = res.data.taxonomyData;
        td.categories = dirCats
          .map((c) => look(c.slug))
          .filter((x): x is DatasetItem => x != null) as typeof td.categories;
        if (params.categorySlug && !(td.subcategories ?? []).length) {
          const catSlug = look(params.categorySlug)?.slug ?? params.categorySlug;
          const cur = dirCats.find((c) => (look(c.slug)?.slug ?? c.slug) === catSlug);
          td.subcategories = (cur?.subcategories ?? [])
            .map((sub) => {
              const r = look(sub.slug);
              return r
                ? ({ ...r, count: sub.count, type: sub.type ?? (r as { type?: string }).type } as DatasetItem)
                : null;
            })
            .filter((x): x is DatasetItem => x != null) as typeof td.subcategories;
        }
      } catch {
        /* filters degrade to empty, page still renders */
      }
    }
    return res;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Σφάλμα δικτύου' };
  }
}
