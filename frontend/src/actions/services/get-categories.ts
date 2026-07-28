'use server';

import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type {
  NavigationMenuCategory,
  NavigationMenuSubcategory,
  NavigationMenuSubdivision,
} from '@/lib/types/components';

/**
 * Shape consumed by `<CategoriesGrid>`. The frontend taxonomy is the source
 * of truth for `label`, `description`, `image`, `icon`; the backend supplies
 * counts. We compose the two into the tree the component expects.
 */
export interface CategoryWithSubcategories {
  id: string;
  slug: string;
  label: string;
  description?: string;
  icon?: string;
  image?: unknown;
  href: string;
  count?: number;
  subcategories: Array<{
    id: string;
    slug: string;
    label: string;
    href: string;
    count?: number;
  }>;
}

export interface SubdivisionItem {
  id: string;
  slug: string;
  label: string;
  href: string;
  image?: unknown;
  description?: string;
  count?: number;
  categorySlug: string;
  subcategorySlug: string;
}

// Use the dedicated services-archive routes so each click lands on a page
// that actually lists services (the /categories pages are taxonomy nav).
const categoryHref = (cat: string) => `/categories/${cat}`;
const subcategoryHref = (_cat: string, sub: string) => `/ipiresies/${sub}`;
const subdivisionHref = (_cat: string, sub: string, div: string) =>
  `/ipiresies/${sub}/${div}`;

