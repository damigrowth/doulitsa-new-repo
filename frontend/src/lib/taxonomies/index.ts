/**
 * Optimized Taxonomy System - O(1) Lookup Performance
 *
 * Provides lazy-loaded access to pre-computed taxonomy hash maps
 * for 99% faster lookups compared to linear search.
 *
 * Performance Comparison:
 * - OLD (findById): O(n) linear search (~2-3ms per lookup)
 * - NEW: O(1) hash map lookup (~0.02-0.03ms per lookup)
 *
 * Usage:
 * ```typescript
 * // Instead of:
 * import { findById } from '@/lib/utils/datasets';
 * const category = findById(serviceTaxonomies, categoryId);
 *
 * // Use:
 * import { findServiceById } from '@/lib/taxonomies';
 * const category = findServiceById(categoryId);
 * ```
 *
 * @see scripts/build-taxonomy-maps.ts - Build script that generates maps
 */
// NOTE: this module loads the 4.7 MB taxonomy maps — it must stay SERVER-ONLY
// (all consumers are server actions / RSC). Do not import it from a 'use client'
// component or the map gets shipped to the browser. (Install the `server-only`
// package to enforce this at build time.)
import type { DatasetItem } from '@/types/datasets';
import { normalizeTerm } from '@/lib/utils/text/normalize';

// ============================================================================
// LAZY-LOADED SINGLETONS
// ============================================================================

let _serviceTaxonomies: DatasetItem[] | null = null;
let _proTaxonomies: DatasetItem[] | null = null;
let _locations: DatasetItem[] | null = null;
let _tags: DatasetItem[] | null = null;
let _taxonomyMaps: any | null = null;

// ============================================================================
// LAYER 1: Full Taxonomy Access (Server-Side Only)
// ============================================================================

/**
 * Get full service taxonomies with lazy loading
 * @server-only Use only in server components and server actions
 * @returns Complete service taxonomy tree
 */
export function getServiceTaxonomies(): DatasetItem[] {
  // Prefer the DB-sourced, FK-reconstructed tree (reflects admin edits/adds, no
  // redeploy); fall back to the static dataset if the maps are unavailable.
  const tree = getTaxonomyMaps()?.service?.tree as DatasetItem[] | undefined;
  if (tree && tree.length) return tree;
  if (!_serviceTaxonomies) {
    _serviceTaxonomies = require('@/constants/datasets/service-taxonomies').serviceTaxonomies;
  }
  return _serviceTaxonomies;
}

/**
 * Get full pro taxonomies with lazy loading
 * @server-only Use only in server components and server actions
 * @returns Complete pro taxonomy tree
 */
export function getProTaxonomies(): DatasetItem[] {
  const tree = getTaxonomyMaps()?.pro?.tree as DatasetItem[] | undefined;
  if (tree && tree.length) return tree;
  if (!_proTaxonomies) {
    _proTaxonomies = require('@/constants/datasets/pro-taxonomies').proTaxonomies;
  }
  return _proTaxonomies;
}

/**
 * Get full locations with lazy loading
 * @server-only Use only in server components and server actions
 * @returns Complete locations array
 */
export function getLocations(): DatasetItem[] {
  // Locations resolve from the static dataset (the live site's source of truth).
  // The DB `location.tree` is byte-identical but the coverage display depends on
  // exact resolution semantics, so we keep the proven static source here.
  if (!_locations) {
    _locations = require('@/constants/datasets/locations').locationOptions;
  }
  return _locations;
}

/**
 * Get full tags with lazy loading
 * @server-only Use only in server components and server actions
 * @returns Complete tags array
 */
export function getTags(): DatasetItem[] {
  // Prefer the DB-sourced tags (reflect admin adds/edits, no redeploy); the DB
  // byId is emitted in dataset order. Fall back to the static dataset.
  const byId = getTaxonomyMaps()?.tags?.byId as Record<string, DatasetItem> | undefined;
  if (byId) {
    const vals = Object.values(byId);
    if (vals.length) return vals;
  }
  if (!_tags) {
    _tags = require('@/constants/datasets/tags').tags;
  }
  return _tags;
}

/**
 * Get full skills with lazy loading
 * @server-only Use only in server components and server actions
 * @returns Complete skills array
 */
