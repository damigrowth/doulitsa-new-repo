// Generic dataset utilities for all data collections
// These are pure utility functions that work with any hierarchical dataset structure

import { DatasetItem } from '../types/datasets';
import { normalizeTerm } from '@/lib/utils/text/normalize';
import type { coverageSchema } from '@/lib/prisma/json-types';
import { z } from 'zod';
// Import the location dataset DIRECTLY (not via @/lib/taxonomies) so this util —
// re-exported through the @/lib/utils barrel into client components — does NOT
// drag the 4.7 MB taxonomy map into the browser bundle.
import { locationOptions } from '@/constants/datasets/locations';

// =============================================================================
// GENERIC DATASET UTILITIES
// =============================================================================

/**
 * Generic interface for dataset items with hierarchical structure
 */

/**
 * Find item by ID in a flat or nested dataset
 */
export function findById<T extends DatasetItem>(
  dataset: T[],
  id: string,
): T | undefined {
  for (const item of dataset) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findById(item.children as T[], id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Find item by field value in a flat or nested dataset
 */
export function findByField<T extends DatasetItem>(
  dataset: T[],
  field: keyof T,
  value: any,
): T | undefined {
  for (const item of dataset) {
    if (item[field] === value) {
      return item;
    }
    if (item.children) {
      const found = findByField(item.children as T[], field, value);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Find location by slug - searches in counties and areas, not zipcodes
 */
export function findLocationBySlug(
  locations: any[],
  slug: string,
): any | undefined {
  for (const county of locations) {
    // Check county slug
    if (county.slug === slug) {
      return county;
    }

    // Check area slugs within this county
    if (county.children) {
      for (const area of county.children) {
        if (area.slug === slug) {
          return area;
        }
      }
    }
  }
  return undefined;
}

/**
 * Find location by name (for backward compatibility)
 */
export function findLocationByName(
  locations: any[],
  name: string,
): any | undefined {
  for (const county of locations) {
    // Check county name
    if (county.name === name) {
      return county;
    }

    // Check area names within this county
    if (county.children) {
      for (const area of county.children) {
        if (area.name === name) {
          return area;
        }
      }
    }
  }
  return undefined;
}

/**
 * Find location by slug or name (with fallback for backward compatibility)
 */
export function findLocationBySlugOrName(
  locations: any[],
  slugOrName: string,
): any | undefined {
  // Try finding by slug first
  const bySlug = findLocationBySlug(locations, slugOrName);
  if (bySlug) return bySlug;

  // Fallback to finding by name
  return findLocationByName(locations, slugOrName);
}

/**
 * Find item by slug in a flat or nested dataset
 */
export function findBySlug<T extends DatasetItem>(
  dataset: T[],
  slug: string,
): T | undefined {
  return findByField(dataset, 'slug', slug);
}

/**
 * Find item by name in a flat or nested dataset
 */
export function findByName<T extends DatasetItem>(
  dataset: T[],
  name: string,
): T | undefined {
  return findByField(dataset, 'name', name);
}

/**
 * Find item by label in a flat or nested dataset
 */
export function findByLabel<T extends DatasetItem>(
  dataset: T[],
  label: string,
): T | undefined {
  return findByField(dataset, 'label', label);
}

/**
 * Get children of an item by ID
 */
export function getChildrenById<T extends DatasetItem>(
  dataset: T[],
  id: string,
): T[] {
  const item = findById(dataset, id);
  return (item?.children as T[]) || [];
}

/**
 * Get children of an item by slug
 */
export function getChildrenBySlug<T extends DatasetItem>(
  dataset: T[],
  slug: string,
): T[] {
  const item = findBySlug(dataset, slug);
  return (item?.children as T[]) || [];
}

/**
 * Get the display label for a category/subcategory by slug
 * Useful for forms and display components
 */
export function getLabelBySlug<T extends DatasetItem>(
  dataset: T[],
  slug: string,
): string | undefined {
  const item = findBySlug(dataset, slug);
  return item?.label;
}

/**
 * Filter dataset by field value
 */
export function filterByField<T extends DatasetItem>(
  dataset: T[],
  field: keyof T | string,
  value: any,
): T[] {
  return dataset.filter((item) => (item as any)[field] === value);
}

/**
 * Filter hierarchical taxonomy by type (recursively filters children)
 * Used for filtering pro taxonomies by freelancer/company type
 */
export function filterTaxonomyByType<T extends DatasetItem & { type?: string }>(
  taxonomies: T[],
  targetType: string,
): T[] {
  return taxonomies.map(category => {
    if (!category.children) {
      return category;
    }

    // Filter subcategories to only include those matching the target type
    const filteredChildren = category.children.filter((subcategory: any) => {
      // If subcategory doesn't have a type field, include it for both types
      return !subcategory.type || subcategory.type === targetType;
    });

    return {
      ...category,
      children: filteredChildren
    } as T;
  }).filter(category => {
    // Only include categories that have at least one matching subcategory
    return !category.children || category.children.length > 0;
  });
}

/**
 * Create a flat map from hierarchical dataset for efficient lookups
 */
export function createFlatMap<T extends DatasetItem>(
  dataset: T[],
): Record<string, T> {
  const map: Record<string, T> = {};

  function addToMap(items: T[]) {
    items.forEach((item) => {
      map[item.id] = item;
      if (item.children) {
        addToMap(item.children as T[]);
      }
    });
  }

  addToMap(dataset);
  return map;
}

/**
 * Get all leaf items (items without children) from a hierarchical dataset
 */
export function getLeafItems<T extends DatasetItem>(dataset: T[]): T[] {
  const leafItems: T[] = [];

  function collectLeafs(items: T[]) {
    items.forEach((item) => {
      if (!item.children || item.children.length === 0) {
        leafItems.push(item);
      } else {
        collectLeafs(item.children as T[]);
      }
    });
  }

  collectLeafs(dataset);
  return leafItems;
}

/**
 * Get path to an item (breadcrumb trail)
 */
export function getItemPath<T extends DatasetItem>(
  dataset: T[],
  targetId: string,
): T[] {
  function findPath(items: T[], path: T[] = []): T[] | null {
    for (const item of items) {
      const currentPath = [...path, item];

      if (item.id === targetId) {
        return currentPath;
      }

      if (item.children) {
        const found = findPath(item.children as T[], currentPath);
        if (found) return found;
      }
    }
    return null;
  }

  return findPath(dataset) || [];
}

// =============================================================================
// SEARCH AND FILTERING UTILITIES
// =============================================================================

/**
 * Search datasets by term (searches name, label, slug)
 */
export function searchDataset<T extends DatasetItem>(
  dataset: T[],
  searchTerm: string,
  fields: (keyof T)[] = ['name', 'label', 'slug'],
): T[] {
  const term = searchTerm.toLowerCase();
  const results: T[] = [];

  function searchItems(items: T[]) {
    items.forEach((item) => {
      const matches = fields.some((field) => {
        const value = item[field];
        return typeof value === 'string' && value.toLowerCase().includes(term);
      });

      if (matches) {
        results.push(item);
      }

      if (item.children) {
        searchItems(item.children as T[]);
      }
    });
  }

  searchItems(dataset);
  return results;
}

/**
 * Sort dataset by field
 */
export function sortDataset<T extends DatasetItem>(
  dataset: T[],
  field: keyof T,
  order: 'asc' | 'desc' = 'asc',
): T[] {
  return [...dataset].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return order === 'asc' ? comparison : -comparison;
    }

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate that an ID exists in a dataset
 */
export function validateId<T extends DatasetItem>(
  dataset: T[],
  id: string,
): boolean {
  return findById(dataset, id) !== undefined;
}

/**
 * Validate hierarchical relationship (parent-child)
 */
export function validateHierarchy<T extends DatasetItem>(
  dataset: T[],
  parentId: string,
  childId: string,
): boolean {
  const parent = findById(dataset, parentId);
  if (!parent?.children) return false;

  return findById(parent.children as T[], childId) !== undefined;
}

// =============================================================================
// FORM-SPECIFIC UTILITIES
// =============================================================================

/**
 * Flatten location data to extract all zipcodes with their area and county information
 */
export function getAllZipcodes<T extends DatasetItem>(
  locationOptions: T[],
): Array<{
  id: string;
  name: string;
  area: { id: string; name: string };
  county: { id: string; name: string };
}> {
  const zipcodes: Array<{
    id: string;
    name: string;
    area: { id: string; name: string };
    county: { id: string; name: string };
  }> = [];

  locationOptions.forEach((county) => {
    county.children?.forEach((area) => {
      area.children?.forEach((zipcode) => {
        zipcodes.push({
          id: zipcode.id,
          name: zipcode.name || zipcode.label || '',
          area: { id: area.id, name: area.name || area.label || '' },
          county: { id: county.id, name: county.name || county.label || '' },
        });
      });
    });
  });

  return zipcodes;
}

/**
 * Flatten service taxonomy to extract all subdivisions with their full hierarchy
 * Similar to getAllZipcodes but for service taxonomies (3-level hierarchy)
 * @param serviceTaxonomies - The hierarchical service taxonomy dataset
 * @returns Array of all subdivisions with their parent category and subcategory information
 */
export function getAllSubdivisions<T extends DatasetItem>(
  serviceTaxonomies: T[],
): Array<{
  id: string;
  label: string;
  slug: string;
  subcategory: { id: string; label: string; slug: string };
  category: { id: string; label: string; slug: string };
}> {
  const subdivisions: Array<{
    id: string;
    label: string;
    slug: string;
    subcategory: { id: string; label: string; slug: string };
    category: { id: string; label: string; slug: string };
  }> = [];

  serviceTaxonomies.forEach((category) => {
    category.children?.forEach((subcategory) => {
      subcategory.children?.forEach((subdivision) => {
        subdivisions.push({
          id: subdivision.id,
          label: subdivision.label || subdivision.name || '',
          slug: subdivision.slug || '',
          subcategory: {
            id: subcategory.id,
            label: subcategory.label || subcategory.name || '',
            slug: subcategory.slug || '',
          },
          category: {
            id: category.id,
            label: category.label || category.name || '',
            slug: category.slug || '',
          },
        });
      });
    });
  });

  return subdivisions;
}

/**
 * Toggle an item in an array (add if doesn't exist, remove if exists)
 */
export function toggleItemInArray<T extends { id: string }>(
  array: T[],
  item: T,
): T[] {
  const exists = array.some((c) => c.id === item.id);
  return exists ? array.filter((c) => c.id !== item.id) : [...array, item];
}

/**
 * Reset coverage dependencies based on coverage type
 */
export function resetCoverageDependencies(
  coverage: any,
  type: 'online' | 'onbase' | 'onsite',
) {
  const newCoverage = { ...coverage };

  if (type === 'onbase') {
    newCoverage.address = '';
    newCoverage.area = null;
    newCoverage.county = null;
    newCoverage.zipcode = null;
  } else if (type === 'onsite') {
    newCoverage.areas = [];
    newCoverage.counties = [];
  }
  // 'online' type doesn't have dependencies to reset

  return newCoverage;
}

/**
 * Filter skills by category ID
 * Returns skills that belong to the specified category
 */
export function filterSkillsByCategory<
  T extends { id: string; category: string },
>(skills: T[], categoryId: string): T[] {
  return skills.filter((skill) => skill.category === categoryId);
}

// =============================================================================
// TAGS & SKILLS UTILITIES
// =============================================================================

/**
 * Search tags by term (optimized for LazyCombobox with large datasets)
 * @param tags - Flat tags array
 * @param searchTerm - Search query
 * @returns Filtered tags matching search term
 * @example
 * const results = searchTags(tags, 'animation');
 * // Returns all tags with 'animation' in label or slug
 */
export function searchTags<
  T extends { id: string; label: string; slug: string },
>(tags: T[], searchTerm: string): T[] {
  if (!searchTerm) return tags;
  const term = searchTerm.toLowerCase().trim();
  return tags.filter(
    (tag) =>
      tag.label.toLowerCase().includes(term) ||
      tag.slug.toLowerCase().includes(term),
  );
}

/**
 * Get tags by IDs (for resolving saved tag IDs to full tag objects)
 * @param tags - Flat tags array
 * @param tagIds - Array of tag IDs to retrieve
 * @returns Array of tag objects matching the IDs
 * @example
 * const selectedTags = getTagsByIds(tags, ['23', '24', '25']);
 * // Returns full tag objects for display
 */
export function getTagsByIds<T extends { id: string }>(
  tags: T[],
  tagIds: string[],
): T[] {
  if (!Array.isArray(tagIds) || tagIds.length === 0) return [];
  const idSet = new Set(tagIds);
  return tags.filter((tag) => idSet.has(tag.id));
}

/**
 * Get tag by ID (single lookup)
 * @param tags - Flat tags array
 * @param tagId - Tag ID to retrieve
 * @returns Tag object or undefined
 * @example
 * const tag = getTagById(tags, '23');
 */
export function getTagById<T extends { id: string }>(
  tags: T[],
  tagId: string,
): T | undefined {
  return tags.find((tag) => tag.id === tagId);
}

/**
 * Create tag lookup map for O(1) access (performance optimization)
 * Use this when you need to do many tag lookups
 * @param tags - Flat tags array
 * @returns Map of id → tag object
 * @example
 * const tagMap = createTagMap(tags);
 * const tag = tagMap.get('23'); // O(1) lookup
 */
export function createTagMap<T extends { id: string }>(
  tags: T[],
): Map<string, T> {
  return new Map(tags.map((tag) => [tag.id, tag]));
}

/**
 * Validate that tag IDs exist in the dataset
 * @param tags - Flat tags array
 * @param tagIds - Array of tag IDs to validate
 * @returns Array of valid tag IDs that exist in the dataset
 * @example
 * const validIds = validateTagIds(tags, ['23', '999', '24']);
 * // Returns ['23', '24'] (999 doesn't exist)
 */
export function validateTagIds<T extends { id: string }>(
  tags: T[],
  tagIds: string[],
): string[] {
  const idSet = new Set(tags.map((tag) => tag.id));
  return tagIds.filter((id) => idSet.has(id));
}

/**
 * Search skills by term (optimized for LazyCombobox)
 * @param skills - Flat skills array
 * @param searchTerm - Search query
 * @returns Filtered skills matching search term
 * @example
 * const results = searchSkills(skills, 'react');
 * // Returns all skills with 'react' in label or slug
 */
export function searchSkills<
  T extends { id: string; label: string; slug: string },
>(skills: T[], searchTerm: string): T[] {
  if (!searchTerm) return skills;
  const term = searchTerm.toLowerCase().trim();
  return skills.filter(
    (skill) =>
      skill.label.toLowerCase().includes(term) ||
      skill.slug.toLowerCase().includes(term),
  );
}

/**
 * Get skills by IDs (for resolving saved skill IDs to full skill objects)
 * @param skills - Flat skills array
 * @param skillIds - Array of skill IDs to retrieve
 * @returns Array of skill objects matching the IDs
 * @example
 * const selectedSkills = getSkillsByIds(skills, ['11', '12', '13']);
 * // Returns full skill objects for display
 */
export function getSkillsByIds<T extends { id: string }>(
  skills: T[],
  skillIds: string[],
): T[] {
  if (!Array.isArray(skillIds) || skillIds.length === 0) return [];
  const idSet = new Set(skillIds);
  return skills.filter((skill) => idSet.has(skill.id));
}

/**
 * Get skill by ID (single lookup)
 * @param skills - Flat skills array
 * @param skillId - Skill ID to retrieve
 * @returns Skill object or undefined
 * @example
 * const skill = getSkillById(skills, '11');
 */
export function getSkillById<T extends { id: string }>(
  skills: T[],
  skillId: string,
): T | undefined {
  return skills.find((skill) => skill.id === skillId);
}

/**
 * Create skill lookup map for O(1) access (performance optimization)
 * @param skills - Flat skills array
 * @returns Map of id → skill object
 * @example
 * const skillMap = createSkillMap(skills);
 * const skill = skillMap.get('11'); // O(1) lookup
 */
export function createSkillMap<T extends { id: string }>(
  skills: T[],
): Map<string, T> {
  return new Map(skills.map((skill) => [skill.id, skill]));
}

/**
 * Get skills by subcategory (from pro-taxonomy hierarchy)
 * This finds the parent category of a subcategory, then filters skills by that category
 * @param skills - Flat skills array with category field
 * @param proTaxonomies - Pro taxonomies with categories/subcategories
 * @param subcategoryId - Subcategory ID to filter by
 * @returns Skills belonging to that subcategory's parent category
 * @example
 * const webDevSkills = getSkillsBySubcategory(skills, proTaxonomies, '3372');
 * // Returns skills for the Web Development category
 */
export function getSkillsBySubcategory<
  T extends { id: string; category: string },
>(
  skills: T[],
  proTaxonomies: DatasetItem[],
  subcategoryId: string,
): T[] {
  // Find which category this subcategory belongs to
  for (const category of proTaxonomies) {
    const subcategory = category.children?.find(
      (sub: any) => sub.id === subcategoryId,
    );
    if (subcategory) {
      return filterSkillsByCategory(skills, category.id);
    }
  }
  return [];
}

/**
 * Validate that skill IDs exist in the dataset
 * @param skills - Flat skills array
 * @param skillIds - Array of skill IDs to validate
 * @returns Array of valid skill IDs that exist in the dataset
 * @example
 * const validIds = validateSkillIds(skills, ['11', '999', '12']);
 * // Returns ['11', '12'] (999 doesn't exist)
 */
export function validateSkillIds<T extends { id: string }>(
  skills: T[],
  skillIds: string[],
): string[] {
  const idSet = new Set(skills.map((skill) => skill.id));
  return skillIds.filter((id) => idSet.has(id));
}

/**
 * Filter skills by multiple categories (OR logic)
 * @param skills - Flat skills array with category field
 * @param categoryIds - Array of category IDs to filter by
 * @returns Skills belonging to any of the specified categories
 * @example
 * const contentSkills = filterSkillsByCategories(skills, ['7', '8']);
 * // Returns skills from categories 7 OR 8
 */
export function filterSkillsByCategories<
  T extends { id: string; category: string },
>(skills: T[], categoryIds: string[]): T[] {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) return [];
  const categorySet = new Set(categoryIds);
  return skills.filter((skill) => categorySet.has(skill.category));
}

// =============================================================================
// TAXONOMY-SPECIFIC UTILITIES
// =============================================================================

/**
 * Find taxonomy item by ID in a flat or nested taxonomy structure
 * This is an alias for findById specifically for taxonomy data
 */
export function findTaxonomyById<T extends DatasetItem>(
  taxonomy: T[],
  id: string,
): T | null {
  return findById(taxonomy, id) || null;
}

/**
 * Filter taxonomy subcategories by user type (freelancer/company)
 * Used in profile forms to show only relevant subcategories
 */
export function filterSubcategoriesByUserType<
  T extends DatasetItem & { type?: string },
>(subcategories: T[], userRole: string): T[] {
  return filterByField(subcategories, 'type', userRole);
}

/**
 * Resolve taxonomy hierarchy labels from IDs
 * Safely navigates through hierarchical taxonomy structure to resolve labels
 * @param taxonomy - The hierarchical taxonomy dataset
 * @param categoryId - ID of the category (top level)
 * @param subcategoryId - ID of the subcategory (second level)
 * @param subdivisionId - ID of the subdivision (third level)
 * @returns Object with resolved labels for each level
 */
export function resolveTaxonomyHierarchy<T extends DatasetItem>(
  taxonomy: T[],
  categoryId?: string | null,
  subcategoryId?: string | null,
  subdivisionId?: string | null,
): {
  category: string;
  subcategory: string;
  subdivision: string;
  categorySlug?: string;
  subcategorySlug?: string;
  subdivisionSlug?: string;
  subdivisionId?: string;
} {
  // Find category first (top level)
  const categoryTaxonomy = categoryId ? findById(taxonomy, categoryId) : null;

  // Find subcategory within the category's children
  const subcategoryTaxonomy =
    categoryTaxonomy?.children && subcategoryId
      ? categoryTaxonomy.children.find((sub: any) => sub.id === subcategoryId)
      : null;

  // Find subdivision within the subcategory's children
  const subdivisionTaxonomy =
    subcategoryTaxonomy?.children && subdivisionId
      ? subcategoryTaxonomy.children.find((div: any) => div.id === subdivisionId)
      : null;

  return {
    category: categoryTaxonomy?.label || '',
    subcategory: subcategoryTaxonomy?.label || '',
    subdivision: subdivisionTaxonomy?.label || '',
    categorySlug: categoryTaxonomy?.slug,
    subcategorySlug: subcategoryTaxonomy?.slug,
    subdivisionSlug: subdivisionTaxonomy?.slug,
    subdivisionId: subdivisionTaxonomy?.id,
  };
}

// =============================================================================
// LOCATION-SPECIFIC UTILITIES
// =============================================================================

/**
 * Find location name by ID in the hierarchical location dataset
 * Searches through counties, areas, and zipcodes to find the matching ID
 * @param locationOptions - The hierarchical location dataset
 * @param locationId - The ID to search for
 * @returns The name of the location or null if not found
 */
export function getLocationName<T extends DatasetItem>(
  locationOptions: T[],
  locationId: string | null | undefined,
): string | null {
  if (!locationId) {
    return null;
  }

  // Match by id OR name — coverage is stored as ids on some profiles and as
  // names ('Αττικής') on others, so a value that is already a name must
  // resolve to itself rather than fall through to null.
  // Search counties (top level)
  const county = locationOptions.find((c) => c.id === locationId || c.name === locationId);
  if (county) {
    return county.name;
  }

  // Search areas (second level)
  for (const county of locationOptions) {
    const area = county.children?.find((a: any) => a.id === locationId || a.name === locationId);
    if (area) {
      return area.name;
    }

    // Search zipcodes (third level)
    for (const area of county.children || []) {
      const zipcode = (area as any).children?.find(
        (z: any) => z.id === locationId || z.name === locationId,
      );
      if (zipcode) {
        return zipcode.name;
      }
    }
  }

  return null;
}

/**
 * Find location name by ID within a specific county context
 * This is used when we know the county and want to find an area or zipcode within it
 * @param locationOptions - The hierarchical location dataset
 * @param locationId - The ID to search for
 * @param countyId - The county context to search within
 * @returns The name of the location or null if not found
 */
export function getLocationNameInContext<T extends DatasetItem>(
  locationOptions: T[],
  locationId: string | null | undefined,
  countyId: string | null | undefined,
): string | null {
  if (!locationId) {
    return null;
  }

  // If no county context, fall back to global search
  if (!countyId) {
    return getLocationName(locationOptions, locationId);
  }

  // Find the county first
  const county = locationOptions.find((c) => c.id === countyId);
  if (!county) {
    return getLocationName(locationOptions, locationId);
  }

  // Search zipcodes first within this county's areas (prioritize deepest level)
  for (const area of county.children || []) {
    const zipcode = (area as any).children?.find(
      (z: any) => z.id === locationId,
    );
    if (zipcode) {
      return zipcode.name;
    }
  }

  // Then search areas within this county
  const area = county.children?.find((a: any) => a.id === locationId);
  if (area) {
    return area.name;
  }

  // If not found in context, fall back to global search
  return getLocationName(locationOptions, locationId);
}

// =============================================================================
// COVERAGE DISPLAY UTILITIES
// =============================================================================

// Types for coverage data (handles both raw IDs and transformed names)
type CoverageWithNames = {
  online: boolean;
  onbase: boolean;
  onsite: boolean;
  address?: string;
  area?: string | null;
  county?: string | null;
  zipcode?: string | null;
  counties?: string[]; // Already resolved names
  areas?: string[]; // Already resolved names
  countyAreasMap?: Array<{ county: string; areas: string[] }>; // Grouped county-area relationships
};

type Coverage = z.infer<typeof coverageSchema>;

/**
 * Generate normalized coverage string for search
 * Extracts all location names from coverage object and normalizes them
 *
 * Uses getLocationName() which searches hierarchically through the location dataset
 * to find counties, areas, and even zipcodes by their IDs.
 *
 * @param coverage - Profile coverage object containing area/county IDs
 * @returns Space-separated normalized location names for search
 *
 * @example
 * const coverage = {
 *   online: true,
 *   onsite: true,
 *   areas: ['216', '224'], // Area IDs (Γαλάτσι, Γέρακας)
 *   counties: ['2'] // County ID (Αττική)
 * };
 * generateCoverageNormalized(coverage);
 * // Returns: "γαλατσι γερακας αττικη"
 */
export function generateCoverageNormalized(
  coverage: Coverage | null | undefined,
): string | null {
  if (!coverage) return null;

  // Load hierarchical location dataset once
  const locations = locationOptions;
  const locationNames: string[] = [];

  // Extract area names from area IDs
  if (Array.isArray(coverage.areas)) {
    for (const areaId of coverage.areas) {
      const areaName = getLocationName(locations, areaId);
      if (areaName) {
        // Normalize: "Γαλάτσι" → "γαλατσι"
        locationNames.push(normalizeTerm(areaName));
      }
    }
  }

  // Extract county names from county IDs
  if (Array.isArray(coverage.counties)) {
    for (const countyId of coverage.counties) {
      const countyName = getLocationName(locations, countyId);
      if (countyName) {
        // Normalize: "Αττική" → "αττικη"
        locationNames.push(normalizeTerm(countyName));
      }
    }
  }

  // Legacy single area/county support (if exists)
  if (coverage.area) {
    const areaName = getLocationName(locations, coverage.area);
    if (areaName) {
      locationNames.push(normalizeTerm(areaName));
    }
  }

  if (coverage.county) {
    const countyName = getLocationName(locations, coverage.county);
    if (countyName) {
      locationNames.push(normalizeTerm(countyName));
    }
  }

  // Remove duplicate location names while preserving order
  const uniqueLocationNames = [...new Set(locationNames)];

  // Return space-separated normalized location names
  // This allows database CONTAINS search to find any location
  return uniqueLocationNames.length > 0 ? uniqueLocationNames.join(' ') : null;
}

/**
 * Get formatted coverage areas display text
 * @param coverage - Coverage object from profile (already with resolved names)
 * @returns Formatted string for display
 */
export function getCoverageAreasString(
  coverage: CoverageWithNames,
): string | null {
  if (!coverage.onsite || !coverage.areas || coverage.areas.length === 0) {
    return null;
  }

  // Areas are already resolved names, just join them
  const areaNames = coverage.areas.filter(Boolean).join(', ');
  return areaNames || null;
}

/**
 * Get formatted coverage counties display text
 * @param coverage - Coverage object from profile (already with resolved names)
 * @returns Formatted string for display
 */
export function getCoverageCountiesString(
  coverage: CoverageWithNames,
): string | null {
  if (
    !coverage.onsite ||
    !coverage.counties ||
    coverage.counties.length === 0
  ) {
    return null;
  }

  // Counties are already resolved names, just join them
  const countyNames = coverage.counties.filter(Boolean).join(', ');
  return countyNames || null;
}

/**
 * Get the address for onbase coverage
 * @param coverage - Coverage object from profile
 * @returns Address string or null
 */
export function getCoverageAddress(coverage: CoverageWithNames): string | null {
  if (!coverage.onbase || !coverage.address) {
    return null;
  }
  return coverage.address;
}

/**
 * Get the formatted address for onbase coverage with area and county
 * @param coverage - Coverage object from profile (already transformed with names)
 * @returns Formatted address string: "address, area (county)" or null
 * @example
 * // Returns: "Κάδμου 3, Αγία Παρασκευή (Αττική)"
 * getCoverageAddressWithLocation({ address: "Κάδμου 3", area: "Αγία Παρασκευή", county: "Αττική" })
 */
export function getCoverageAddressWithLocation(
  coverage: CoverageWithNames,
): string | null {
  if (!coverage.onbase || !coverage.address) {
    return null;
  }

  // Build formatted address: "address, area (county)"
  const parts: string[] = [coverage.address];

  if (coverage.area) {
    parts.push(coverage.area);
  }

  let formattedAddress = parts.join(', ');

  if (coverage.county) {
    formattedAddress += ` (${coverage.county})`;
  }

  return formattedAddress;
}

/**
 * Check if coverage has any onsite areas to display
 * @param coverage - Coverage object from profile
 * @returns Boolean indicating if there are areas to display
 */
export function hasOnsiteCoverage(coverage: CoverageWithNames): boolean {
  return Boolean(
    coverage.onsite &&
      ((coverage.counties && coverage.counties.length > 0) ||
        (coverage.areas && coverage.areas.length > 0)),
  );
}

/**
 * Check if coverage has onbase address to display
 * @param coverage - Coverage object from profile
 * @returns Boolean indicating if there's an address to display
 */
export function hasOnbaseCoverage(coverage: CoverageWithNames): boolean {
  return Boolean(coverage.onbase && coverage.address);
}

/**
 * Legacy-compatible function to get areas string (matches MetaFreelancer logic)
 * @param coverage - Coverage object with resolved names
 * @returns Formatted areas string or null
 */
export function getAreasString(coverage: CoverageWithNames): string | null {
  return getCoverageAreasString(coverage);
}

/**
 * Group coverage areas by county and return structured data for rendering
 * Works with coverage data that has already been transformed with location names
 * Example output: [{ county: "Θεσσαλονίκη", areas: ["Επανομή", "Αγία Τριάδα"] }, ...]
 * @param coverage - Coverage object with resolved county and area names
 * @returns Array of county objects with their areas, sorted alphabetically
 */
export function getCoverageGroupedByCounty(
  coverage: CoverageWithNames | null | undefined,
): Array<{ county: string; areas: string[] }> {
  if (!coverage || !coverage.onsite) {
    return [];
  }

  // If countyAreasMap is already available (from enhanced transformation), use it directly
  if (coverage.countyAreasMap && coverage.countyAreasMap.length > 0) {
    return coverage.countyAreasMap;
  }

  // Fallback: If no countyAreasMap, return counties with all areas
  if (!coverage.counties || coverage.counties.length === 0) {
    return [];
  }

  // Sort counties alphabetically
  const sortedCounties = [...coverage.counties].sort((a, b) => a.localeCompare(b, 'el'));

  // If no areas, return just counties without areas
  if (!coverage.areas || coverage.areas.length === 0) {
    return sortedCounties.map((county) => ({
      county,
      areas: [],
    }));
  }

  // Sort areas alphabetically
  const sortedAreas = [...coverage.areas].sort((a, b) => a.localeCompare(b, 'el'));

  // Return all counties with all areas
  // Note: This is a fallback when county-area relationships aren't preserved
  return sortedCounties.map((county) => ({
    county,
    areas: sortedAreas,
  }));
}

// =============================================================================
// COVERAGE TRANSFORMATION UTILITIES
// =============================================================================

/**
 * Helper function to get area name from a location ID (handles both area IDs and zipcode IDs)
 * If the locationId is a zipcode ID, it returns the parent area name
 * If the locationId is an area ID, it returns the area name
 * @param locationOptions - Hierarchical location dataset
 * @param locationId - Can be either an area ID or a zipcode ID
 * @param countyId - County ID for context (optional, helps narrow search)
 * @returns Area name or null
 */
function getAreaNameFromLocationId<T extends DatasetItem>(
  locationOptions: T[],
  locationId: string | null | undefined,
  countyId: string | null | undefined,
): string | null {
  if (!locationId) return null;

  // First, try to find it as an area (direct child of county)
  for (const county of locationOptions) {
    // If countyId is provided, only search in that county
    if (countyId && county.id !== countyId) continue;

    const area = county.children?.find((a: any) => a.id === locationId);
    if (area) {
      // Found as area - return area name
      return area.name || area.label || null;
    }

    // Not found as area, search in zipcodes (grandchildren)
    for (const area of county.children || []) {
      const zipcode = (area as any).children?.find((z: any) => z.id === locationId);
      if (zipcode) {
        // Found as zipcode - return parent area name
        return area.name || area.label || null;
      }
    }
  }

  return null;
}

/**
 * Transform raw coverage data by resolving all location IDs to names
 * This replaces the complex inline transformation logic in profile pages
 * @param rawCoverage - Raw coverage object from database with location IDs
 * @param locationOptions - Hierarchical location dataset
 * @returns Coverage object with all location IDs resolved to names
 */
export function transformCoverageWithLocationNames<T extends DatasetItem>(
  rawCoverage: any,
  locationOptions: T[],
): CoverageWithNames {
  // Handle null or undefined coverage data
  if (!rawCoverage) {
    return {
      online: false,
      onbase: false,
      onsite: false,
      address: null,
      county: null,
      area: null,
      zipcode: null,
      counties: [],
      areas: [],
    };
  }

  // Transform county and area names
  const countyNames = transformLocationIdsToNames(
    rawCoverage.counties || [],
    locationOptions,
  );

  const areaNames = transformAreaIdsToNamesInContext(
    rawCoverage.areas || [],
    rawCoverage.counties || [],
    locationOptions,
  );

  // Build county-areas map to maintain relationships
  // For each area ID, find which county it belongs to
  const countyAreasMap: Array<{ county: string; areas: string[] }> = [];

  if (rawCoverage.counties && rawCoverage.areas && rawCoverage.counties.length > 0) {
    // Coverage values may be ids ('4') on some profiles or already names
    // ('Αττικής') on others — match on either and key the grouping by the
    // resolved county NAME so both shapes produce the same output.
    const countyVals: string[] = rawCoverage.counties;
    const areaVals: string[] = rawCoverage.areas;
    const areasByCountyName = new Map<string, string[]>();

    for (const areaVal of areaVals) {
      for (const countyOption of locationOptions) {
        const area = countyOption.children?.find(
          (a: any) => a.id === areaVal || a.name === areaVal,
        );
        if (area) {
          const countyName = countyOption.name || (countyOption as any).label || '';
          const areaName = area.name || area.label || String(areaVal);
          const selected = countyVals.some(
            (cv) => cv === countyOption.id || cv === countyName,
          );
          if (countyName && selected) {
            if (!areasByCountyName.has(countyName)) areasByCountyName.set(countyName, []);
            areasByCountyName.get(countyName)!.push(areaName);
          }
          break; // found the county for this area
        }
      }
    }

    for (const countyVal of countyVals) {
      const county = locationOptions.find(
        (c) => c.id === countyVal || c.name === countyVal,
      );
      // Fall back to the raw value when it's already a name we can display.
      const countyName = county?.name || (county as any)?.label || String(countyVal);
      const areasInCounty = (areasByCountyName.get(countyName) || []).sort((a, b) =>
        a.localeCompare(b, 'el'),
      );
      if (countyName) {
        countyAreasMap.push({ county: countyName, areas: areasInCounty });
      }
    }

    countyAreasMap.sort((a, b) => a.county.localeCompare(b.county, 'el'));
  }

  // Ensure required boolean fields have defaults
  const coverage: CoverageWithNames = {
    online: Boolean(rawCoverage.online),
    onbase: Boolean(rawCoverage.onbase),
    onsite: Boolean(rawCoverage.onsite),
    address: rawCoverage.address,
    // Transform single location fields with context awareness
    county: rawCoverage.county
      ? getLocationName(locationOptions, rawCoverage.county)
      : null,
    // Use helper that handles both area IDs and zipcode IDs
    area: rawCoverage.area
      ? getAreaNameFromLocationId(locationOptions, rawCoverage.area, rawCoverage.county)
      : rawCoverage.zipcode
        ? getAreaNameFromLocationId(locationOptions, rawCoverage.zipcode, rawCoverage.county)
        : null,
    zipcode: rawCoverage.zipcode
      ? getLocationNameInContext(locationOptions, rawCoverage.zipcode, rawCoverage.county)
      : null,
    // Transform location arrays
    counties: countyNames,
    areas: areaNames,
    // Add county-areas mapping
    countyAreasMap: countyAreasMap.length > 0 ? countyAreasMap : undefined,
  };

  return coverage;
}

/**
 * Transform an array of location IDs to their corresponding names
 * @param locationIds - Array of location IDs to resolve
 * @param locationOptions - Hierarchical location dataset
 * @returns Array of resolved location names, filtered to remove nulls
 */
export function transformLocationIdsToNames<T extends DatasetItem>(
  locationIds: string[],
  locationOptions: T[],
): string[] {
  if (!Array.isArray(locationIds) || locationIds.length === 0) {
    return [];
  }

  return locationIds
    .map((id) => getLocationName(locationOptions, id))
    .filter((name): name is string => name !== null);
}

/**
 * Transform area IDs to names within the context of selected counties
 * This handles the complex logic of finding areas within specific counties
 * @param areaIds - Array of area IDs to resolve
 * @param countyIds - Array of county IDs that provide context
 * @param locationOptions - Hierarchical location dataset
 * @returns Array of resolved area names within the county context
 */
export function transformAreaIdsToNamesInContext<T extends DatasetItem>(
  areaIds: string[],
  countyIds: string[],
  locationOptions: T[],
): string[] {
  if (
    !Array.isArray(areaIds) ||
    areaIds.length === 0 ||
    !Array.isArray(countyIds) ||
    countyIds.length === 0
  ) {
    return [];
  }

  const resolvedAreas: string[] = [];

  for (const areaId of areaIds) {
    const areaName = findAreaNameInCounties(areaId, countyIds, locationOptions);
    if (areaName) {
      resolvedAreas.push(areaName);
    }
  }

  return resolvedAreas;
}

/**
 * Find an area name within the context of specific counties
 * @param areaId - Area ID to find
 * @param countyIds - Array of county IDs to search within
 * @param locationOptions - Hierarchical location dataset
 * @returns Area name if found, null otherwise
 */
export function findAreaNameInCounties<T extends DatasetItem>(
  areaId: string,
  countyIds: string[],
  locationOptions: T[],
): string | null {
  for (const countyId of countyIds) {
    const county = locationOptions.find((c) => c.id === countyId || c.name === countyId);
    if (county?.children) {
      const area = county.children.find((a: any) => a.id === areaId || a.name === areaId);
      if (area) {
        return area.name || area.label || null;
      }
    }
  }
  return null;
}

/**
 * Get default coverage object with proper typing
 * @returns Default coverage object with all boolean fields set to false
 */
export function getDefaultCoverage(): CoverageWithNames {
  return {
    online: false,
    onbase: false,
    onsite: false,
    address: undefined,
    area: null,
    county: null,
    zipcode: null,
    counties: [],
    areas: [],
  };
}

// =============================================================================
// TAXONOMY ARCHIVE UTILITIES
// =============================================================================

/**
 * Get all valid taxonomy paths for static generation
 * Generates all possible combinations of category/subcategory/subdivision
 * @param taxonomy - The hierarchical taxonomy dataset
 * @returns Array of path objects for Next.js generateStaticParams
 */
export function getAllTaxonomyPaths<T extends DatasetItem>(
  taxonomy: T[],
): Array<{ category?: string; subcategory?: string; subdivision?: string }> {
  const paths: Array<{ category?: string; subcategory?: string; subdivision?: string }> = [];

  taxonomy.forEach((category) => {
    // Add category level path
    paths.push({ category: category.slug });

    // Add subcategory level paths
    category.children?.forEach((subcategory: any) => {
      paths.push({
        category: category.slug,
        subcategory: subcategory.slug,
      });

      // Add subdivision level paths
      subcategory.children?.forEach((subdivision: any) => {
        paths.push({
          category: category.slug,
          subcategory: subcategory.slug,
          subdivision: subdivision.slug,
        });
      });
    });
  });

  return paths;
}

/**
 * Find taxonomy items within parent context for accurate slug resolution
 * @param taxonomy - The hierarchical taxonomy dataset
 * @param categorySlug - Optional category slug
 * @param subcategorySlug - Optional subcategory slug
 * @param subdivisionSlug - Optional subdivision slug
 * @returns Object with resolved taxonomy items at each level
 */
export function findTaxonomyBySlugInContext<T extends DatasetItem>(
  taxonomy: T[],
  categorySlug?: string,
  subcategorySlug?: string,
  subdivisionSlug?: string,
): {
  category?: T;
  subcategory?: T;
  subdivision?: T;
} | null {
  if (!categorySlug) {
    return null;
  }

  // Find category
  const category = taxonomy.find((c) => c.slug === categorySlug);
  if (!category) {
    return null;
  }

  // Return just category if no subcategory requested
  if (!subcategorySlug) {
    return { category };
  }

  // Find subcategory within category
  const subcategory = category.children?.find(
    (s: any) => s.slug === subcategorySlug,
  ) as T | undefined;
  if (!subcategory) {
    return null;
  }

  // Return category and subcategory if no subdivision requested
  if (!subdivisionSlug) {
    return { category, subcategory };
  }

  // Find subdivision within subcategory
  const subdivision = (subcategory as any).children?.find(
    (d: any) => d.slug === subdivisionSlug,
  ) as T | undefined;
  if (!subdivision) {
    return null;
  }

  return { category, subcategory, subdivision };
}

/**
 * Find ALL subcategories matching a slug within a category
 * Useful for handling duplicate slugs (e.g., gender variants like 'daskaloi')
 */
export function findAllSubcategoriesBySlug<T extends DatasetItem>(
  taxonomy: T[],
  categorySlug: string,
  subcategorySlug: string,
): T[] {
  // Find category
  const category = taxonomy.find((c) => c.slug === categorySlug);
  if (!category || !category.children) {
    return [];
  }

  // Find ALL subcategories with matching slug
  const matchingSubcategories = category.children.filter(
    (s: any) => s.slug === subcategorySlug,
  ) as T[];

  return matchingSubcategories;
}

/**
 * Generate breadcrumb segments from taxonomy slugs
 * @param taxonomy - The hierarchical taxonomy dataset
 * @param categorySlug - Optional category slug
 * @param subcategorySlug - Optional subcategory slug
 * @param subdivisionSlug - Optional subdivision slug
 * @returns Array of breadcrumb segments with labels and hrefs
 */
export function getTaxonomyBreadcrumbs<T extends DatasetItem>(
  taxonomy: T[],
  categorySlug?: string,
  subcategorySlug?: string,
  subdivisionSlug?: string,
  options?: {
    basePath?: string;
    baseLabel?: string;
    usePlural?: boolean;
  },
): Array<{ label: string; href?: string }> {
  const basePath = options?.basePath || '/services';
  const baseLabel = options?.baseLabel || 'Υπηρεσίες';
  const usePlural = options?.usePlural || false;

  const breadcrumbs: Array<{ label: string; href?: string }> = [
    { label: 'Αρχική', href: '/' },
    { label: baseLabel, href: basePath },
  ];

  if (!categorySlug) {
    return breadcrumbs;
  }

  const taxonomyContext = findTaxonomyBySlugInContext(
    taxonomy,
    categorySlug,
    subcategorySlug,
    subdivisionSlug,
  );

  if (!taxonomyContext) {
    return breadcrumbs;
  }

  // Add category breadcrumb
  if (taxonomyContext.category) {
    const categoryLabel = usePlural
      ? (taxonomyContext.category.plural || taxonomyContext.category.label || taxonomyContext.category.name || '')
      : (taxonomyContext.category.label || taxonomyContext.category.name || '');

    breadcrumbs.push({
      label: categoryLabel,
      href: subdivisionSlug || subcategorySlug ? `${basePath}/${categorySlug}` : undefined,
    });
  }

  // Add subcategory breadcrumb
  if (taxonomyContext.subcategory) {
    const subcategoryLabel = usePlural
      ? (taxonomyContext.subcategory.plural || taxonomyContext.subcategory.label || taxonomyContext.subcategory.name || '')
      : (taxonomyContext.subcategory.label || taxonomyContext.subcategory.name || '');

    breadcrumbs.push({
      label: subcategoryLabel,
      href: subdivisionSlug ? `${basePath}/${categorySlug}/${subcategorySlug}` : undefined,
    });
  }

  // Add subdivision breadcrumb
  if (taxonomyContext.subdivision) {
    const subdivisionLabel = usePlural
      ? (taxonomyContext.subdivision.plural || taxonomyContext.subdivision.label || taxonomyContext.subdivision.name || '')
      : (taxonomyContext.subdivision.label || taxonomyContext.subdivision.name || '');

    breadcrumbs.push({
      label: subdivisionLabel,
    });
  }

  return breadcrumbs;
}

/**
 * Find subcategory by slug across all categories (for new route structure without category)
 * @param taxonomy - The hierarchical taxonomy dataset
 * @param subcategorySlug - Subcategory slug to find
 * @returns Object with the found subcategory and its parent category, or null if not found
 */
export function findSubcategoryBySlug<T extends DatasetItem>(
  taxonomy: T[],
  subcategorySlug: string,
): { category: T; subcategory: T } | null {
  for (const category of taxonomy) {
    if (category.children) {
      const subcategory = category.children.find((sub: any) => sub.slug === subcategorySlug) as T | undefined;
      if (subcategory) {
        return { category, subcategory };
      }
    }
  }
  return null;
}

/**
 * Find subdivision by slug across all categories and subcategories (for new route structure)
 * @param taxonomy - The hierarchical taxonomy dataset
 * @param subdivisionSlug - Subdivision slug to find
 * @returns Object with the found subdivision and its parent category/subcategory, or null if not found
 */
export function findSubdivisionBySlug<T extends DatasetItem>(
  taxonomy: T[],
  subdivisionSlug: string,
): { category: T; subcategory: T; subdivision: T } | null {
  for (const category of taxonomy) {
    if (category.children) {
      for (const subcategory of category.children as T[]) {
        if ((subcategory as any).children) {
          const subdivision = (subcategory as any).children.find((div: any) => div.slug === subdivisionSlug) as T | undefined;
          if (subdivision) {
            return { category, subcategory, subdivision };
          }
        }
      }
    }
  }
  return null;
}

/**
 * Find taxonomy context by subcategory and optional subdivision (no category required)
 * @param taxonomy - The hierarchical taxonomy dataset
 * @param subcategorySlug - Subcategory slug
 * @param subdivisionSlug - Optional subdivision slug
 * @returns Object with resolved taxonomy items at each level
 */
export function findTaxonomyBySubcategorySlug<T extends DatasetItem>(
  taxonomy: T[],
  subcategorySlug: string,
  subdivisionSlug?: string,
): {
  category: T;
  subcategory: T;
  subdivision?: T;
} | null {
  const subcategoryResult = findSubcategoryBySlug(taxonomy, subcategorySlug);
  if (!subcategoryResult) {
    return null;
  }

  const { category, subcategory } = subcategoryResult;

  // If no subdivision requested, return category and subcategory
  if (!subdivisionSlug) {
    return { category, subcategory };
  }

  // Find subdivision within the found subcategory
  const subdivision = (subcategory as any).children?.find(
    (div: any) => div.slug === subdivisionSlug,
  ) as T | undefined;

  if (!subdivision) {
    return null;
  }

  return { category, subcategory, subdivision };
}

/**
 * Generate breadcrumb segments for new route structure (no category in URL)
 * @param taxonomy - The hierarchical taxonomy dataset
 * @param subcategorySlug - Subcategory slug
 * @param subdivisionSlug - Optional subdivision slug
 * @param options - Options for customizing breadcrumbs
 * @returns Array of breadcrumb segments with labels and hrefs
 */
export function getBreadcrumbsForNewRoutes<T extends DatasetItem>(
  taxonomy: T[],
  subcategorySlug?: string,
  subdivisionSlug?: string,
  options?: {
    basePath?: string;
    baseLabel?: string;
    usePlural?: boolean;
  },
): Array<{ label: string; href?: string }> {
  const basePath = options?.basePath || '/ipiresies';
  const baseLabel = options?.baseLabel || 'Υπηρεσίες';
  const usePlural = options?.usePlural || false;

  const breadcrumbs: Array<{ label: string; href?: string }> = [
    { label: 'Αρχική', href: '/' },
    { label: baseLabel, href: basePath },
  ];

  if (!subcategorySlug) {
    return breadcrumbs;
  }

  const taxonomyContext = findTaxonomyBySubcategorySlug(
    taxonomy,
    subcategorySlug,
    subdivisionSlug,
  );

  if (!taxonomyContext) {
    return breadcrumbs;
  }

  // Add category breadcrumb (links to categories page)
  if (taxonomyContext.category) {
    const categoryLabel = usePlural
      ? (taxonomyContext.category.plural || taxonomyContext.category.label || taxonomyContext.category.name || '')
      : (taxonomyContext.category.label || taxonomyContext.category.name || '');

    breadcrumbs.push({
      label: categoryLabel,
      href: `/categories/${taxonomyContext.category.slug}`,
    });
  }

  // Add subcategory breadcrumb
  if (taxonomyContext.subcategory) {
    const subcategoryLabel = usePlural
      ? (taxonomyContext.subcategory.plural || taxonomyContext.subcategory.label || taxonomyContext.subcategory.name || '')
      : (taxonomyContext.subcategory.label || taxonomyContext.subcategory.name || '');

    breadcrumbs.push({
      label: subcategoryLabel,
      href: subdivisionSlug ? `${basePath}/${subcategorySlug}` : undefined,
    });
  }

  // Add subdivision breadcrumb
  if (taxonomyContext.subdivision) {
    const subdivisionLabel = usePlural
      ? (taxonomyContext.subdivision.plural || taxonomyContext.subdivision.label || taxonomyContext.subdivision.name || '')
      : (taxonomyContext.subdivision.label || taxonomyContext.subdivision.name || '');

    breadcrumbs.push({
      label: subdivisionLabel,
    });
  }

  return breadcrumbs;
}

// =============================================================================
// UPDATE UTILITIES
// =============================================================================

/**
 * Update an item in a hierarchical dataset by ID
 * Creates a new copy of the dataset with the updated item
 * @param dataset - The hierarchical dataset
 * @param itemId - ID of the item to update
 * @param updates - Partial updates to apply to the item
 * @returns New dataset with the updated item
 */
export function updateItemInDataset<T extends DatasetItem>(
  dataset: T[],
  itemId: string,
  updates: Partial<T>,
): T[] {
  return dataset.map((item) => {
    // If this is the item to update
    if (item.id === itemId) {
      return { ...item, ...updates };
    }

    // If item has children, recursively update
    if (item.children && item.children.length > 0) {
      return {
        ...item,
        children: updateItemInDataset(item.children as T[], itemId, updates),
      };
    }

    return item;
  });
}

// =============================================================================
// PRO TAXONOMY SPECIFIC UTILITIES
// =============================================================================

/**
 * Find pro subcategory by slug across all categories
 * @param taxonomy - The hierarchical pro taxonomy dataset
 * @param subcategorySlug - Subcategory slug to find
 * @returns Object with the found subcategory and its parent category, or null if not found
 */
export function findProSubcategoryBySlug<T extends DatasetItem>(
  taxonomy: T[],
  subcategorySlug: string,
): { category: T; subcategory: T } | null {
  for (const category of taxonomy) {
    if (category.children) {
      const subcategory = category.children.find((sub: any) => sub.slug === subcategorySlug) as T | undefined;
      if (subcategory) {
        return { category, subcategory };
      }
    }
  }
  return null;
}

/**
 * Update a pro taxonomy item by ID and level (category or subcategory only)
 * @param taxonomy - The pro taxonomy dataset
 * @param itemId - ID of the item to update
 * @param level - Level of the item ('category' or 'subcategory')
 * @param updates - Object with fields to update
 * @returns Updated taxonomy array
 */
export function updateProTaxonomyItemByLevel<T extends DatasetItem>(
  taxonomy: T[],
  itemId: string,
  level: 'category' | 'subcategory',
  updates: Record<string, any>
): T[] {
  return taxonomy.map((category) => {
    if (level === 'category' && category.id === itemId) {
      return { ...category, ...updates } as T;
    }

    if (category.children && level === 'subcategory') {
      const updatedChildren = category.children.map((subcategory: any) => {
        if (subcategory.id === itemId) {
          return { ...subcategory, ...updates };
        }
        return subcategory;
      });

      return { ...category, children: updatedChildren } as T;
    }

    return category;
  }) as T[];
}

// =============================================================================
// LOCATION ORDERING & FILTERING UTILITIES
// =============================================================================

// Special location IDs
export const NATIONWIDE_ID = '54';
export const CYPRUS_ID = '55';

// Priority counties that always appear first (Αττικής, Θεσσαλονίκης)
const PRIORITY_COUNTY_IDS = ['2', '12'];

/**
 * Returns counties ordered: priority first, then alphabetical, Cyprus last.
 * Excludes the nationwide entry.
 */
function getOrderedCounties(locationOptions: DatasetItem[]): DatasetItem[] {
  const priority: DatasetItem[] = [];
  const regular: DatasetItem[] = [];
  let cyprus: DatasetItem | null = null;

  for (const county of locationOptions) {
    if (county.id === NATIONWIDE_ID) continue;
    if (county.id === CYPRUS_ID) {
      cyprus = county;
    } else if (PRIORITY_COUNTY_IDS.includes(county.id)) {
      priority.push(county);
    } else {
      regular.push(county);
    }
  }

  // Sort priority counties in the defined order
  priority.sort(
    (a, b) =>
      PRIORITY_COUNTY_IDS.indexOf(a.id) - PRIORITY_COUNTY_IDS.indexOf(b.id),
  );

  // Regular counties are already alphabetically sorted in the source data
  const result = [...priority, ...regular];
  if (cyprus) result.push(cyprus);
  return result;
}

/**
 * Counties for coverage forms (onboarding + profile coverage).
 * Includes Πανελλαδικά at the top, then ordered counties.
 */
export function getCountiesForCoverageForms(
  locationOptions: DatasetItem[],
): DatasetItem[] {
  const nationwide = locationOptions.find((c) => c.id === NATIONWIDE_ID);
  const ordered = getOrderedCounties(locationOptions);
  return nationwide ? [nationwide, ...ordered] : ordered;
}

/**
 * Counties for archive filter dropdowns.
 * Excludes Πανελλαδικά entirely.
 */
export function getCountiesForArchiveFilters(
  locationOptions: DatasetItem[],
): DatasetItem[] {
  return getOrderedCounties(locationOptions);
}

/**
 * Check if nationwide (Πανελλαδικά) is selected in the counties array.
 */
export function isNationwideSelected(countyIds: string[]): boolean {
  return countyIds.includes(NATIONWIDE_ID);
}