export async function getCategoriesPageData(options?: {
  categorySlug?: string;
  subcategorySlug?: string;
  limit?: number;
}): Promise<ActionResult<{ categories: CategoryWithSubcategories[]; subdivisions: SubdivisionItem[] }>> {
  try {
    const [raw, tax] = await Promise.all([
      servicesApi.getCategoriesPage(options ?? {}) as Promise<Record<string, unknown>>,
      import('@/lib/taxonomies'),
    ]);
    const taxonomies = tax.getServiceTaxonomies();
    // Backend keys counts by the STORED value (cuid id on live data, slug on
    // demo). Resolve to the canonical taxonomy *slug* and AGGREGATE — the live
    // taxonomy has slug collisions (a subcategory and a subdivision both slugged
    // "sxolika-mathimata"), and services are stored against either id. Summing
    // by slug keeps the card count consistent with the archive page, whose
    // filter (taxonomy_value_candidates) also matches every colliding id.
    const canonical = (v: string): string =>
      (tax.findServiceById(v) ?? tax.findServiceBySlug(v))?.slug ?? v;

    // Index backend counts (keyed by canonical slug) so we can decorate the tree
    // and hide empty nodes.
    //  - subdivisionCounts: subdivision slug -> # services
    //  - subcategoryCounts: subcategory slug -> # services
    //  - categoryTotals:    category slug    -> # services (sum of its subcats)
    const subdivisionCounts = new Map<string, number>();
    const subcategoryCounts = new Map<string, number>();
    const categoryTotals = new Map<string, number>();
    const bump = (m: Map<string, number>, k: string, n: number) =>
      m.set(k, (m.get(k) ?? 0) + n);
    if (Array.isArray(raw.subdivisions)) {
      for (const s of raw.subdivisions as Array<Record<string, unknown>>) {
        if (typeof s.slug === 'string' && typeof s.count === 'number') {
          bump(subdivisionCounts, canonical(s.slug), s.count);
        }
      }
    }
    // Backend `categories` is `[{ slug: category, subcategories: [{slug,count}] }]`
    // — the counts live on the nested subcategories, not the category object.
    if (Array.isArray(raw.categories)) {
      for (const c of raw.categories as Array<Record<string, any>>) {
        let total = 0;
        for (const sub of (Array.isArray(c.subcategories) ? c.subcategories : []) as Array<Record<string, any>>) {
          if (typeof sub.slug === 'string' && typeof sub.count === 'number') {
            bump(subcategoryCounts, canonical(sub.slug), sub.count);
            total += sub.count;
          }
        }
        if (typeof c.slug === 'string') bump(categoryTotals, canonical(c.slug), total);
      }
    }

    // Build the tree from the frontend taxonomy.
    const filterCategorySlug = options?.categorySlug;
    const categories: CategoryWithSubcategories[] = [];

    for (const cat of taxonomies as Array<Record<string, any>>) {
      if (filterCategorySlug && cat.slug !== filterCategorySlug) continue;

      const subs = Array.isArray(cat.children) ? cat.children : [];

      if (filterCategorySlug) {
        // Drill down one level: each SUBCATEGORY becomes its own card and
        // its subdivisions show as the "subcategories" inside it. Matches the
        // production layout on /categories/<cat>.
        for (const sub of subs as Array<Record<string, any>>) {
          // Skip subcategories with no services — their card would link to a
          // "Δεν βρέθηκαν υπηρεσίες" page.
          const subCount = subcategoryCounts.get(sub.slug) ?? 0;
          if (subCount <= 0) continue;
          const divs = Array.isArray(sub.children) ? sub.children : [];
          categories.push({
            id: sub.id,
            slug: sub.slug,
            label: sub.label,
            description: sub.description,
            icon: sub.icon ?? cat.icon,
            image: sub.image ?? cat.image,
            href: subcategoryHref(cat.slug, sub.slug),
            count: subCount,
            // Only list subdivisions that have services — an empty one links to
            // a "no results" page.
            subcategories: divs
              .filter((d: Record<string, any>) => (subdivisionCounts.get(d.slug) ?? 0) > 0)
              .map((d: Record<string, any>) => ({
                id: d.id,
                slug: d.slug,
                label: d.label,
                href: subdivisionHref(cat.slug, sub.slug, d.slug),
              })),
          });
        }
      } else {
        // Top-level view: one card per category, with its (non-empty)
        // subcategories listed. Skip categories that have no services at all.
        const catTotal = categoryTotals.get(cat.slug) ?? 0;
        if (catTotal <= 0) continue;
        categories.push({
          id: cat.id,
          slug: cat.slug,
          label: cat.label,
          description: cat.description,
          icon: cat.icon,
          image: cat.image,
          href: categoryHref(cat.slug),
          count: catTotal,
          subcategories: subs
            .filter((s: Record<string, any>) => (subcategoryCounts.get(s.slug) ?? 0) > 0)
            .map((s: Record<string, any>) => ({
              id: s.id,
              slug: s.slug,
              label: s.label,
              href: subcategoryHref(cat.slug, s.slug),
            })),
        });
      }

    }

    // "Πιο δημοφιλείς εργασίες" carousel = subdivisions that contain FEATURED
    // services (admin-curated, or promoted by a subscriber starring their own
    // service) — built from the backend's popularSubdivisions list, NOT a raw
    // service-count ranking. The stored cuid ids are resolved to canonical
    // labels/slugs/hrefs via the taxonomy tree.
    const popular: SubdivisionItem[] = [];
    const seenDiv = new Set<string>();
    const rawPopular = Array.isArray(raw.popularSubdivisions)
      ? (raw.popularSubdivisions as Array<Record<string, any>>)
      : [];
    for (const s of rawPopular) {
      const div = tax.findServiceById(s.slug) ?? tax.findServiceBySlug(s.slug);
      const sub =
        tax.findServiceById(s.subcategorySlug) ?? tax.findServiceBySlug(s.subcategorySlug);
      const cat = tax.findServiceById(s.categorySlug) ?? tax.findServiceBySlug(s.categorySlug);
      if (!div || !sub || !cat || seenDiv.has(div.id)) continue;
      seenDiv.add(div.id);
      const d = div as Record<string, any>;
      popular.push({
        id: div.id,
        slug: div.slug,
        label: div.label,
        description: d.description,
        image: d.image,
        href: subdivisionHref(cat.slug, sub.slug, div.slug),
        count: typeof s.count === 'number' ? s.count : undefined,
        categorySlug: cat.slug,
        subcategorySlug: sub.slug,
      });
    }

    return { success: true, data: { categories, subdivisions: popular } };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

/** Thin taxonomy node as the navigation-menu endpoint ships it. */
interface NavMenuRawSubdivision {
  slug: string;
  count: number;
}
interface NavMenuRawSubcategory {
  slug: string;
  count: number;
  subdivisions?: NavMenuRawSubdivision[];
}
interface NavMenuRawCategory {
  slug: string;
  count: number;
  subcategories?: NavMenuRawSubcategory[];
}

export async function getNavigationMenuData(): Promise<ActionResult<NavigationMenuCategory[]>> {
  try {
    const raw = (await servicesApi.getNavigationMenu()) as NavMenuRawCategory[];
    const { findServiceBySlug, findServiceById } = await import('@/lib/taxonomies');

    // The backend groups by the *stored* category/subcategory/subdivision value,
    // which is a slug in some datasets but a cuid id in the live/restored data.
    // Resolve by slug first, then by id, so labels + slug-based hrefs are
    // populated either way (otherwise the menu shows raw ids like "qWYlwq").
    const resolve = (value: string) => findServiceBySlug(value) ?? findServiceById(value);

    // Backend returns thin {slug, count, subcategories: [{slug, count, subdivisions: [{slug, count}]}]}.
    // The header NavMenu reads .id, .label, .icon, .href, plus nested
    // subcategories/subdivisions with the same shape.
    const enriched: NavigationMenuCategory[] = raw.map((cat) => {
      const fullCat = resolve(cat.slug);
      const catSlug = fullCat?.slug ?? cat.slug;
      const subcategories: NavigationMenuSubcategory[] = (cat.subcategories ?? []).map(
        (sub) => {
          const fullSub = resolve(sub.slug);
          const subSlug = fullSub?.slug ?? sub.slug;
          const subdivisions: NavigationMenuSubdivision[] = (sub.subdivisions ?? []).map(
            (div) => {
              const fullDiv = resolve(div.slug);
              const divSlug = fullDiv?.slug ?? div.slug;
              return {
                id: fullDiv?.id ?? div.slug,
                label: fullDiv?.label ?? div.slug,
                slug: divSlug,
                count: div.count,
                href: subdivisionHref(catSlug, subSlug, divSlug),
              };
            },
          );
          // OLD get-categories.ts:370-482 — subdivisions ranked by count desc
          // before the top-3 slice.
          subdivisions.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
          return {
            id: fullSub?.id ?? sub.slug,
            label: fullSub?.label ?? sub.slug,
            slug: subSlug,
            count: sub.count,
            href: subcategoryHref(catSlug, subSlug),
            // Header mega-menu reads `topSubdivisions` (it shows the first
            // N subdivisions under each subcategory in the dropdown).
            topSubdivisions: subdivisions.slice(0, 3),
            totalSubdivisions: subdivisions.length,
            hasMoreSubdivisions: subdivisions.length > 3,
          };
        },
      );
      // OLD sorted subcategories by count desc (top-6 shown by the menu).
      subcategories.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
      return {
        id: fullCat?.id ?? cat.slug,
        label: fullCat?.label ?? cat.slug,
        slug: catSlug,
        icon: typeof fullCat?.icon === 'string' ? fullCat.icon : undefined,
        href: `/categories/${catSlug}`,
        subcategories,
        totalSubcategories: subcategories.length,
        hasMoreSubcategories: subcategories.length > 6,
      };
    });
    return { success: true, data: enriched };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