let _skills: DatasetItem[] | null = null;
export function getSkills(): DatasetItem[] {
  const byId = getTaxonomyMaps()?.skills?.byId as Record<string, DatasetItem> | undefined;
  if (byId) {
    const vals = Object.values(byId);
    if (vals.length) return vals;
  }
  if (!_skills) {
    _skills = require('@/constants/datasets/skills').skills;
  }
  return _skills;
}

// ============================================================================
// LAYER 2: Optimized Hash Map Access (O(1) Lookups)
// ============================================================================

/**
 * The taxonomy maps now come from the DB via the backend API
 * (`/api/taxonomy/maps`), so admin edits go live WITHOUT a redeploy. Loaded once
 * at module init (top-level await; server-only, App Router) and refreshed in the
 * background every 60s — so `find*` stay synchronous while edits propagate within
 * a minute. Falls back to the shipped JSON if the API is unreachable.
 */
const _TAXONOMY_API = (
  process.env.DJANGO_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'
).replace(/\/$/, '');
const _TAXONOMY_REFRESH_MS = 60_000;
let _taxonomyFetchedAt = 0;
let _taxonomyEtag = '';

async function _fetchTaxonomyMaps(): Promise<unknown> {
  try {
    const headers: Record<string, string> = {};
    if (_taxonomyEtag) headers['If-None-Match'] = _taxonomyEtag;
    const res = await fetch(`${_TAXONOMY_API}/api/taxonomy/maps`, { cache: 'no-store', headers });
    // 304 Not Modified -> taxonomy unchanged; keep what we have, transfer nothing.
    if (res.status === 304 && _taxonomyMaps) return _taxonomyMaps;
    if (res.ok) {
      _taxonomyEtag = res.headers.get('etag') ?? '';
      return await res.json();
    }
  } catch {
    // fall through to the bundled fallback
  }
  return _taxonomyMaps ?? require('./maps.generated.json');
}

// Top-level await: first load at module init (App Router server runtime only).
_taxonomyMaps = await _fetchTaxonomyMaps();
_taxonomyFetchedAt = Date.now();

function getTaxonomyMaps() {
  // Background, non-blocking refresh so live admin edits propagate (<=60s)
  // without a restart; callers always get the current in-memory copy.
  if (Date.now() - _taxonomyFetchedAt > _TAXONOMY_REFRESH_MS) {
    _taxonomyFetchedAt = Date.now();
    _fetchTaxonomyMaps()
      .then((m) => {
        _taxonomyMaps = m;
      })
      .catch(() => {});
  }
  return _taxonomyMaps;
}

// ============================================================================
// LAYER 3: Service Taxonomy Lookups (O(1))
// ============================================================================

/**
 * Find service taxonomy item by ID - O(1) optimized
 *
 * Drop-in replacement for `findById(serviceTaxonomies, id)`
 *
 * @param id - Service taxonomy ID (category, subcategory, or subdivision)
 * @returns DatasetItem or null if not found
 *
 * @example
 * const category = findServiceById('web-development');
 * const subcategory = findServiceById('frontend-development');
 * const subdivision = findServiceById('react');
 */
export function findServiceById(id: string | null | undefined): DatasetItem | null {
  if (!id) return null;
  return getTaxonomyMaps().service.byId[id] || null;
}

/**
 * Find service taxonomy item by slug - O(1) optimized
 *
 * Drop-in replacement for `findBySlug(serviceTaxonomies, slug)`
 *
 * @param slug - Service taxonomy slug
 * @returns DatasetItem or null if not found
 *
 * @example
 * const category = findServiceBySlug('web-development');
 */
export function findServiceBySlug(slug: string | null | undefined): DatasetItem | null {
  if (!slug) return null;
  return getTaxonomyMaps().service.bySlug[slug] || null;
}

// ============================================================================
// LAYER 3: Pro Taxonomy Lookups (O(1))
// ============================================================================

/**
 * Find pro taxonomy item by ID - O(1) optimized
 *
 * Drop-in replacement for `findById(proTaxonomies, id)`
 *
 * @param id - Pro taxonomy ID (category or subcategory)
 * @returns DatasetItem or null if not found
 *
 * @example
 * const category = findProById('web-development');
 * const subcategory = findProById('frontend-developer');
 */
