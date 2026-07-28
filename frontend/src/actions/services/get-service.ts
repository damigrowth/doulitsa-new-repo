'use server';

import * as servicesApi from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type { Service, Profile } from '@/lib/prisma-types';
import type { DatasetItem } from '@/lib/types/datasets';
import type { ReviewWithAuthor, ReviewStats } from '@/lib/types/reviews';

// ---------------------------------------------------------------------------
// Return-shape types for the service detail page
// ---------------------------------------------------------------------------
// These describe the runtime bundle assembled by `getServicePageData` /
// `getServiceBySlug`: the Django `get_service_page_bundle` payload, with the
// frontend taxonomy enrichment applied on top (see `@/lib/taxonomies/enrich`).

/** A resolved taxonomy/tag entry produced by the frontend enrichers. */
export interface TaxonomyResolved {
  id: string;
  label: string;
  slug: string;
  plural?: string;
}

/** A breadcrumb segment in the service-page bundle. */
export interface BreadcrumbSegment {
  label: string;
  href: string | null;
}

/**
 * The full profile attached to a service on the detail page. Carries every
 * `Profile` field the contact/about sections read, plus the resolved `*Data`
 * companions added by `enrichProfileCard`.
 */
export type ServiceProfileFields = Profile & {
  skillsData?: TaxonomyResolved[];
  specialityData?: TaxonomyResolved | null;
  categoryData?: TaxonomyResolved | null;
  subcategoryData?: TaxonomyResolved | null;
  groupedCoverage?: Array<{ county: string; areas: string[] }>;
};

/**
 * A service row with its full enriched profile, as returned by
 * `getServiceBySlug` and embedded under `bundle.service`.
 */
export type ServiceWithFullProfile = Service & {
  tagsData?: TaxonomyResolved[];
  taxonomyLabels?: {
    category: string;
    subcategory: string;
    subdivision: string;
  };
  profile: ServiceProfileFields;
};

/**
 * The complete bundle returned by `getServicePageData` — the service plus all
 * the surrounding data the detail page renders.
 */
export interface ServicePageData {
  service: ServiceWithFullProfile;
  category: DatasetItem | null;
  subcategory: DatasetItem | null;
  subdivision: DatasetItem | null;
  profileSubcategory: DatasetItem | null;
  coverage: AppJson.Coverage | null;
  breadcrumbSegments: BreadcrumbSegment[];
  breadcrumbButtons: {
    subjectTitle: string;
    id: number;
    saveType: string;
    ownerId: string;
  };
  budget: string | null;
  budgetData?: TaxonomyResolved | null;
  size: string | null;
  sizeData?: TaxonomyResolved | null;
  contactMethods: string[];
  contactMethodsData?: TaxonomyResolved[];
  paymentMethods: string[];
  paymentMethodsData?: TaxonomyResolved[];
  settlementMethods: string[];
  settlementMethodsData?: TaxonomyResolved[];
  tags: string[];
  tagsData?: TaxonomyResolved[];
  featuredCategories?: TaxonomyResolved[];
  relatedServices: ServiceWithFullProfile[];
  additionalServices: ServiceWithFullProfile[];
  serviceReviews: { reviews: ReviewWithAuthor[]; total: number };
  profileOtherReviews: { reviews: ReviewWithAuthor[]; total: number };
  reviewStats: ReviewStats;
}

export async function getServiceBySlug(slug: string): Promise<ActionResult<unknown>> {
  try {
    const data = (await servicesApi.getServiceBySlug(slug)) as Record<string, unknown>;
    if (data && typeof data === 'object') {
      const { enrichServiceCard, enrichProfileCard } = await import('@/lib/taxonomies/enrich');
      const enriched = enrichServiceCard(data);
      if (enriched.profile && typeof enriched.profile === 'object') {
        enriched.profile = enrichProfileCard(enriched.profile as Record<string, unknown>);
      }
      return { success: true, data: enriched };
    }
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: true, data: null };
    }
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

/**
 * The bundle as it arrives from Django, before frontend enrichment: taxonomy
 * keys are raw `{ slug }` stubs and service rows are plain records that the
 * enrichers will decorate with `*Data` companions.
 */
interface RawServicePageBundle
  extends Omit<
    ServicePageData,
    | 'service'
    | 'category'
    | 'subcategory'
    | 'subdivision'
    | 'profileSubcategory'
    | 'relatedServices'
    | 'additionalServices'
  > {
  service: ServiceWithFullProfile;
  /** Backend DB-resolved labels — fallback when the bundled map is stale. */
  taxonomyLabels?: { category?: string; subcategory?: string; subdivision?: string };
  category: { slug: string } | null;
  subcategory: { slug: string } | null;
  subdivision: { slug: string } | null;
  profileSubcategory: { slug: string } | null;
  relatedServices: ServiceWithFullProfile[];
  additionalServices: ServiceWithFullProfile[];
}

