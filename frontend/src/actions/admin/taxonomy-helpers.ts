/**
 * Taxonomy helper functions
 *
 * Reads taxonomy data directly from the DB (via the maps API getters), so admin
 * lists reflect DB writes immediately.
 */

'use server';

import type { TaxonomyType } from '@/lib/types/taxonomy-operations';
import type { DatasetItem } from '@/lib/types/datasets';

// File-bucket taxonomy type. The old taxonomy-file-manager (GitHub file I/O)
// was removed with the rest of the git logic; the buckets are a fixed set.
type FileTaxonomyType = 'service' | 'pro' | 'tags' | 'skills';
import {
  getTags,
  getSkills,
  getServiceTaxonomies,
  getProTaxonomies,
} from '@/lib/taxonomies';
import type { AsyncResult } from '@/lib/types/server-actions';
import { tryCatchAsync, failure, isSuccess } from '@/lib/types/server-actions';

/**
 * Map granular taxonomy types to file-based types
 */
function mapTaxonomyTypeToFile(type: TaxonomyType): FileTaxonomyType {
  if (type.startsWith('service-')) return 'service';
  if (type.startsWith('pro-')) return 'pro';
  if (type === 'tags') return 'tags';
  if (type === 'skills') return 'skills';
  throw new Error(`Unknown taxonomy type: ${type}`);
}

/**
 * Get taxonomy data directly from Git (datasets branch)
 *
 * Replaces getTaxonomyWithStaging() which used database staging table
 *
 * @param type - Taxonomy type to fetch
 * @returns Result with taxonomy items or error
 *
 * @example
 * ```ts
 * const result = await getTaxonomyData('tags');
 * if (result.success) {
 *   console.log('Tags:', result.data);
 * } else {
 *   console.error('Error:', result.error.message);
 * }
 * ```
 */
export async function getTaxonomyData(
  type: TaxonomyType
): AsyncResult<DatasetItem[], Error> {
  return tryCatchAsync(async () => {
    // Read from the DB (via the maps API getters) so admin lists reflect DB
    // writes — newly approved/created/edited tags, skills, and categories show
    // up immediately. The static dataset is only an offline fallback inside the
    // getters. (Writes go to the DB via dataset_ops / submission approve.)
    const fileType = mapTaxonomyTypeToFile(type);
    switch (fileType) {
      case 'tags':
        return getTags();
      case 'skills':
        return getSkills();
      case 'service':
        return getServiceTaxonomies();
      case 'pro':
        return getProTaxonomies();
      default:
        throw new Error(`Unknown taxonomy type: ${type}`);
    }
  });
}

/**
 * Get taxonomy data by ID
 *
 * Finds a specific taxonomy item by its ID
 *
 * @param type - Taxonomy type
 * @param itemId - Item ID to find
 * @returns Result with found item or error
 */
export async function getTaxonomyItemById(
  type: TaxonomyType,
  itemId: string
): AsyncResult<DatasetItem | null, Error> {
  return tryCatchAsync(async () => {
    const result = await getTaxonomyData(type);

    if (!isSuccess(result)) {
      throw new Error(`Failed to get taxonomy data: ${result.error.message}`);
    }

    const item = findItemById(result.data, itemId);
    return item;
  });
}

/**
 * Recursively find item by ID in taxonomy tree
 */
function findItemById(
  items: DatasetItem[],
  id: string
): DatasetItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }

    if (item.children && item.children.length > 0) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Get taxonomy statistics
 *
 * @param type - Taxonomy type
 * @returns Result with statistics
 */
export async function getTaxonomyStats(
  type: TaxonomyType
): AsyncResult<TaxonomyStats, Error> {
  return tryCatchAsync(async () => {
    const result = await getTaxonomyData(type);

    if (!isSuccess(result)) {
      throw new Error(`Failed to get taxonomy data: ${result.error.message}`);
    }

    const stats = calculateStats(result.data);
    return stats;
  });
}

/**
 * Taxonomy statistics
 */
export interface TaxonomyStats {
  totalItems: number;
  topLevelItems: number;
  maxDepth: number;
  itemsByDepth: Record<number, number>;
}

/**
 * Calculate taxonomy statistics
 */
function calculateStats(items: DatasetItem[]): TaxonomyStats {
  let totalItems = 0;
  let maxDepth = 0;
  const itemsByDepth: Record<number, number> = {};

  function traverse(items: DatasetItem[], depth: number) {
    totalItems += items.length;
    itemsByDepth[depth] = (itemsByDepth[depth] || 0) + items.length;
    maxDepth = Math.max(maxDepth, depth);

    for (const item of items) {
      if (item.children && item.children.length > 0) {
        traverse(item.children, depth + 1);
      }
    }
  }

  traverse(items, 0);

  return {
    totalItems,
    topLevelItems: items.length,
    maxDepth,
    itemsByDepth,
  };
}

/**
 * Validate taxonomy item structure
 *
 * Ensures item has required fields and valid structure
 */
function validateTaxonomyItem(
  item: unknown
): item is DatasetItem {
  if (!item || typeof item !== 'object') return false;

  const obj = item as any;

  // Required fields
  if (typeof obj.id !== 'string' || !obj.id) return false;
  if (typeof obj.label !== 'string' || !obj.label) return false;
  if (typeof obj.slug !== 'string' || !obj.slug) return false;

  // Children must be array if present
  if (obj.children !== undefined) {
    if (!Array.isArray(obj.children)) return false;

    // Recursively validate children
    for (const child of obj.children) {
      if (!validateTaxonomyItem(child)) return false;
    }
  }

  return true;
}

/**
 * Flatten taxonomy tree to flat array
 * Useful for searching across all items
 */
function flattenTaxonomy(items: DatasetItem[]): DatasetItem[] {
  const flat: DatasetItem[] = [];

  function traverse(items: DatasetItem[]) {
    for (const item of items) {
      flat.push(item);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  }

  traverse(items);
  return flat;
}

/**
 * Search taxonomy items by label or slug
 */
export async function searchTaxonomy(
  type: TaxonomyType,
  query: string
): AsyncResult<DatasetItem[], Error> {
  const result = await getTaxonomyData(type);

  if (!result.success) {
    return result;
  }

  const lowerQuery = query.toLowerCase();
  const flat = flattenTaxonomy(result.data);

  const matches = flat.filter(
    (item) =>
      item.label.toLowerCase().includes(lowerQuery) ||
      item.slug.toLowerCase().includes(lowerQuery)
  );

  return { success: true, data: matches };
}