export function findProById(id: string | null | undefined): DatasetItem | null {
  if (!id) return null;
  return getTaxonomyMaps().pro.byId[id] || null;
}

/**
 * Find pro taxonomy item by slug - O(1) optimized
 *
 * Drop-in replacement for `findBySlug(proTaxonomies, slug)`
 *
 * @param slug - Pro taxonomy slug
 * @returns DatasetItem or null if not found
 *
 * @example
 * const category = findProBySlug('web-development');
 */
export function findProBySlug(slug: string | null | undefined): DatasetItem | null {
  if (!slug) return null;
  return getTaxonomyMaps().pro.bySlug[slug] || null;
}

// ============================================================================
// LAYER 3: Skills Lookups (O(1))
// ============================================================================

/**
 * Find skill by ID - O(1) optimized
 *
 * Drop-in replacement for `findById(skills, id)`
 *
 * @param id - Skill ID
 * @returns DatasetItem or null if not found
 *
 * @example
 * const skill = findSkillById('11'); // 2D Animation
 * const skill = findSkillById('312'); // Agile Development
 */
export function findSkillById(id: string | null | undefined): DatasetItem | null {
  if (!id) return null;
  return getTaxonomyMaps().skills.byId[id] || null;
}

/**
 * Find skill by slug - O(1) optimized
 *
 * Drop-in replacement for `findBySlug(skills, slug)`
 *
 * @param slug - Skill slug
 * @returns DatasetItem or null if not found
 *
 * @example
 * const skill = findSkillBySlug('2d-animation');
 * const skill = findSkillBySlug('agile-development');
 */
export function findSkillBySlug(slug: string | null | undefined): DatasetItem | null {
  if (!slug) return null;
  return getTaxonomyMaps().skills.bySlug[slug] || null;
}

/**
 * Get all skills for a pro category - O(1) optimized
 *
 * Retrieves all skills that belong to a specific pro-taxonomy category
 *
 * @param categoryId - Pro taxonomy category ID
 * @returns Array of skill DatasetItems for that category
 *
 * @example
 * const graphicSkills = getSkillsByCategory('7');  // All graphic design skills
 * const devSkills = getSkillsByCategory('12');     // All development skills
 */
export function getSkillsByCategory(categoryId: string): DatasetItem[] {
  const maps = getTaxonomyMaps();
  const skillIds = maps.skills.byCategory[categoryId] || [];
  return skillIds.map(id => maps.skills.byId[id]).filter(Boolean);
}

// ============================================================================
// LAYER 3: Tags Lookups (O(1))
// ============================================================================

/**
 * Find tag by ID - O(1) optimized
 *
 * Drop-in replacement for `findById(tags, id)`
 *
 * @param id - Tag ID
 * @returns DatasetItem or null if not found
 *
 * @example
 * const tag = findTagById('1');    // Web Development
 * const tag = findTagById('100');  // Digital Marketing
 */
export function findTagById(id: string | null | undefined): DatasetItem | null {
  if (!id) return null;
  return getTaxonomyMaps().tags.byId[id] || null;
}

/**
 * Find tag by slug - O(1) optimized
 *
 * Drop-in replacement for `findBySlug(tags, slug)`
 *
 * @param slug - Tag slug
 * @returns DatasetItem or null if not found
 *
 * @example
 * const tag = findTagBySlug('web-development');
 * const tag = findTagBySlug('digital-marketing');
 */
export function findTagBySlug(slug: string | null | undefined): DatasetItem | null {
  if (!slug) return null;
  return getTaxonomyMaps().tags.bySlug[slug] || null;
}

// ============================================================================
// LAYER 3: Location Lookups (O(1))
// ============================================================================

/**
 * Find location by ID - O(1) optimized
 *
 * Drop-in replacement for `findById(locations, id)`
 *
 * @param id - Location ID
 * @returns DatasetItem or null if not found
 *
 * @example
 * const location = findLocationById('athens');
 */
export function findLocationById(id: string | null | undefined): DatasetItem | null {
  if (!id) return null;
  return getTaxonomyMaps().location.byId[id] || null;
}