export async function getServicePageData(id: number): Promise<ActionResult<ServicePageData | null>> {
  try {
    const bundle = (await servicesApi.getServicePage(id)) as RawServicePageBundle | null;
    if (!bundle) return { success: true, data: null };

    // The backend returns raw taxonomy slugs/ids (the live data stores cuid
    // ids). Resolve the {id,label,slug} taxonomy objects + tag/skill labels on
    // the frontend — OLD `_getServicePageData` resolved these from local
    // datasets too.
    const { findServiceBySlug, findServiceById, findProById, findProBySlug, findTagById, findTagBySlug } =
      await import('@/lib/taxonomies');
    const options = await import('@/constants/datasets/options');
    const lookupByValue = (
      dataset: Array<{ id: string; label: string; slug: string }> | undefined,
      values: string[] | undefined,
    ): TaxonomyResolved[] =>
      (values ?? [])
        .map((v) => (dataset ?? []).find((d) => d.slug === v || d.id === v))
        .filter((d): d is { id: string; label: string; slug: string } => d != null);
    const resolve = (key: unknown, backendLabel?: string | null): DatasetItem | null => {
      const k = (key && typeof key === 'object' && 'slug' in key
        ? (key as { slug?: string }).slug
        : (key as string | undefined)) ?? null;
      if (!k) return null;
      const found =
        (findServiceById(k) as TaxonomyResolved | null) ??
        (findServiceBySlug(k) as TaxonomyResolved | null) ??
        (findProById(k) as TaxonomyResolved | null) ??
        (findProBySlug(k) as TaxonomyResolved | null);
      // When the bundled map is older than the DB (a taxonomy added after the
      // last frontend build), fall back to the backend's DB-resolved label
      // instead of leaking the raw id (e.g. "q5F8Ns") into the UI.
      return found ?? { id: k, slug: k, label: backendLabel || k };
    };

    const { enrichServiceCard, enrichProfileCard, enrichCoverage } =
      await import('@/lib/taxonomies/enrich');
    const enrichService = (svc: ServiceWithFullProfile): ServiceWithFullProfile => {
      const enriched = enrichServiceCard({ ...svc });
      enriched.profile = enrichProfileCard({ ...svc.profile });
      return enriched;
    };

    const data: ServicePageData = {
      ...bundle,
      category: resolve(bundle.category, bundle.taxonomyLabels?.category),
      subcategory: resolve(bundle.subcategory, bundle.taxonomyLabels?.subcategory),
      subdivision: resolve(bundle.subdivision, bundle.taxonomyLabels?.subdivision),
      profileSubcategory: resolve(bundle.profileSubcategory),
      // About-section chips (Χαρακτηριστικά): resolve tag ids → labels and the
      // budget/size/contact/payment/settlement values from local datasets.
      tagsData: (bundle.tags ?? [])
        .map((t) => (findTagById(t) ?? findTagBySlug(t)) as TaxonomyResolved | null)
        .filter((t): t is TaxonomyResolved => t != null),
      // Live data stores budget/size as numeric ids, demo as slugs — match
      // either (mirrors OLD findById, and the profile page's lookup).
      budgetData:
        options.budgetOptions.find((b) => b.slug === bundle.budget || b.id === bundle.budget) ??
        null,
      sizeData:
        options.sizeOptions.find((s) => s.slug === bundle.size || s.id === bundle.size) ?? null,
      contactMethodsData: lookupByValue(options.contactMethodsOptions, bundle.contactMethods),
      paymentMethodsData: lookupByValue(options.paymentMethodsOptions, bundle.paymentMethods),
      settlementMethodsData: lookupByValue(options.settlementMethodsOptions, bundle.settlementMethods),
      // Provider coverage shown on the service page — county/area ids → names.
      coverage: enrichCoverage(bundle.coverage),
      // Breadcrumb — backend labels category/subcategory/subdivision segments
      // with raw taxonomy ids; resolve each segment's label AND every id in its
      // href path (a child href carries its parent ids too) to slugs.
      breadcrumbSegments: (() => {
        const resolveTaxon = (k: string) =>
          (findServiceBySlug(k) ?? findServiceById(k) ?? findProBySlug(k) ?? findProById(k)) as
            (DatasetItem & { plural?: string }) | null;
        const resolveHref = (href: string | null) =>
          href == null ? href : href.split('/').map((part) => resolveTaxon(part)?.slug ?? part).join('/');
        return (bundle.breadcrumbSegments ?? []).map((seg) => {
          const r = resolveTaxon(seg.label);
          return { label: r ? r.plural ?? r.label : seg.label, href: resolveHref(seg.href) };
        });
      })(),
      service: enrichService(bundle.service),
      relatedServices: bundle.relatedServices.map(enrichService),
      additionalServices: bundle.additionalServices.map(enrichService),
    };

    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { success: true, data: null };
    }
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}

export async function getServiceForEdit(serviceId: number): Promise<ActionResult<unknown>> {
  try {
    const data = await servicesApi.getServiceForEdit(serviceId);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
}
