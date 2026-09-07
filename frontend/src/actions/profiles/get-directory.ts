'use server';
import type { DatasetItem } from '@/lib/types/datasets';

import * as profilesApi from '@/lib/api/profiles';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type {
  CategoryWithSubcategories,
  SubdivisionItem,
} from '@/actions/services/get-categories';

/** Directory landing payload (Django `directory_data`). */
export interface DirectoryPageData {
  popularSubcategories: SubdivisionItem[];
  categories: CategoryWithSubcategories[];
}

export async function getDirectoryPageData(options?: {
  limit?: number;
  categorySlug?: string;
  subcategorySlug?: string;
}): Promise<ActionResult<DirectoryPageData>> {
  try {
    const data = (await profilesApi.getDirectoryData(options ?? {})) as DirectoryPageData;
    // The backend ships raw taxonomy ids (label === slug === cuid). Resolve to
    // pro-taxonomy labels + slug-based hrefs so the directory grid/carousel
    // shows names like "Ευεξία & Φροντίδα", not "YQqkAO".
    const { findProBySlug, findProById, findServiceBySlug, findServiceById, getProTaxonomies } =
      await import('@/lib/taxonomies');
    const resolve = (k: string | null | undefined) =>
      (findProBySlug(k) ?? findProById(k) ?? findServiceBySlug(k) ?? findServiceById(k)) as
        { id: string; label: string; slug: string } | null;

    const categories: CategoryWithSubcategories[] = (data.categories ?? []).map((cat) => {
      const rc = resolve(cat.slug);
      const catSlug = rc?.slug ?? cat.slug;
      return {
        ...cat,
        id: rc?.id ?? cat.id,
        label: rc?.label ?? cat.label,
        slug: catSlug,
        href: `/dir/${catSlug}`,
        // categories-grid renders icon/image/description — restore them from the
        // resolved pro-taxonomy node (backend ships them as null).
        icon: (rc as DatasetItem | null)?.icon ?? cat.icon,
        image: (rc as DatasetItem | null)?.image ?? cat.image,
        description: (rc as DatasetItem | null)?.description ?? cat.description,
        type: (rc as DatasetItem | null)?.type ?? (cat as DatasetItem).type,
        subcategories: (cat.subcategories ?? []).map((sub) => {
          const rs = resolve(sub.slug);
          const subSlug = rs?.slug ?? sub.slug;
          return {
            ...sub,
            id: rs?.id ?? sub.id,
            // OLD get-directory.ts:166 used the PLURAL form for directory
            // subcategory labels ("Κηπουροί", not "Κηπουρός").
            label: (rs as (DatasetItem & { plural?: string }) | null)?.plural ?? rs?.label ?? sub.label,
            slug: subSlug,
            href: `/dir/${catSlug}/${subSlug}`,
          };
        })
          // OLD get-directory.ts:180-181 — subcategories by profile count
          // desc, top 10 per category card.
          .sort((a, b) => ((b as { count?: number }).count ?? 0) - ((a as { count?: number }).count ?? 0))
          .slice(0, 10),
      };
    });
    // OLD get-directory.ts:156 mapped getProTaxonomies() in order, so the
    // category cards follow the canonical pro-taxonomy order. The backend's
    // grouping loses it; restore it (unknown slugs sink to the end).
    const orderIndex = new Map(getProTaxonomies().map((c, i) => [c.slug, i]));
    categories.sort(
      (a, b) =>
        (orderIndex.get(a.slug) ?? Number.MAX_SAFE_INTEGER) -
        (orderIndex.get(b.slug) ?? Number.MAX_SAFE_INTEGER),
    );

    const popularSubcategories: SubdivisionItem[] = (data.popularSubcategories ?? []).map((sub) => {
      const rs = resolve(sub.subcategorySlug || sub.slug);
      const rc = resolve(sub.categorySlug);
      const subSlug = rs?.slug ?? sub.slug;
      const catSlug = rc?.slug ?? sub.categorySlug;
      return {
        ...sub,
        id: rs?.id ?? sub.id,
        slug: subSlug,
        image: (rs as DatasetItem | null)?.image ?? sub.image,
        description: (rs as DatasetItem | null)?.description ?? sub.description,
        categorySlug: catSlug,
        subcategorySlug: subSlug,
        // OLD get-directory.ts:135 — plural label in the popular carousel too.
        label: (rs as (DatasetItem & { plural?: string }) | null)?.plural ?? rs?.label ?? sub.label,
        href: `/dir/${catSlug}/${subSlug}`,
      };
    });
    // OLD get-directory.ts:152 — popular subcategories ranked by count desc.
    popularSubcategories.sort(
      (a, b) => ((b as { count?: number }).count ?? 0) - ((a as { count?: number }).count ?? 0),
    );

    return { success: true, data: { categories, popularSubcategories } };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