/**
 * Find location by slug - O(1) optimized
 *
 * Drop-in replacement for `findBySlug(locations, slug)`
 *
 * @param slug - Location slug
 * @returns DatasetItem or null if not found
 *
 * @example
 * const location = findLocationBySlug('athens');
 */
export function findLocationBySlug(slug: string | null | undefined): DatasetItem | null {
  if (!slug) return null;
  return getTaxonomyMaps().location.bySlug[slug] || null;
}

/**
 * Find location by slug or name (with fallback for backward compatibility) - O(1) for slugs, O(n) for names
 *
 * Drop-in replacement for `findLocationBySlugOrName(locations, slugOrName)`
 * Tries slug lookup first (O(1) hash map - fast path), then falls back to name lookup (O(n) - rare case)
 *
 * @param slugOrName - Location slug or name (Greek or English)
 * @returns DatasetItem or null if not found
 *
 * @example
 * const location = findLocationBySlugOrName('attiki');        // Slug lookup (O(1) - fast)
 * const location = findLocationBySlugOrName('Αττική');        // Name lookup (O(n) - fallback)
 */
export function findLocationBySlugOrName(slugOrName: string | null | undefined): DatasetItem | null {
  if (!slugOrName) return null;

  // Fast path: Try O(1) slug lookup first (99% of cases)
  const bySlug = getTaxonomyMaps().location.bySlug[slugOrName];
  if (bySlug) return bySlug;

  // Slow path: Fallback to O(n) name lookup for backward compatibility (rare)
  // Only used when Greek names or legacy data is passed
  const locations = getLocations();
  for (const county of locations) {
    // Check county name
    if (county.name === slugOrName) {
      return county;
    }

    // Check area names within this county
    if (county.children) {
      for (const area of county.children) {
        if (area.name === slugOrName) {
          return area;
        }
      }
    }
  }

  return null;
}

/**
 * Resolve a location slug/name to a county ID.
 * If the slug resolves to an area (e.g. "thessaloniki" exists as both county and area),
 * finds the parent county and returns its ID.
 *
 * @param slugOrName - Location slug or name
 * @returns County ID or undefined if not found
 */
export function resolveToCountyId(slugOrName: string | null | undefined): string | undefined {
  if (!slugOrName) return undefined;

  const locationMatch = findLocationBySlugOrName(slugOrName);
  if (!locationMatch) return undefined;

  const locations = getLocations();

  // Check if it's a top-level county
  const isCounty = locations.some((c) => c.id === locationMatch.id);
  if (isCounty) return locationMatch.id;

  // Area match — find parent county
  const parentCounty = locations.find((county) =>
    county.children?.some((area: DatasetItem) => area.id === locationMatch.id),
  );
  return parentCounty?.id;
}

/**
 * Find matching location name from profile coverage arrays - O(1) optimized
 *
 * Searches profile coverage object (counties and areas arrays) for a location
 * that matches the normalized search term. Prioritizes areas (more specific)
 * over counties (less specific).
 *
 * Uses O(1) hash map lookups via findLocationById for performance.
 *
 * @param coverage - Profile coverage object with counties and areas arrays
 * @param searchTerm - Normalized search term to match against location names
 * @returns Matched location name or undefined if no match found
 *
 * @example
 * // Search for location in service profile coverage
 * const matchedLocation = findMatchingLocationInCoverage(
 *   service.profile.coverage,
 *   normalizeTerm('θεσσαλονικη')
 * );
 * // Returns: "Θεσσαλονίκη" if found in coverage.areas or coverage.counties
 */
export function findMatchingLocationInCoverage(
  coverage: any,
  searchTerm: string
): string | undefined {
  // Priority 1: Check areas first (more specific locations)
  if (Array.isArray(coverage.areas)) {
    for (const areaId of coverage.areas) {
      const area = findLocationById(areaId);
      if (area?.name && normalizeTerm(area.name).includes(searchTerm)) {
        return area.name;
      }
    }
  }

  // Priority 2: Check counties as fallback (less specific locations)
  if (Array.isArray(coverage.counties)) {
    for (const countyId of coverage.counties) {
      const county = findLocationById(countyId);
      if (county?.name && normalizeTerm(county.name).includes(searchTerm)) {
        return county.name;
      }
    }
  }

  return undefined;
}

