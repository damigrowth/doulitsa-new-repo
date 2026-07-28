/**
 * Taxonomy Draft System - Browser localStorage-based staging
 *
 * ML15-290: Replaces database staging with client-side draft management
 * Allows batch editing before committing to Git
 *
 * Features:
 * - Store multiple edits in browser localStorage
 * - Preview merged view (committed + drafts)
 * - Batch commit all drafts in single Git commit
 * - Auto-clear after successful commit
 * - 7-day TTL with auto-cleanup
 */

'use client';

import type { DatasetItem } from '@/lib/types/datasets';
import type {
  TaxonomyDraft,
  TaxonomyType,
  DraftSummary,
} from '@/lib/types/taxonomy-operations';

interface DraftStorage {
  drafts: TaxonomyDraft[];
  lastUpdated: number;
}

const STORAGE_KEY = 'taxonomy_drafts';
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Generate unique ID for drafts
 */
function generateId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all drafts from localStorage
 */
export function getDrafts(): TaxonomyDraft[] {
  if (!isLocalStorageAvailable()) {
    console.warn('[TAXONOMY_DRAFTS] localStorage not available');
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const data: DraftStorage = JSON.parse(stored);

    // Check TTL
    const age = Date.now() - data.lastUpdated;
    if (age > TTL) {
      console.log('[TAXONOMY_DRAFTS] Drafts expired, clearing');
      clearDrafts();
      return [];
    }

    return data.drafts;
  } catch (error) {
    console.error('[TAXONOMY_DRAFTS] Error reading drafts:', error);
    return [];
  }
}

/**
 * Get drafts filtered by taxonomy type
 */
export function getDraftsByType(type: TaxonomyType): TaxonomyDraft[] {
  return getDrafts().filter((draft) => draft.taxonomyType === type);
}

/**
 * Get draft count (total or by type)
 */
export function getDraftCount(type?: TaxonomyType): number {
  const drafts = type ? getDraftsByType(type) : getDrafts();
  return drafts.length;
}

/**
 * Save draft to localStorage
 * Accepts a fully-formed draft (with id and createdAt already set)
 */
export function saveDraft(draft: TaxonomyDraft): void {
  if (!isLocalStorageAvailable()) {
    throw new Error('localStorage not available - cannot save drafts');
  }

  try {
    const existingDrafts = getDrafts();
    const updatedDrafts = [...existingDrafts, draft];

    const storage: DraftStorage = {
      drafts: updatedDrafts,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));

    console.log('[TAXONOMY_DRAFTS] Saved draft:', draft.id, draft.operation);
  } catch (error) {
    console.error('[TAXONOMY_DRAFTS] Error saving draft:', error);
    throw error;
  }
}

/**
 * Delete specific draft
 */
export function deleteDraft(draftId: string): boolean {
  if (!isLocalStorageAvailable()) return false;

  try {
    const drafts = getDrafts();
    const filtered = drafts.filter((d) => d.id !== draftId);

    if (filtered.length === drafts.length) {
      console.warn('[TAXONOMY_DRAFTS] Draft not found:', draftId);
      return false;
    }

    const storage: DraftStorage = {
      drafts: filtered,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));

    console.log('[TAXONOMY_DRAFTS] Deleted draft:', draftId);
    return true;
  } catch (error) {
    console.error('[TAXONOMY_DRAFTS] Error deleting draft:', error);
    return false;
  }
}

/**
 * Clear all drafts (or filter by taxonomy type)
 */
export function clearDrafts(type?: TaxonomyType): number {
  if (!isLocalStorageAvailable()) return 0;

  try {
    if (!type) {
      // Clear all
      localStorage.removeItem(STORAGE_KEY);
      console.log('[TAXONOMY_DRAFTS] Cleared all drafts');
      return getDrafts().length; // Return count before clearing
    }

    // Clear specific type
    const drafts = getDrafts();
    const filtered = drafts.filter((d) => d.taxonomyType !== type);
    const removedCount = drafts.length - filtered.length;

    if (removedCount === 0) {
      console.log('[TAXONOMY_DRAFTS] No drafts to clear for type:', type);
      return 0;
    }

    const storage: DraftStorage = {
      drafts: filtered,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));

    console.log(`[TAXONOMY_DRAFTS] Cleared ${removedCount} drafts for type:`, type);
    return removedCount;
  } catch (error) {
    console.error('[TAXONOMY_DRAFTS] Error clearing drafts:', error);
    return 0;
  }
}

/**
 * Apply drafts to taxonomy data
 * Returns merged view of committed data + draft changes
 */
