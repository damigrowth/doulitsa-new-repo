'use server';

import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type { DatasetItem } from '@/lib/types/datasets';
import { getBreadcrumbsForNewRoutes, getCountiesForArchiveFilters } from '@/lib/utils/datasets';
import { locationOptions } from '@/constants/datasets/locations';
import type {
  ArchiveServiceCardData,
  ArchiveTaxonomyData,
  AvailableTaxonomyLeaf,
  ServiceArchivePageData,
} from '@/lib/types/components';

export interface ServiceFilters {
  category?: string;
  subcategory?: string | string[];
  subdivision?: string;
  county?: string;
  online?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  excludeFeatured?: boolean;
}

/**
 * Resolve tag labels (`tagsData`) and profile pro-taxonomy badges on each
 * service card. The backend returns raw tag/taxonomy ids; OLD resolved these
 * from local datasets. Mirrors the enrichment in `getServiceArchivePageData`.
 */
async function enrichServiceCards(rows: unknown): Promise<unknown[]> {
  if (!Array.isArray(rows)) return [];
  const { enrichServiceCard, enrichProfileCard } = await import('@/lib/taxonomies/enrich');
  return (rows as Array<Record<string, unknown>>).map((s) => {
    const enriched = enrichServiceCard(s);
    if (enriched.profile && typeof enriched.profile === 'object') {
      enriched.profile = enrichProfileCard(enriched.profile as Record<string, unknown>);
    }
    return enriched;
  });
}