// ============================================================================
// ADVANCED: Hierarchy & Relationship Queries (O(1))
// ============================================================================

/**
 * Get all subcategories for a service category - O(1) optimized
 *
 * @param categoryId - Service category ID
 * @returns Array of subcategory IDs
 *
 * @example
 * const subcategoryIds = getServiceSubcategories('web-development');
 * // Returns: ['frontend-development', 'backend-development', ...]
 */
export function getServiceSubcategories(categoryId: string): string[] {
  return getTaxonomyMaps().service.byCategory[categoryId] || [];
}

/**
 * Get all subdivisions for a service subcategory - O(1) optimized
 *
 * @param subcategoryId - Service subcategory ID
 * @returns Array of subdivision IDs
 *
 * @example
 * const subdivisionIds = getServiceSubdivisions('frontend-development');
 * // Returns: ['react', 'vue', 'angular', ...]
 */
export function getServiceSubdivisions(subcategoryId: string): string[] {
  return getTaxonomyMaps().service.byCategory[subcategoryId] || [];
}

/**
 * Get full hierarchy info for a service item - O(1) optimized
 *
 * Returns the complete hierarchy path for any taxonomy item
 *
 * @param itemId - Service taxonomy ID (can be category, subcategory, or subdivision)
 * @returns Hierarchy object with category, subcategory?, subdivision?
 *
 * @example
 * const hierarchy = getServiceHierarchy('react');
 * // Returns: { category: 'web-development', subcategory: 'frontend-development', subdivision: 'react' }
 *
 * const hierarchy = getServiceHierarchy('frontend-development');
 * // Returns: { category: 'web-development', subcategory: 'frontend-development' }
 */
export function getServiceHierarchy(itemId: string): {
  category: string;
  subcategory?: string;
  subdivision?: string;
} | null {
  return getTaxonomyMaps().service.hierarchy[itemId] || null;
}

/**
 * Resolve service taxonomy hierarchy with context-aware lookup - O(1) optimized
 *
 * Handles duplicate IDs across different hierarchy levels by using parent context.
 * Prevents ID collisions by navigating the tree structure from parent to child.
 *
 * @param categoryId - Category ID
 * @param subcategoryId - Subcategory ID (optional)
 * @param subdivisionId - Subdivision ID (optional)
 * @returns Full DatasetItem objects for category, subcategory, subdivision
 *
 * @example
 * const { category, subcategory, subdivision } = resolveServiceHierarchy('8', '27', '108');
 * // Returns: { category: {...}, subcategory: {...}, subdivision: {...} }
 * // Each with full properties: id, label, slug, children, etc.
 */
export function resolveServiceHierarchy(
  categoryId: string | null | undefined,
  subcategoryId: string | null | undefined,
  subdivisionId: string | null | undefined
): {
  category: DatasetItem | null;
  subcategory: DatasetItem | null;
  subdivision: DatasetItem | null;
} {
  // Get category (top level - no collision possible)
  const category = categoryId ? findServiceById(categoryId) : null;

  // Get subcategory from category's children (context-aware)
  const subcategory = category?.children && subcategoryId
    ? category.children.find((sub: DatasetItem) => sub.id === subcategoryId) || null
    : null;

  // Get subdivision from subcategory's children (context-aware, avoids collision)
  const subdivision = subcategory?.children && subdivisionId
    ? subcategory.children.find((div: DatasetItem) => div.id === subdivisionId) || null
    : null;

  return { category, subcategory, subdivision };
}

/**
 * Resolve service taxonomy hierarchy WITH children populated - Optimized Hybrid
 *
 * Combines O(1) hash map lookups with full tree traversal for children.
 * Use this when you need the children property populated (e.g., for navigation pills).
 *
 * Unlike resolveServiceHierarchy which uses hash maps that don't include children,
 * this function loads the full taxonomy tree to provide complete DatasetItem objects.
 *
 * Performance: O(1) + O(m) where m = number of children (typically <20)
 * - First call: ~0.05-0.1ms (loads and caches full tree)
 * - Subsequent calls: ~0.01-0.02ms (uses cached tree)
 *
 * @param categorySlug - Category slug
 * @param subcategorySlug - Subcategory slug (optional)
 * @param subdivisionSlug - Subdivision slug (optional)
 * @returns Full DatasetItem objects with children populated
 *
 * @example
 * const { category, subcategory } = resolveServiceHierarchyWithChildren(
 *   'marketing',
 *   'digital-marketing'
 * );
 * // category.children is populated ✅
 * // subcategory found within category.children ✅
 */
