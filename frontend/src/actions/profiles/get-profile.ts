'use server';

import * as profilesApi from '@/lib/api/profiles';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type { Profile } from '@/lib/prisma-types';
import type { DatasetItem } from '@/lib/types/datasets';
import type { ServiceCardData } from '@/lib/types/components';
import type { ReviewWithAuthor, ReviewStats } from '@/lib/types/reviews';

/** A resolved taxonomy/dataset entry with a guaranteed label. */
export interface ProfileResolved {
  id: string;
  label: string;
  slug: string;
}

/**
 * The profile summary embedded in the bundle (Django
 * `serialize_profile_summary`). It is the full `Profile` row plus the optional
 * linked-user email the contact card falls back to.
 */
export type ProfileSummary = Profile & {
  user?: { email?: string | null } | null;
};

/**
 * The profile-page bundle returned by `getProfilePageData` — the Django
 * `profile_page_bundle` payload (apps/profiles/selectors/profile_aggregations
 * .profile_page_bundle) with the frontend taxonomy/dataset enrichment applied
 * on top (category/subcategory labels, skills, contact/payment/settlement/
 * budget/size lookups).
 */
export interface ProfilePageData {
  profile: ProfileSummary;
  category: DatasetItem | null;
  subcategory: DatasetItem | null;
  skillsData: DatasetItem[];
  specialityData: ProfileResolved | null;
  contactMethodsData: ProfileResolved[];
  paymentMethodsData: ProfileResolved[];
  settlementMethodsData: ProfileResolved[];
  budgetData: ProfileResolved | null;
  sizeData: ProfileResolved | null;
  featuredCategories: DatasetItem[];
  coverage: AppJson.Coverage | null;
  visibility: AppJson.VisibilitySettings | null;
  socials: AppJson.SocialMedia | null;
  calculatedExperience: number;
  services: ServiceCardData[];
  servicesCount: number;
  serviceSubdivisionsData: DatasetItem[];
  breadcrumbSegments: Array<{ label: string; href: string | null }>;
  breadcrumbButtons: {
    subjectTitle: string;
    id: string;
    saveType: string;
    ownerId: string;
  };
  reviews: { reviews: ReviewWithAuthor[]; total: number };
  reviewStats: ReviewStats;
}

/**
 * Profile readers — Django-backed.
 * Caching is now handled server-side by Django (cache.set in selectors), so
 * Next.js no longer wraps these in `unstable_cache`.
 */