export function applyDraftsToData(
  committedData: DatasetItem[],
  drafts: TaxonomyDraft[]
): DatasetItem[] {
  let data = [...committedData];

  for (const draft of drafts) {
    switch (draft.operation) {
      case 'create':
        // Handle hierarchical creation
        if (draft.level === 'subcategory' && draft.parentId) {
          data = data.map((cat) =>
            cat.id === draft.parentId
              ? { ...cat, children: [...(cat.children || []), draft.data] }
              : cat
          );
        } else if (draft.level === 'subdivision' && draft.parentId) {
          data = data.map((cat) => ({
            ...cat,
            children: cat.children?.map((sub) =>
              sub.id === draft.parentId
                ? { ...sub, children: [...(sub.children || []), draft.data] }
                : sub
            ),
          }));
        } else {
          // Category or flat taxonomy - add to root
          data.push(draft.data);
        }
        break;

      case 'update':
        if (draft.newParentId) {
          // Validate level is set for move operations
          if (
            !draft.level ||
            (draft.level !== 'subcategory' && draft.level !== 'subdivision')
          ) {
            console.error(
              `[TAXONOMY_DRAFTS] Move operation missing valid level: "${draft.level}", falling back to in-place update`
            );
            data = updateItemRecursively(data, draft.itemId!, draft.data);
            break;
          }
          // Move operation: remove from old parent, update, insert into new parent
          const existingItem = findItemInTree(data, draft.itemId!);
          if (existingItem) {
            data = deleteItemRecursively(data, draft.itemId!);
            const updatedItem = {
              ...existingItem,
              ...draft.data,
              children: existingItem.children,
            };
            if (draft.level === 'subcategory') {
              data = data.map((cat) =>
                cat.id === draft.newParentId
                  ? {
                      ...cat,
                      children: [...(cat.children || []), updatedItem],
                    }
                  : cat
              );
            } else if (draft.level === 'subdivision') {
              data = data.map((cat) => ({
                ...cat,
                children: cat.children?.map((sub) =>
                  sub.id === draft.newParentId
                    ? {
                        ...sub,
                        children: [...(sub.children || []), updatedItem],
                      }
                    : sub
                ),
              }));
            }
          }
        } else {
          data = updateItemRecursively(data, draft.itemId!, draft.data);
        }
        break;

      case 'delete':
        data = deleteItemRecursively(data, draft.itemId!);
        break;
    }
  }

  return data;
}

/**
 * Find item by ID in nested tree
 */
function findItemInTree(
  items: DatasetItem[],
  itemId: string
): DatasetItem | null {
  for (const item of items) {
    if (item.id === itemId) return item;
    if (item.children) {
      const found = findItemInTree(item.children, itemId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Recursively update item in taxonomy hierarchy
 */
function updateItemRecursively(
  items: DatasetItem[],
  itemId: string,
  newData: DatasetItem
): DatasetItem[] {
  return items.map((item) => {
    if (item.id === itemId) {
      return { ...item, ...newData };
    }
    if (item.children) {
      return {
        ...item,
        children: updateItemRecursively(item.children, itemId, newData),
      };
    }
    return item;
  });
}

/**
 * Recursively delete item from taxonomy hierarchy
 */
function deleteItemRecursively(items: DatasetItem[], itemId: string): DatasetItem[] {
  return items
    .filter((item) => item.id !== itemId)
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: deleteItemRecursively(item.children, itemId),
        };
      }
      return item;
    });
}

/**
 * Check if there are unsaved drafts
 */
export function hasDrafts(type?: TaxonomyType): boolean {
  return getDraftCount(type) > 0;
}

/**
 * Get draft summary for UI display
 */
export function getDraftSummary(): DraftSummary {
  const drafts = getDrafts();

  const byType: DraftSummary['byType'] = {
    'service-categories': 0,
    'service-subcategories': 0,
    'service-subdivisions': 0,
    'pro-categories': 0,
    'pro-subcategories': 0,
    tags: 0,
    skills: 0,
  };

  const byOperation = {
    create: 0,
    update: 0,
    delete: 0,
  };

  let oldestDraft: TaxonomyDraft | null = null;

  for (const draft of drafts) {
    byType[draft.taxonomyType]++;
    byOperation[draft.operation]++;

    if (!oldestDraft || draft.createdAt < oldestDraft.createdAt) {
      oldestDraft = draft;
    }
  }

  return {
    total: drafts.length,
    byType,
    byOperation,
    oldestDraft,
  };
}
