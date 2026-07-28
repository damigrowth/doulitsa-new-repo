/**
 * Card-shape enrichers.
 *
 * The Django backend returns raw slug/ID arrays for taxonomy fields. The
 * existing card components (profile-card, service-card, ProfileMeta, etc.)
 * expect resolved `*Data` companions ({ id, slug, label, plural? }). The
 * lookups live in the frontend taxonomy dataset, so we do the translation
 * here on the server-side action layer — same place we enriched the home
 * page categories.
 *
 * Each helper is shaped to be safe with the partial real data the dump
 * carries: unknown IDs/slugs are dropped, never rendered as cuids.
 */
import {
  findProById,
  findProBySlug,
  findSkillById,
  findSkillBySlug,
  findTagById,
  findTagBySlug,
  getLocations,
} from '@/lib/taxonomies';
import { transformCoverageWithLocationNames } from '@/lib/utils/datasets';

type Resolved = { id: string; label: string; slug: string; plural?: string };

/**
 * Resolve a raw coverage object's county/area *ids* to Greek names and build
 * the `countyAreasMap` the coverage-display popover renders. Without this the
 * cards show ids like "4 (491)" instead of "Λάρισας (Λάρισα)".
 */
export function enrichCoverage(rawCoverage: unknown) {
  return transformCoverageWithLocationNames(rawCoverage, getLocations());
}

const resolvePro = (key: string | null | undefined): Resolved | null =>
  (findProById(key) as Resolved | null) ?? (findProBySlug(key) as Resolved | null);

const resolveSkill = (key: string | null | undefined): Resolved | null =>
  (findSkillById(key) as Resolved | null) ?? (findSkillBySlug(key) as Resolved | null);

const resolveTag = (key: string | null | undefined): Resolved | null =>
  (findTagById(key) as Resolved | null) ?? (findTagBySlug(key) as Resolved | null);

/** Wrap a single value's lookup so unknown values map to null. */
const enrichOne = (
  value: unknown,
  lookup: (k: string | null | undefined) => Resolved | null,
): Resolved | null => {
  if (value == null || value === '') return null;
  return lookup(String(value));
};

/** Wrap an array's lookup, dropping unknown items. */
const enrichMany = (
  values: unknown,
  lookup: (k: string | null | undefined) => Resolved | null,
): Resolved[] => {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => lookup(v == null ? null : String(v)))
    .filter((v): v is Resolved => v != null);
};

/**
 * Enrich a profile row with the `*Data` fields the cards expect:
 *
 *   skillsData       — array, each skill slug/ID resolved to {id,label,slug}
 *   specialityData   — single resolved pro-subdivision (matches profile.speciality)
 *   categoryData     — single resolved pro-category
 *   subcategoryData  — single resolved pro-subcategory
 */
/**
 * speciality is a TAG ID in the production dump (Strapi stored the pro's
 * primary skill as a tag reference, not a pro-taxonomy node). Try the tag
 * map first, then fall back to skills and pro nodes so demo/seeded data
 * (which used pro-slug specialities) keeps working.
 */
const resolveSpeciality = (key: string | null | undefined): Resolved | null =>
  resolveSkill(key) ?? resolvePro(key) ?? resolveTag(key);

export function enrichProfileCard<T extends Record<string, unknown>>(profile: T): T & {
  skillsData: Resolved[];
  specialityData: Resolved | null;
  categoryData: Resolved | null;
  subcategoryData: Resolved | null;
  taxonomyLabels: { category: string; subcategory: string };
  coverage: ReturnType<typeof enrichCoverage>;
  groupedCoverage: Array<{ county: string; areas: string[] }>;
} {
  const coverage = enrichCoverage(profile.coverage);
  const categoryData = enrichOne(profile.category, resolvePro);
  const subcategoryData = enrichOne(profile.subcategory, resolvePro);
  return {
    ...profile,
    skillsData: enrichMany(profile.skills, (k) => resolveSkill(k) ?? resolveTag(k)),
    specialityData: enrichOne(profile.speciality, resolveSpeciality),
    categoryData,
    subcategoryData,
    // The archive/home profile cards render the subcategory chip from
    // `taxonomyLabels.subcategory` (OLD populated this via
    // resolveTaxonomyHierarchy). Without it the chip is silently absent.
    taxonomyLabels: {
      category: categoryData?.label ?? '',
      subcategory: subcategoryData?.label ?? '',
    },
    // County/area ids → Greek names + the grouped map the cards' coverage
    // popover renders.
    coverage,
    groupedCoverage: coverage.countyAreasMap ?? [],
  };
}

/**
 * Enrich a service row with `tagsData`. Tags are stored as Strapi integer IDs
 * in the production dump (`{1259}`, `{1170}`); they need translation to be
 * useful in the UI.
 */
export function enrichServiceCard<T extends Record<string, unknown>>(service: T): T & {
  tagsData: Resolved[];
} {
  return {
    ...service,
    tagsData: enrichMany(service.tags, resolveTag),
  };
}