export async function getProfileByUserId(_userId?: string) {
  // userId arg ignored — Django determines the user from the JWT.
  try {
    const data = (await profilesApi.getMyProfile()) as Record<string, unknown> | null;
    return { success: true as const, data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: true as const, data: null };
    }
    return { success: false as const, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getPublicProfileByUsername(username: string): Promise<ActionResult<unknown>> {
  try {
    const data = await profilesApi.getProfileByUsername(username);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: true, data: null };
    }
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

/**
 * The bundle as it arrives from Django, before frontend enrichment. Taxonomy
 * keys are raw `{ slug }` stubs / slug-id lists; the labelled dataset
 * companions are added below.
 */
interface RawProfilePageBundle {
  profile: ProfileSummary;
  category: { slug?: string } | null;
  subcategory: { slug?: string } | null;
  skillsData: Array<{ slug?: string; id?: string }>;
  specialityData: ProfileResolved | null;
  coverage: AppJson.Coverage | null;
  visibility: AppJson.VisibilitySettings | null;
  socials: AppJson.SocialMedia | null;
  calculatedExperience: number;
  // Backend ships raw category/subcategory/subdivision ids on each card.
  services: Array<ServiceCardData & { subcategory?: string | null; subdivision?: string | null }>;
  servicesCount: number;
  serviceSubdivisionsData: Array<{ slug?: string; id?: string }>;
  breadcrumbSegments: Array<{ label: string; href: string | null }>;
  breadcrumbButtons: {
    subjectTitle: string;
    id: string;
    saveType: string;
    ownerId: string;
  };
  reviews: { reviews: ReviewWithAuthor[]; total: number };
  reviewStats: ReviewStats;
  featuredCategories?: DatasetItem[];
}

export async function getProfilePageData(username: string): Promise<ActionResult<ProfilePageData | null>> {
  try {
    const raw = (await profilesApi.getProfilePageData(username)) as RawProfilePageBundle | null;
    if (!raw) return { success: true, data: null };

    // Enrich the slim payload Django returns with frontend-side taxonomy
    // labels + dataset lookups the page expects (the backend doesn't ship
    // the taxonomy tree).
    const {
      findServiceBySlug, findServiceById,
      findProBySlug, findProById,
      findSkillById, findSkillBySlug,
      findTagById, getLocations,
    } = await import('@/lib/taxonomies');
    const { transformCoverageWithLocationNames } = await import('@/lib/utils/datasets');
    const options = await import('@/constants/datasets/options');
    const contactMethodsDataset = options.contactMethodsOptions;
    const paymentMethodsDataset = options.paymentMethodsOptions;
    const settlementMethodsDataset = options.settlementMethodsOptions;
    const budgetsDataset = options.budgetOptions;
    const companySizesDataset = options.sizeOptions;

    type Resolved = ProfileResolved;

    const enrichOne = (
      stub: { slug?: string } | null | undefined,
      lookup: (s: string) => Resolved | null,
    ): Resolved | null => {
      if (!stub?.slug) return null;
      const full = lookup(stub.slug);
      return full ? { ...full } : { id: stub.slug, slug: stub.slug, label: stub.slug };
    };

    const enrichSlugList = (
      list: Array<{ slug?: string; id?: string }> | undefined,
      lookup: (s: string) => Resolved | null,
    ): Resolved[] =>
      (list ?? [])
        .map((leaf) => {
          const slug = leaf?.slug || leaf?.id;
          if (!slug) return null;
          const full = lookup(slug);
          return full ?? { id: slug, slug, label: slug };
        })
        .filter((x): x is Resolved => x != null);

    const lookupByValue = (
      dataset: Array<{ id: string; label: string; slug: string }> | undefined,
      values: string[] | undefined,
    ): Resolved[] =>
      (values ?? [])
        // Live data stores these as numeric ids ('6','2','4'); demo data as
        // slugs. Match either so contact/payment/settlement methods resolve.
        .map((v) => (dataset ?? []).find((d) => d.slug === v || d.id === v))
        .filter((d): d is { id: string; label: string; slug: string } => d != null);

    // Resolve a service taxonomy node to its label (by slug or id). Used to fill
    // the service cards' taxonomyLabels — the backend ships raw ids + null
    // labels for the profile's service list, so cards showed "YtDWfH".
    const svcLabel = (k: string | null | undefined): string | null => {
      if (!k) return null;
      const r = (findServiceBySlug(k) ?? findServiceById(k)) as Resolved | null;
      return r?.label ?? null;
    };

    const profile = raw.profile;
    const enriched: ProfilePageData = {
      ...raw,
      profile,
      // The profile's service cards: resolve category/subcategory/subdivision
      // labels so the cards show "Διατροφή - Συμβουλευτική Διατροφής" not "YtDWfH".
      services: (raw.services ?? []).map((s) => ({
        ...s,
        taxonomyLabels: {
          category: svcLabel(s.category) ?? '',
          subcategory: svcLabel(s.subcategory) ?? '',
          subdivision: svcLabel(s.subdivision) ?? '',
        },
      })),
      // Category/subcategory — resolve by slug OR id, across the service and
      // pro taxonomies (the restored dump stores cuid ids, not slugs, so a
      // slug-only lookup leaks the raw id like "YQqkAO").
      category: enrichOne(raw.category, (s) =>
        (findServiceBySlug(s) as Resolved | null) ?? (findServiceById(s) as Resolved | null) ??
        (findProBySlug(s) as Resolved | null) ?? (findProById(s) as Resolved | null),
      ),
      subcategory: enrichOne(raw.subcategory, (s) =>
        (findServiceBySlug(s) as Resolved | null) ?? (findServiceById(s) as Resolved | null) ??
        (findProBySlug(s) as Resolved | null) ?? (findProById(s) as Resolved | null),
      ),
      // Speciality — the backend ships the raw id as the label, so always
      // re-resolve from profile.speciality. It is a skill id in the live data
      // (251 → "Προσωπική Προπόνηση"); fall back to pro/tag for other datasets.
      specialityData: profile.speciality
        ? ((findSkillById(profile.speciality) as Resolved | null) ??
          (findSkillBySlug(profile.speciality) as Resolved | null) ??
          (findProById(profile.speciality) as Resolved | null) ??
          (findProBySlug(profile.speciality) as Resolved | null) ??
          (findTagById(profile.speciality) as Resolved | null))
        : null,
      // Skills — resolve via skill taxonomy by slug or id.
      skillsData: enrichSlugList(raw.skillsData, (s) =>
        (findSkillBySlug(s) as Resolved | null) ?? (findSkillById(s) as Resolved | null),
      ),
      // Service subdivisions the pro covers — resolve by slug or id.
      serviceSubdivisionsData: enrichSlugList(
        raw.serviceSubdivisionsData,
        (s) => (findServiceBySlug(s) as Resolved | null) ?? (findServiceById(s) as Resolved | null),
      ),
      // Coverage — backend ships county/area *ids*; resolve to Greek names so
      // the coverage display reads "Λάρισας (Λάρισα)" instead of "4 (491)".
      coverage: transformCoverageWithLocationNames(raw.coverage, getLocations()),
      // Breadcrumb — backend labels the category/subcategory segments with raw
      // taxonomy ids; resolve each segment's label AND every id in its href path
      // (a child href carries its parent ids too) to slugs.
      breadcrumbSegments: (() => {
        const resolveTaxon = (k: string) =>
          (findServiceBySlug(k) ?? findServiceById(k) ?? findProBySlug(k) ?? findProById(k)) as
            (Resolved & { plural?: string }) | null;
        const resolveHref = (href: string | null) =>
          href == null ? href : href.split('/').map((part) => resolveTaxon(part)?.slug ?? part).join('/');
        return (raw.breadcrumbSegments ?? []).map((seg) => {
          const r = resolveTaxon(seg.label);
          return { label: r ? r.plural ?? r.label : seg.label, href: resolveHref(seg.href) };
        });
      })(),
      // Contact/payment/settlement/budget/size lookups from local datasets.
      contactMethodsData: lookupByValue(contactMethodsDataset, profile.contactMethods),
      paymentMethodsData: lookupByValue(paymentMethodsDataset, profile.paymentMethods),
      settlementMethodsData: lookupByValue(settlementMethodsDataset, profile.settlementMethods),
      budgetData: budgetsDataset.find((b) => b.slug === profile.budget || b.id === profile.budget) ?? null,
      sizeData: companySizesDataset.find((s) => s.slug === profile.size || s.id === profile.size) ?? null,
      // Featured-categories list isn't part of this bundle — pages tolerate it
      // being undefined, but provide an empty array for safety.
      featuredCategories: raw.featuredCategories ?? [],
    };
    return { success: true, data: enriched };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: true, data: null };
    }
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