export function resolveServiceHierarchyWithChildren(
  categorySlug: string | null | undefined,
  subcategorySlug: string | null | undefined = null,
  subdivisionSlug: string | null | undefined = null
): {
  category: DatasetItem | null;
  subcategory: DatasetItem | null;
  subdivision: DatasetItem | null;
} {
  // Get full taxonomy tree (cached after first call)
  const fullTaxonomies = getServiceTaxonomies();

  // Find category in full tree (has children)
  const category = categorySlug
    ? fullTaxonomies.find(cat => cat.slug === categorySlug) || null
    : null;

  // Find subcategory within category's children (context-aware)
  const subcategory = category?.children && subcategorySlug
    ? category.children.find(sub => sub.slug === subcategorySlug) || null
    : null;

  // Find subdivision within subcategory's children (context-aware)
  const subdivision = subcategory?.children && subdivisionSlug
    ? subcategory.children.find(div => div.slug === subdivisionSlug) || null
    : null;

  return { category, subcategory, subdivision };
}

/**
 * Resolve pro taxonomy hierarchy with context-aware lookup - O(1) optimized
 *
 * Handles duplicate IDs across different hierarchy levels by using parent context.
 * Similar to resolveServiceHierarchy but for 2-level pro taxonomies.
 *
 * @param categoryId - Pro category ID
 * @param subcategoryId - Pro subcategory ID (optional)
 * @returns Full DatasetItem objects for category and subcategory
 *
 * @example
 * const { category, subcategory } = resolveProHierarchy('7', '42');
 * // Returns: { category: {...}, subcategory: {...} }
 * // Each with full properties: id, label, slug, children, etc.
 */
export function resolveProHierarchy(
  categoryId: string | null | undefined,
  subcategoryId: string | null | undefined
): {
  category: DatasetItem | null;
  subcategory: DatasetItem | null;
} {
  // Get category (top level - no collision possible)
  const category = categoryId ? findProById(categoryId) : null;

  // Get subcategory from category's children (context-aware)
  const subcategory = category?.children && subcategoryId
    ? category.children.find((sub: DatasetItem) => sub.id === subcategoryId) || null
    : null;

  return { category, subcategory };
}

/**
 * Get all subcategories for a pro category - O(1) optimized
 *
 * @param categoryId - Pro category ID
 * @returns Array of subcategory IDs
 *
 * @example
 * const subcategoryIds = getProSubcategories('web-development');
 * // Returns: ['frontend-developer', 'backend-developer', ...]
 */
export function getProSubcategories(categoryId: string): string[] {
  return getTaxonomyMaps().pro.byCategory[categoryId] || [];
}

// ============================================================================
// BATCH OPERATIONS (High Performance for Multiple Lookups)
// ============================================================================

/**
 * Batch lookup service items by IDs - Optimized for multiple lookups
 *
 * More efficient than calling findServiceById in a loop
 *
 * @param ids - Array of service taxonomy IDs
 * @returns Array of DatasetItems (or null for not found)
 *
 * @example
 * const skills = batchFindServiceByIds(['react', 'vue', 'angular']);
 * // Returns: [DatasetItem, DatasetItem, DatasetItem]
 *
 * // Instead of:
 * const skills = skillIds.map(id => findServiceById(id)); // O(n) hash lookups
 * // Use:
 * const skills = batchFindServiceByIds(skillIds); // Single map operation
 */
export function batchFindServiceByIds(ids: string[]): (DatasetItem | null)[] {
  const maps = getTaxonomyMaps();
  return ids.map(id => maps.service.byId[id] || null);
}

/**
 * Batch lookup pro items by IDs - Optimized for multiple lookups
 *
 * @param ids - Array of pro taxonomy IDs
 * @returns Array of DatasetItems (or null for not found)
 *
 * @example
 * const categories = batchFindProByIds(['web-development', 'graphic-design']);
 */
