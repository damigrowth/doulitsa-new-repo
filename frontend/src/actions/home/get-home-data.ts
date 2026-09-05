'use server';

import * as coreApi from '@/lib/api/core';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type {
  ArchiveProfileCardData,
  HomePageData,
  ServiceCardData,
} from '@/lib/types/components';
import type { DatasetItem } from '@/lib/types/datasets';

interface ThinSlug { slug: string; count?: number; categorySlug?: string; subcategorySlug?: string }

const fallback = (): HomePageData => ({
  services: { mainCategories: [], servicesByCategory: {}, allServices: [] },
  profiles: [],
  popularSubcategories: [],
  categoriesWithSubcategories: [],
  proSubcategoriesWithProfiles: [],
  serviceSubcategoriesWithServices: [],
});

/**
 * The backend returns slim slug-only references for popularSubcategories /
 * categoriesWithSubcategories (it doesn't carry the taxonomy tree). The UI
 * needs label, description, image, icon to render properly. Enrich each item
 * from the frontend taxonomy — this matches what the previous Prisma-backed
 * action used to return.
 */
export async function getHomePageData(): Promise<ActionResult<HomePageData>> {
  try {
    const raw = (await coreApi.getHomePageData()) as Record<string, unknown>;
    const { findServiceBySlug, findServiceById, findProBySlug, findProById } =
      await import('@/lib/taxonomies');

    // The Strapi-style production data stores taxonomy IDs (cuids like
    // "5Pz3MV") in services.category/subcategory/subdivision, not the URL
    // slugs. The demo seed used slug strings. Plus `popularSubcategories` on
    // /api/home comes from the PRO taxonomy (e.g. "kathigites-xenon-glosson")
    // — completely different vocabulary from service taxonomies. To work
    // with all three (service id, service slug, pro id, pro slug) we try
    // each lookup in order. Always re-derive `slug` from the resolved node
    // so hrefs/keys are stable, kebab-case URL slugs.
    type TaxNode = { id: string; label: string; slug: string; description?: string; image?: unknown; icon?: string };
    const resolve = (key: string | null | undefined): TaxNode | null =>
      (findServiceById(key) as TaxNode | null)
      ?? (findServiceBySlug(key) as TaxNode | null)
      ?? (findProById(key) as TaxNode | null)
      ?? (findProBySlug(key) as TaxNode | null);

    const enrichLeaf = (item: ThinSlug): DatasetItem => {
      const full = resolve(item.slug);
      const sub = resolve(item.subcategorySlug ?? null);
      const cat = resolve(item.categorySlug ?? null);
      const subSlug = sub?.slug ?? item.subcategorySlug ?? '';
      const catSlug = cat?.slug ?? item.categorySlug ?? '';
      const leafSlug = full?.slug ?? item.slug;
      const href = catSlug && subSlug
        ? `/ipiresies/${subSlug}/${leafSlug}`
        : subSlug
          ? `/ipiresies/${subSlug}`
          : catSlug
            ? `/categories/${catSlug}`
            : `/categories`;
      return { ...item, ...(full ?? {}), id: full?.id ?? item.slug, slug: leafSlug, href };
    };

    const TOP_SUBS_PER_CARD = 5; // production home cards list 5 subcategories
    const enrichCategoryTree = (
      item: ThinSlug & { subcategories?: ThinSlug[] },
    ): DatasetItem & { subcategories: DatasetItem[] } => {
      const full = resolve(item.slug);
      const catSlug = full?.slug ?? item.slug;
      // Drop subcategories that don't resolve in the taxonomy (orphan cuids
      // from production data not yet synced) OR have zero published services.
      // Then show only the top-N by count so each card stays consistent with
      // production layout instead of dumping every sub on screen.
      const subs: DatasetItem[] = (item.subcategories ?? [])
        .filter((s) => (s.count ?? 0) > 0)
        .map((s) => ({ s, full: resolve(s.slug) }))
        .filter((entry): entry is { s: ThinSlug; full: TaxNode } => entry.full != null)
        .sort((a, b) => (b.s.count ?? 0) - (a.s.count ?? 0))
        .slice(0, TOP_SUBS_PER_CARD)
        .map(({ s, full: fullSub }) => ({
          ...s,
          ...fullSub,
          id: fullSub.id,
          slug: fullSub.slug,
          href: `/ipiresies/${fullSub.slug}`,
        }));
      return {
        ...item,
        ...(full ?? {}),
        id: full?.id ?? item.slug,
        slug: catSlug,
        href: `/categories/${catSlug}`,
        subcategories: subs,
      };
    };

    // Build the bottom-of-home grids ("Κατηγορίες Υπηρεσιών" / "Κατηγορίες
    // Επαγγελμάτων"). Mirror OLD get-home-data.ts:253-256 exactly: the services
    // grid lists SUBDIVISIONS with published services (top 100 by count, from
    // the categories-page data) and the pros grid lists pro subcategories with
    // profiles (top 100, from the directory data) — NOT the home payload's
    // counted subcategory tree, which only has ~70 level-2 entries.
    const [{ getDirectoryPageData }, servicesApi] = await Promise.all([
      import('@/actions/profiles/get-directory'),
      import('@/lib/api/services'),
    ]);
    const [categoriesRaw, directoryRes] = await Promise.all([
      (servicesApi.getCategoriesPage({}) as Promise<Record<string, unknown>>).catch(
        () => null,
      ),
      getDirectoryPageData({ limit: 100 }),
    ]);

    // Backend subdivisions carry raw taxonomy IDs on live data — resolve
    // id-or-slug and AGGREGATE by resolved node (the live taxonomy has slug
    // collisions, and services are stored against either id).
    type RawSubdivision = {
      slug?: unknown;
      subcategorySlug?: unknown;
      count?: unknown;
    };
    const divRows = new Map<string, DatasetItem & { count: number }>();
    const rawSubdivisions = Array.isArray(categoriesRaw?.subdivisions)
      ? (categoriesRaw.subdivisions as RawSubdivision[])
      : [];
    for (const s of rawSubdivisions) {
      if (typeof s.slug !== 'string' || typeof s.count !== 'number' || s.count <= 0) continue;
      const div = resolve(s.slug);
      const sub = resolve(typeof s.subcategorySlug === 'string' ? s.subcategorySlug : null);
      if (!div || !sub) continue; // orphan ids not in the frontend taxonomy
      const existing = divRows.get(div.id);
      if (existing) {
        existing.count += s.count;
      } else {
        divRows.set(div.id, {
          id: div.id,
          label: div.label,
          slug: div.slug,
          count: s.count,
          href: `/ipiresies/${sub.slug}/${div.slug}`,
        });
      }
    }
    const serviceSubcategoriesWithServices: DatasetItem[] = [...divRows.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    const proSubcategoriesWithProfiles: DatasetItem[] = directoryRes.success
      ? directoryRes.data.popularSubcategories.map((sub) => ({
          id: sub.id,
          label: sub.label,
          slug: sub.slug,
          count: sub.count,
          href: sub.href,
        }))
      : [];

    // Backend returns `services.mainCategories` as a flat string array of
    // either slugs (demo data) or cuid IDs (production data). CategoryTabs
    // expects `{id, label, slug}`, so resolve through the same id-or-slug
    // helper and prefer the canonical taxonomy slug.
    const rawServices = (raw.services as Record<string, unknown> | undefined) ?? {};
    const mainCategoriesResolved: Array<{ id: string; label: string; slug: string }> =
      Array.isArray(rawServices.mainCategories)
        ? (rawServices.mainCategories as Array<string | { id?: string; label?: string; slug?: string }>).map(
            (c) => {
              if (typeof c !== 'string') {
                const slug = c.slug ?? c.id ?? '';
                return { id: c.id ?? slug, slug, label: c.label ?? slug };
              }
              const full = resolve(c);
              const slug = full?.slug ?? c;
              // `id` MUST equal the key the backend uses in `servicesByCategory`
              // — which is the canonical slug. Using the cuid here would make
              // the featured-services tabs go to a never-matching lookup.
              return { id: slug, slug, label: full?.label ?? c };
            },
          )
        : [];

    const servicesByCategoryRaw = (rawServices.servicesByCategory ?? {}) as Record<
      string,
      ServiceCardData[]
    >;
    const allServices = (rawServices.allServices ?? []) as ServiceCardData[];
    const servicesByCategory: Record<string, ServiceCardData[]> = {
      all: allServices,
      ...servicesByCategoryRaw,
    };

    // The store defaults to activeCategory='all' and the production layout
    // shows an "Όλες" pill at the start of the carousel tabs. OLD only listed
    // the top-level service categories as tabs; the Django home payload returns
    // the full flattened taxonomy (categories + every subcategory), most of
    // which carry no featured services. Show "Όλες" plus only the categories
    // that actually have services so there are no dead/empty tabs (clicking one
    // would otherwise show "Δεν βρέθηκαν υπηρεσίες σε αυτήν την κατηγορία").
    const mainCategories = [
      { id: 'all', slug: 'all', label: 'Όλες' },
      ...mainCategoriesResolved.filter(
        (c) => (servicesByCategoryRaw[c.id]?.length ?? 0) > 0,
      ),
    ];

    const popularSubcategories: DatasetItem[] = Array.isArray(raw.popularSubcategories)
      ? (raw.popularSubcategories as ThinSlug[])
          // Skip orphan ID-only entries the frontend taxonomy doesn't know.
          .filter((p) => resolve(p.slug) != null)
          .map(enrichLeaf)
      : [];

    const categoriesWithSubcategories: DatasetItem[] = Array.isArray(
      raw.categoriesWithSubcategories,
    )
      ? (raw.categoriesWithSubcategories as Array<ThinSlug & { subcategories?: ThinSlug[] }>)
          // OLD `get-home-data.ts:352-354` only kept categories whose taxonomy
          // node has `featured === true`, then sliced to 8. Reproduce that here
          // (the backend returns all categories so the bottom-of-home subcat
          // grids still see every live subcategory).
          .filter((c) => {
            const full = resolve(c.slug) as (TaxNode & { featured?: boolean }) | null;
            return full?.featured === true;
          })
          .slice(0, 8)
          .map(enrichCategoryTree)
          // After per-sub filtering, drop categories that ended up empty
          // so the 8-card grid never has a card with no links underneath.
          .filter((c) => (c.subcategories?.length ?? 0) > 0)
          // Sort alphabetically by Greek label so the grid order matches
          // production (Δημιουργία, Εκδηλώσεις, Ευεξία, Μαθήματα, …).
          .sort((a, b) =>
            ((a as { label?: string }).label ?? a.slug).localeCompare(
              (b as { label?: string }).label ?? b.slug,
              'el',
            ),
          )
      : [];

    // Resolve taxonomy ids → labels + coverage ids → Greek names on the home
    // cards (popular professionals + the featured-services carousel), same as
    // the archive/directory cards — otherwise they show raw ids.
    const { enrichServiceCard, enrichProfileCard } = await import('@/lib/taxonomies/enrich');
    const enrichServiceRow = (s: ServiceCardData): ServiceCardData => {
      const e = enrichServiceCard(s);
      return e.profile && typeof e.profile === 'object'
        ? { ...e, profile: enrichProfileCard(e.profile) }
        : e;
    };
    const enrichedAll = allServices.map(enrichServiceRow);
    const enrichedByCategory: Record<string, ServiceCardData[]> = {};
    for (const [key, list] of Object.entries(servicesByCategory)) {
      enrichedByCategory[key] = key === 'all' ? enrichedAll : list.map(enrichServiceRow);
    }
    const enrichedProfiles = ((raw.profiles ?? []) as ArchiveProfileCardData[]).map(
      (p) => enrichProfileCard(p),
    );

    const data: HomePageData = {
      services: { mainCategories, servicesByCategory: enrichedByCategory, allServices: enrichedAll },
      profiles: enrichedProfiles,
      popularSubcategories,
      categoriesWithSubcategories,
      serviceSubcategoriesWithServices,
      proSubcategoriesWithProfiles,
    };
    // The page reads `homeDataResult.success && homeDataResult.data` — keep
    // that contract so the inline fallback isn't triggered on every request.
    return { success: true as const, data };
  } catch (err) {
    if (err instanceof ApiError) {
      console.error('home.data failed:', err.message);
    }
    return { success: false as const, error: 'home_data_failed', data: fallback() };
  }
}
