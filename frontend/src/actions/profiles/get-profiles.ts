'use server';

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

export async function getProfileArchivePageData(params: {
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
