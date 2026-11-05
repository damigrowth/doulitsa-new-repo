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
import {
  filterTaxonomyByType,
  findAllSubcategoriesBySlug,
  findBySlug,
  findTaxonomyBySlugInContext,
  getCountiesForArchiveFilters,
  getTaxonomyBreadcrumbs,
} from '@/lib/utils/datasets';
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
    const { findProBySlug, findProById, findServiceBySlug, findServiceById, getProTaxonomies } =
      await import('@/lib/taxonomies');
    type TreeNode = DatasetItem & { children?: TreeNode[]; type?: string };
    const sp = (params.searchParams ?? {}) as Record<string, unknown>;

    // OLD get-profiles.ts:487-569 — TYPE-SCOPED, level-aware resolution of the
    // route taxonomy against the PRO tree (P1-12 / CG-1). The former global
    // `findProBySlug ?? findProById ?? findServiceBySlug ?? …` lookup let a
    // service slug (/dir/udraulika) or a colliding slug resolve to the wrong
    // node, and picked an arbitrary gender/type variant for the current node.
    const archiveType = params.archiveType ?? 'directory';
    let targetType: 'freelancer' | 'company' | undefined;
    if (archiveType === 'directory') {
      targetType =
        sp.type === 'pros' ? 'freelancer' : sp.type === 'companies' ? 'company' : undefined;
    } else {
      targetType = archiveType === 'pros' ? 'freelancer' : 'company';
    }
    const proTree = getProTaxonomies() as TreeNode[];
    const filteredTaxonomies = (
      targetType ? filterTaxonomyByType(proTree, targetType) : proTree
    ) as TreeNode[];

    let routeCategory: TreeNode | undefined;
    let routeSubcategory: TreeNode | undefined;
    if (params.categorySlug) {
      if (params.subcategorySlug) {
        const matches = findAllSubcategoriesBySlug(
          filteredTaxonomies,
          params.categorySlug,
          params.subcategorySlug,
        );
        if (matches.length > 0) {
          routeCategory = findBySlug(filteredTaxonomies, params.categorySlug);
          routeSubcategory = matches[0];
        } else {
          const ctx =
            findTaxonomyBySlugInContext(
              filteredTaxonomies,
              params.categorySlug,
              params.subcategorySlug,
            ) || {};
          routeCategory = ctx.category;
          routeSubcategory = ctx.subcategory;
        }
      } else {
        // OLD: depth-first findBySlug (top-level nodes before their children).
        routeCategory = findBySlug(filteredTaxonomies, params.categorySlug);
      }
      if (!routeCategory) {
        return { success: false, error: 'Category not found' };
      }
      if (params.subcategorySlug && !routeSubcategory) {
        return { success: false, error: 'Subcategory not found' };
      }
    }

    const bundle = (await profilesApi.getArchiveBundle(params)) as ProfileArchivePageData;
    // Enrich each profile in the bundle so card components find skillsData etc.,
    // and resolve the nav taxonomy (sidebar/chips/breadcrumb) from raw pro ids
    // to labels + slug-based /dir hrefs (otherwise they show cuids like "YQqkAO").
    const lookup = (k: string | null | undefined) =>
      (findProBySlug(k) ?? findProById(k) ?? findServiceBySlug(k) ?? findServiceById(k)) as
        DatasetItem | null;
    const node = (
      n: DatasetItem | null | undefined,
      resolved?: DatasetItem | null,
    ): DatasetItem | null => {
      if (!n) return resolved ?? null;
      const f = resolved ?? lookup(n.slug ?? n.id);
      return f ? { ...n, ...f } : n;
    };

    // Parent category of a pro subcategory (prefer the route's category so a
    // slug shared by two categories resolves in context).
    const parentOf = (sub: DatasetItem): TreeNode | undefined => {
      const has = (c: TreeNode) =>
        (c.children ?? []).some((ch) => ch.id === sub.id || ch.slug === sub.slug);
      if (routeCategory && has(routeCategory)) return routeCategory;
      return proTree.find((c) => (c.children ?? []).some((ch) => ch.id === sub.id));
    };

    // OLD breadcrumbs (get-profiles.ts:738-768): generated from the pro tree
    // with PLURAL labels; base crumb links to /directory; on the root page the
    // base crumb is unlinked.
    let baseLabel: string;
    let basePath: string;
    let baseHref: string | undefined;
    if (archiveType === 'directory') {
      baseLabel = 'Επαγγελματικός Κατάλογος';
      basePath = '/dir';
      baseHref = '/directory';
    } else {
      baseLabel = archiveType === 'pros' ? 'Επαγγελματίες' : 'Επιχειρήσεις';
      basePath = archiveType === 'pros' ? '/dir?type=pros' : '/dir?type=companies';
    }
    const breadcrumbSegments = params.categorySlug
      ? getTaxonomyBreadcrumbs(
          filteredTaxonomies,
          params.categorySlug,
          params.subcategorySlug,
          undefined,
          { basePath, baseLabel, baseHref, usePlural: true },
        )
      : [{ label: 'Αρχική', href: '/' }, { label: baseLabel }];

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
        categories: (tax.categories ?? []).map((n) => node(n)).filter((x): x is DatasetItem => x != null),
        currentCategory: node(tax.currentCategory, routeCategory),
        currentSubcategory: node(tax.currentSubcategory, routeSubcategory),
        currentSubdivision: node(tax.currentSubdivision),
        subcategories: (tax.subcategories ?? []).map((n) => node(n)).filter((x): x is DatasetItem => x != null),
        subdivisions: (tax.subdivisions ?? []).map((n) => node(n)).filter((x): x is DatasetItem => x != null),
      },
      // OLD get-profiles.ts:836-905 / get-directory.ts:136-147 — pills carry
      // the PLURAL label and link to /dir/<category>/<subcategory>. A
      // subcategory with no resolvable parent category is dropped (OLD
      // `if (!cat) return`), never linked as /dir/<sub> or /dir/null/<sub>.
      availableSubcategories: (bundle.availableSubcategories ?? [])
        .map((leaf) => {
          const r = findProById(leaf.subcategorySlug || leaf.slug) ??
            findProBySlug(leaf.subcategorySlug || leaf.slug);
          if (!r) return null;
          const cat = parentOf(r);
          if (!cat) return null;
          if (routeCategory && cat.slug !== routeCategory.slug) return null;
          if (routeSubcategory && r.slug === routeSubcategory.slug) return null;
          const subType = (r as { type?: string }).type;
          if (targetType && subType && subType !== targetType) return null;
          return {
            ...leaf,
            id: r.id,
            label: r.plural || r.label,
            slug: r.slug,
            categorySlug: cat.slug,
            subcategorySlug: r.slug,
            type: (subType || leaf.type || 'freelancer') as 'freelancer' | 'company',
            href: `/dir/${cat.slug}/${r.slug}`,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null),
      breadcrumbData: {
        ...(bundle.breadcrumbData ?? {}),
        segments: breadcrumbSegments,
      },
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