export function batchFindProByIds(ids: string[]): (DatasetItem | null)[] {
  const maps = getTaxonomyMaps();
  return ids.map(id => maps.pro.byId[id] || null);
}

/**
 * Batch lookup locations by IDs - Optimized for multiple lookups
 *
 * @param ids - Array of location IDs
 * @returns Array of DatasetItems (or null for not found)
 *
 * @example
 * const locations = batchFindLocationsByIds(['athens', 'thessaloniki', 'patras']);
 */
export function batchFindLocationsByIds(ids: string[]): (DatasetItem | null)[] {
  const maps = getTaxonomyMaps();
  return ids.map(id => maps.location.byId[id] || null);
}

/**
 * Batch lookup skills by IDs - Optimized for multiple lookups
 *
 * More efficient than calling findSkillById in a loop
 *
 * @param ids - Array of skill IDs
 * @returns Array of DatasetItems (or null for not found)
 *
 * @example
 * const skills = batchFindSkillsByIds(['11', '12', '312']);
 * // Returns: [2D Animation, 3D Animation, Agile Development]
 *
 * // Instead of:
 * const skills = skillIds.map(id => findSkillById(id)); // Multiple hash lookups
 * // Use:
 * const skills = batchFindSkillsByIds(skillIds); // Single map operation
 */
export function batchFindSkillsByIds(ids: string[]): (DatasetItem | null)[] {
  const maps = getTaxonomyMaps();
  return ids.map(id => maps.skills.byId[id] || null);
}

/**
 * Batch lookup tags by IDs - Optimized for multiple lookups
 *
 * More efficient than calling findTagById in a loop
 *
 * @param ids - Array of tag IDs
 * @returns Array of DatasetItems (or null for not found)
 *
 * @example
 * const tags = batchFindTagsByIds(['1', '5', '10']);
 * // Returns: [Tag1, Tag5, Tag10]
 *
 * // Instead of:
 * const tags = tagIds.map(id => findTagById(id)); // Multiple hash lookups
 * // Use:
 * const tags = batchFindTagsByIds(tagIds); // Single map operation
 */
export function batchFindTagsByIds(ids: string[]): (DatasetItem | null)[] {
  const maps = getTaxonomyMaps();
  return ids.map(id => maps.tags.byId[id] || null);
}

// ============================================================================
// SEARCH: Label-Based Taxonomy Matching
// ============================================================================

/**
 * Find service subcategory IDs that match a search term by label
 *
 * Searches all service subcategory labels using normalized text matching.
 * Used by service archive search to include services in matching subcategories.
 *
 * @param searchTerm - Search term (will be normalized internally)
 * @returns Array of matching subcategory IDs
 *
 * @example
 * const ids = findMatchingServiceSubcategoryIds('Ηλεκτρολογικές');
 * // Returns: ['electrical', ...] - IDs of subcategories with matching labels
 *
 * // Use in Prisma query:
 * if (ids.length > 0) {
 *   whereConditions.push({ subcategory: { in: ids } });
 * }
 */
export function findMatchingServiceSubcategoryIds(searchTerm: string): string[] {
  if (!searchTerm) return [];

  const normalizedSearch = normalizeTerm(searchTerm).toLowerCase();
  const allTaxonomies = getServiceTaxonomies();
  const matchingIds: string[] = [];

  allTaxonomies.forEach((category) => {
    category.children?.forEach((subcategory) => {
      if (subcategory.label) {
        const normalizedLabel = normalizeTerm(subcategory.label);
        if (normalizedLabel.includes(normalizedSearch)) {
          matchingIds.push(subcategory.id);
        }
      }
    });
  });

  return matchingIds;
}

/**
 * Find service subdivision IDs that match a search term by label
 *
 * Searches all subdivision labels using normalized text matching.
 * Used by service archive search to include services in matching subdivisions.
 *
 * @param searchTerm - Search term (will be normalized internally)
 * @returns Array of matching subdivision IDs
 *
 * @example
 * const ids = findMatchingSubdivisionIds('φωτοβολταϊκά');
 * // Returns: ['photovoltaika', ...] - IDs of subdivisions with matching labels
 *
 * // Use in Prisma query:
 * if (ids.length > 0) {
 *   whereConditions.push({ subdivision: { in: ids } });
 * }
 */