export async function getFeaturedServices(): Promise<ActionResult<unknown>> {
  try {
    const raw = (await servicesApi.getFeaturedServices()) as {
      mainCategories: unknown[];
      servicesByCategory: Record<string, unknown[]>;
      allServices: unknown[];
    };
    const servicesByCategory: Record<string, unknown[]> = {};
    for (const [key, list] of Object.entries(raw.servicesByCategory ?? {})) {
      servicesByCategory[key] = await enrichServiceCards(list);
    }
    return {
      success: true,
      data: {
        ...raw,
        servicesByCategory,
        allServices: await enrichServiceCards(raw.allServices),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getServicesWithPagination(options?: {
  page?: number;
  limit?: number;
  category?: string;
  excludeFeatured?: boolean;
}): Promise<ActionResult<{ services: unknown[]; total: number; hasMore: boolean }>> {
  try {
    const data = (await servicesApi.getServicesPaginated(options ?? {})) as {
      services: unknown[];
      total: number;
      hasMore: boolean;
    };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getServicesByFilters(filters: ServiceFilters): Promise<ActionResult<{
  services: unknown[]; total: number; hasMore: boolean;
}>> {
  try {
    const data = (await servicesApi.searchServices(filters)) as {
      services: unknown[]; total: number; hasMore: boolean;
    };
    return { success: true, data: { ...data, services: await enrichServiceCards(data.services) } };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getServicesCount(filters: Partial<ServiceFilters>): Promise<ActionResult<number>> {
  try {
    const total = (await servicesApi.countServices(filters)) as number;
    return { success: true, data: total };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

/** One distinct (category, subcategory, subdivision) slug path + usage count. */
export interface ServiceTaxonomyPath {
  category: string | null;
  subcategory: string | null;
  subdivision: string | null;
  count: number;
}

export async function getServiceTaxonomyPaths(): Promise<ActionResult<ServiceTaxonomyPath[]>> {
  try {
    return { success: true, data: (await servicesApi.getServiceTaxonomyPaths()) as ServiceTaxonomyPath[] };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

/** A thin taxonomy node `{ slug }` as the backend ships it before enrichment. */
interface TaxonomyStub {
  slug?: string;
  count?: number;
}

/**
 * The services-archive bundle as it arrives from Django, before frontend
 * taxonomy enrichment. Current/category nodes and the available-leaf lists are
 * raw `{ slug }` stubs; services are plain records the enrichers decorate.
 */
interface RawServiceArchiveBundle {
  services: ArchiveServiceCardData[];
  total: number;
  hasMore: boolean;
  taxonomyData?: {
    categories?: TaxonomyStub[];
    currentCategory?: TaxonomyStub | null;
    currentSubcategory?: TaxonomyStub | null;
    currentSubdivision?: TaxonomyStub | null;
  };
  breadcrumbData: ServiceArchivePageData['breadcrumbData'];
  counties: DatasetItem[];
  filters: ServiceArchivePageData['filters'];
  availableSubcategories?: TaxonomyStub[];
  availableSubdivisions?: TaxonomyStub[];
}

export async function getServiceArchivePageData(params: {
  categorySlug?: string;
  subcategorySlug?: string;
  subdivisionSlug?: string;
  limit?: number;
  searchParams: Record<string, unknown>;
}): Promise<ActionResult<ServiceArchivePageData>> {
  try {
    const bundle = (await servicesApi.getServiceArchiveBundle(
      params,
    )) as RawServiceArchiveBundle;
    // Backend returns thin `{slug}` references for current* and category nodes;
    // enrich them from the frontend taxonomy so pages can read .label,
    // .description, .image, .children.
    const { findServiceBySlug, findServiceById, getServiceTaxonomies } = await import('@/lib/taxonomies');
    const taxonomyData = bundle.taxonomyData ?? {};
    // Live data stores service taxonomy as cuid ids, demo data as slugs — try
    // both so the chips/sidebar/breadcrumb show names, not raw ids.
    const lookup = (k: string | null | undefined) =>
      (findServiceBySlug(k) ?? findServiceById(k)) as DatasetItem | null;

    const enrich = (node: TaxonomyStub | null | undefined): DatasetItem | null => {
      if (!node || !node.slug) return null;
      const full = lookup(node.slug);
      // Spread backend first so the full taxonomy node's label/description/image
      // override the backend's slug-as-label slim shape.
      return full ? { ...node, ...full } : { id: node.slug, slug: node.slug, label: node.slug };
    };

    // Lift backend's `availableSubcategories` / `availableSubdivisions` into
    // `taxonomyData.subcategories` / `.subdivisions` (the shape the sidebar
    // reads). Enrich each with its full taxonomy node so the dropdown can
    // render the Greek label instead of the raw slug.
    const enrichLeafList = (
      raw: TaxonomyStub[] | undefined,
      defaultPlural?: string,
    ): DatasetItem[] => {
      if (!Array.isArray(raw)) return [];
      return raw
        .map((leaf): DatasetItem | null => {
          if (!leaf?.slug) return null;
          const full = lookup(leaf.slug);
          return full
            ? { ...leaf, ...full }
            : { ...leaf, id: leaf.slug, label: leaf.slug, plural: defaultPlural };
        })
        .filter((x): x is DatasetItem => x != null);
    };

    const enrichedTaxonomyData: ArchiveTaxonomyData = {
      categories: Array.isArray(taxonomyData.categories)
        ? taxonomyData.categories
            .map(enrich)
            .filter((x): x is DatasetItem => x != null)
        : [],
      currentCategory: enrich(taxonomyData.currentCategory),
      currentSubcategory: enrich(taxonomyData.currentSubcategory),
      currentSubdivision: enrich(taxonomyData.currentSubdivision),
      subcategories: enrichLeafList(bundle.availableSubcategories),
      subdivisions: enrichLeafList(bundle.availableSubdivisions),
    };

    // The chip carousel above the listing reads `availableSubdivisions[i].label`
    // and `.href`. Backend gives slug+count only; enrich each entry from the
    // frontend taxonomy so the chips render their Greek labels.
    const currentSubcategorySlug =
      taxonomyData.currentSubcategory?.slug ?? params.subcategorySlug;
    // Root-archive chips need each subdivision's parent subcategory to build a
    // valid /ipiresies/{subcat}/{div} href (OLD get-services.ts:1305-1328 always
    // carried the context; without it /ipiresies/{div} renders 0 results).
    type TreeNode = DatasetItem & { children?: TreeNode[] };
    const divParent = new Map<string, string>();
    for (const cat of getServiceTaxonomies() as TreeNode[]) {
      for (const sub of cat.children ?? []) {
        for (const div of sub.children ?? []) {
          if (!divParent.has(div.slug)) divParent.set(div.slug, sub.slug);
          if (!divParent.has(div.id)) divParent.set(div.id, sub.slug);
        }
      }
    }
    const availableSubdivisions: AvailableTaxonomyLeaf[] = Array.isArray(
      bundle.availableSubdivisions,
    )
      ? bundle.availableSubdivisions
          .map((d): AvailableTaxonomyLeaf | null => {
            if (!d?.slug) return null;
            const full = lookup(d.slug);
            const slug = full?.slug ?? d.slug;
            return {
              id: full?.id ?? slug,
              slug,
              label: full?.label ?? d.slug,
              categorySlug: params.categorySlug ?? null,
              subcategorySlug:
                currentSubcategorySlug ?? divParent.get(slug) ?? divParent.get(d.slug) ?? null,
              count: d.count ?? 0,
              href: (currentSubcategorySlug ?? divParent.get(slug) ?? divParent.get(d.slug))
                ? `/ipiresies/${currentSubcategorySlug ?? divParent.get(slug) ?? divParent.get(d.slug)}/${slug}`
                : `/ipiresies/${slug}`,
            };
          })
          .filter((x): x is AvailableTaxonomyLeaf => x != null)
      : [];

    // Each service card reads `service.tagsData` (resolved tag labels) and
    // `service.profile.skillsData / specialityData / categoryData /
    // subcategoryData` (resolved pro taxonomy). Without this both the tag
    // chips and the profile-side badges render as raw cuids or hide entirely.
    const { enrichServiceCard, enrichProfileCard } = await import('@/lib/taxonomies/enrich');
    const services: ArchiveServiceCardData[] = (bundle.services ?? []).map((s) => {
      const enriched = enrichServiceCard({ ...s });
      if (enriched.profile && typeof enriched.profile === 'object') {
        enriched.profile = enrichProfileCard({ ...enriched.profile });
      }
      return enriched;
    });

    const data: ServiceArchivePageData = {
      services,
      total: bundle.total,
      hasMore: bundle.hasMore,
      taxonomyData: enrichedTaxonomyData,
      // OLD get-services.ts:1107-1118 — breadcrumbs generated from the frontend
      // taxonomy (backend's `breadcrumbs` key is unused/malformed).
      breadcrumbData: {
        segments: getBreadcrumbsForNewRoutes(
          getServiceTaxonomies() as DatasetItem[],
          currentSubcategorySlug ?? undefined,
          (taxonomyData.currentSubdivision?.slug ?? params.subdivisionSlug) ?? undefined,
          { basePath: '/ipiresies', baseLabel: 'Υπηρεσίες' },
        ),
      },
      // OLD get-services.ts:1099-1104 — counties for the filter dropdown come
      // from the frontend location dataset, not the backend bundle.
      counties: getCountiesForArchiveFilters(locationOptions as DatasetItem[]).map((l) => ({
        id: l.id,
        label: (l as { name?: string }).name ?? l.label,
        name: (l as { name?: string }).name ?? l.label,
        slug: l.slug,
      })) as unknown as ServiceArchivePageData['counties'],
      filters: bundle.filters,
      availableSubdivisions,
    };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
