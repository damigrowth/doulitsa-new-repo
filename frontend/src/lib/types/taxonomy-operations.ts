/**
 * Type-safe taxonomy operation system
 *
 * Uses discriminated unions to ensure type safety across
 * the Git-native taxonomy workflow (localStorage → Git → PR)
 */

import type { DatasetItem } from './datasets';

/**
 * Taxonomy types available in the system
 */
export type TaxonomyType =
  | 'service-categories'
  | 'service-subcategories'
  | 'service-subdivisions'
  | 'pro-categories'
  | 'pro-subcategories'
  | 'tags'
  | 'skills';

/**
 * Taxonomy hierarchy levels
 */
export type TaxonomyLevel =
  | 'category'
  | 'subcategory'
  | 'subdivision'
  | null;

/**
 * Base draft interface with common properties
 */
interface BaseDraft {
  id: string;
  taxonomyType: TaxonomyType;
  createdAt: number;
  updatedAt?: number;
}

/**
 * Create operation - adds new taxonomy item
 */
export interface CreateDraft extends BaseDraft {
  operation: 'create';
  data: DatasetItem;
  level: TaxonomyLevel;
  parentId: string | null;
}

/**
 * Update operation - modifies existing taxonomy item
 */
export interface UpdateDraft extends BaseDraft {
  operation: 'update';
  itemId: string;
  data: DatasetItem;
  previousData?: DatasetItem; // For rollback capability
  newParentId?: string | null; // Target parent ID when moving between parents
  level?: TaxonomyLevel; // Item level (subcategory/subdivision) for move operations
}

/**
 * Delete operation - removes taxonomy item
 */
export interface DeleteDraft extends BaseDraft {
  operation: 'delete';
  itemId: string;
  deletedData: DatasetItem; // Store for potential recovery
}

/**
 * Discriminated union of all draft types
 * Type-safe pattern matching guaranteed by TypeScript
 */
export type TaxonomyDraft = CreateDraft | UpdateDraft | DeleteDraft;

/**
 * Type guard for create operations
 */
export function isCreateDraft(draft: TaxonomyDraft): draft is CreateDraft {
  return draft.operation === 'create';
}

/**
 * Type guard for update operations
 */
export function isUpdateDraft(draft: TaxonomyDraft): draft is UpdateDraft {
  return draft.operation === 'update';
}

/**
 * Type guard for delete operations
 */
export function isDeleteDraft(draft: TaxonomyDraft): draft is DeleteDraft {
  return draft.operation === 'delete';
}

/**
 * Draft validation result
 */
export type DraftValidationResult =
  | { valid: true; draft: TaxonomyDraft }
  | { valid: false; errors: string[] };

/**
 * Grouped drafts by taxonomy type
 */
export type GroupedDrafts = Map<TaxonomyType, TaxonomyDraft[]>;

/**
 * Draft summary for UI display
 */
export interface DraftSummary {
  total: number;
  byType: Record<TaxonomyType, number>;
  byOperation: {
    create: number;
    update: number;
    delete: number;
  };
  oldestDraft?: {
    id: string;
    createdAt: number;
    taxonomyType: TaxonomyType;
  };
}

/**
 * Publish result with detailed type information
 */
export interface PublishResult {
  success: boolean;
  data?: {
    commitsCreated: number;
    commitShas: string[];
    prNumber?: number; // Optional - only when using PR workflow
    prUrl?: string; // Optional - only when using PR workflow
    publishedDrafts: TaxonomyDraft[];
    changeCount?: number; // Number of taxonomy types changed in batch commit
  };
  error?: {
    code: PublishErrorCode;
    message: string;
    recoverable: boolean;
    failedAt?: 'commit';
  };
}

/**
 * Publish error codes for specific handling
 */
export enum PublishErrorCode {
  NO_CHANGES = 'NO_CHANGES',
  SYNC_FAILED = 'SYNC_FAILED',
  COMMIT_FAILED = 'COMMIT_FAILED',
  PR_CREATE_FAILED = 'PR_CREATE_FAILED',
  PR_MERGE_FAILED = 'PR_MERGE_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Type-safe draft storage schema
 * Ensures localStorage serialization is typed correctly
 */
export interface DraftStorageSchema {
  version: '1.0.0';
  drafts: TaxonomyDraft[];
  metadata: {
    lastModified: number;
    totalOperations: number;
  };
}

/**
 * Server action result types
 */
export type TaxonomyActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Create operation result
 */
export interface CreateItemResult {
  item: DatasetItem;
  allItems: DatasetItem[];
}

/**
 * Update operation result
 */
export interface UpdateItemResult {
  item: DatasetItem;
  allItems: DatasetItem[];
  previousItem: DatasetItem;
}

/**
 * Delete operation result
 */
export interface DeleteItemResult {
  itemId: string;
  allItems: DatasetItem[];
  deletedItem: DatasetItem;
}