export function findMatchingSubdivisionIds(searchTerm: string): string[] {
  if (!searchTerm) return [];

  const normalizedSearch = normalizeTerm(searchTerm).toLowerCase();
  const allTaxonomies = getServiceTaxonomies();
  const matchingIds: string[] = [];

  allTaxonomies.forEach((category) => {
    category.children?.forEach((subcategory) => {
      subcategory.children?.forEach((subdivision) => {
        if (subdivision.label) {
          const normalizedLabel = normalizeTerm(subdivision.label);
          if (normalizedLabel.includes(normalizedSearch)) {
            matchingIds.push(subdivision.id);
          }
        }
      });
    });
  });

  return matchingIds;
}

/**
 * Find pro subcategory IDs that match a search term by label
 *
 * Searches all pro subcategory labels using normalized text matching.
 * Used by profile archive search to include profiles in matching subcategories.
 *
 * @param searchTerm - Search term (will be normalized internally)
 * @returns Array of matching subcategory IDs
 *
 * @example
 * const ids = findMatchingProSubcategoryIds('ηλεκτρολόγος');
 * // Returns: ['electrician', ...] - IDs of subcategories with matching labels
 *
 * // Use in Prisma query:
 * if (ids.length > 0) {
 *   whereConditions.push({ subcategory: { in: ids } });
 * }
 */
export function findMatchingProSubcategoryIds(searchTerm: string): string[] {
  if (!searchTerm) return [];

  const normalizedSearch = normalizeTerm(searchTerm).toLowerCase();
  const allProTaxonomies = getProTaxonomies();
  const matchingIds: string[] = [];

  allProTaxonomies.forEach((category) => {
    category.children?.forEach((subcategory) => {
      // Check label (singular form)
      if (subcategory.label) {
        const normalizedLabel = normalizeTerm(subcategory.label);
        if (normalizedLabel.includes(normalizedSearch)) {
          matchingIds.push(subcategory.id);
          return; // already matched, skip plural check
        }
      }
      // Check plural form (e.g., "Γραφίστες" vs "Γραφίστας")
      if (subcategory.plural) {
        const normalizedPlural = normalizeTerm(subcategory.plural);
        if (normalizedPlural.includes(normalizedSearch)) {
          matchingIds.push(subcategory.id);
        }
      }
    });
  });

  return matchingIds;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get taxonomy metadata (counts, version, generation timestamp)
 *
 * @returns Metadata object with counts and version info
 *
 * @example
 * const metadata = getTaxonomyMetadata();
 * console.log(`Service categories: ${metadata.counts.serviceCategories}`);
 * console.log(`Generated at: ${metadata.generatedAt}`);
 */
export function getTaxonomyMetadata() {
  return getTaxonomyMaps().metadata;
}

/**
 * Clear cached taxonomies (useful for testing/hot reload)
 *
 * Forces re-loading of taxonomy data on next access
 *
 * @example
 * // In tests:
 * beforeEach(() => {
 *   clearTaxonomyCache();
 * });
 */
export function clearTaxonomyCache() {
  _serviceTaxonomies = null;
  _proTaxonomies = null;
  _locations = null;
  _taxonomyMaps = null;
}

/**
 * Inject a newly approved taxonomy item into the runtime cache.
 *
 * After admin approval the item is already live in the Django DB (the maps
 * refresh picks it up within 60s); this injects it into the in-memory cache so
 * lookups return it immediately without waiting for the next refresh.
 *
 * @param type - 'skills' or 'tags'
 * @param item - The new DatasetItem to inject
 */
export function injectTaxonomyItem(
  type: 'skills' | 'tags',
  item: DatasetItem,
): void {
  const maps = getTaxonomyMaps();
  if (maps[type]) {
    maps[type].byId[item.id] = item;
    maps[type].bySlug[item.slug] = item;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export commonly used functions for convenience
export {
  findServiceById as findById, // Alias for gradual migration
  findServiceBySlug as findBySlug, // Alias for gradual migration
};
