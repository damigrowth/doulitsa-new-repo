/**
 * Runtime validation for taxonomy drafts
 *
 * Provides Zod schemas for type-safe validation of draft operations
 * before localStorage storage and Git commits
 */

import { z } from 'zod';
import type {
  TaxonomyDraft,
  CreateDraft,
  UpdateDraft,
  DeleteDraft,
  DraftValidationResult,
  TaxonomyType,
  DraftStorageSchema,
} from '@/lib/types/taxonomy-operations';

/**
 * Taxonomy type enum for Zod validation
 */
const taxonomyTypeSchema = z.enum([
  'service-categories',
  'service-subcategories',
  'service-subdivisions',
  'pro-categories',
  'pro-subcategories',
  'tags',
  'skills',
]);

/**
 * Taxonomy level enum
 */
const taxonomyLevelSchema = z.enum([
  'category',
  'subcategory',
  'subdivision',
]).nullable();

/**
 * DatasetItem schema (simplified - extend as needed)
 */
const datasetItemSchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .regex(
      /^[a-zA-Z0-9_-]{6}$|^\d+$/,
      'ID must be 6-char nanoid (service/pro) or numeric (skills/tags)'
    ),
  label: z.string().min(1),
  slug: z.string().min(1),
  children: z.array(z.any()).optional(),
}).passthrough(); // Allow additional properties

/**
 * Base draft schema with common validations
 */
const baseDraftSchema = z.object({
  id: z.string().uuid(),
  taxonomyType: taxonomyTypeSchema,
  createdAt: z.number().positive(),
  updatedAt: z.number().positive().optional(),
});

/**
 * Create draft schema
 */
const createDraftSchema = baseDraftSchema.extend({
  operation: z.literal('create'),
  data: datasetItemSchema,
  level: taxonomyLevelSchema,
  parentId: z.string().nullable(),
});

/**
 * Update draft schema
 */
const updateDraftSchema = baseDraftSchema.extend({
  operation: z.literal('update'),
  itemId: z.string().min(1),
  data: datasetItemSchema,
  previousData: datasetItemSchema.optional(),
  newParentId: z.string().nullable().optional(),
  level: taxonomyLevelSchema.optional(),
});

/**
 * Delete draft schema
 */
const deleteDraftSchema = baseDraftSchema.extend({
  operation: z.literal('delete'),
  itemId: z.string().min(1),
  deletedData: datasetItemSchema,
});

/**
 * Discriminated union draft schema
 */
export const taxonomyDraftSchema = z.discriminatedUnion('operation', [
  createDraftSchema,
  updateDraftSchema,
  deleteDraftSchema,
]);

/**
 * Draft storage schema for localStorage
 */
export const draftStorageSchema = z.object({
  version: z.literal('1.0.0'),
  drafts: z.array(taxonomyDraftSchema),
  metadata: z.object({
    lastModified: z.number().positive(),
    totalOperations: z.number().nonnegative(),
  }),
});

/**
 * Validate a single draft
 *
 * @param draft - Draft object to validate
 * @returns Validation result with typed draft or errors
 */
export function validateDraft(draft: unknown): DraftValidationResult {
  const result = taxonomyDraftSchema.safeParse(draft);

  if (result.success) {
    return {
      valid: true,
      draft: result.data as TaxonomyDraft,
    };
  }

  return {
    valid: false,
    errors: result.error.issues.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    ),
  };
}

/**
 * Validate draft storage structure
 *
 * @param storage - localStorage data to validate
 * @returns Parsed and validated storage or null
 */
export function validateDraftStorage(
  storage: unknown
): z.infer<typeof draftStorageSchema> | null {
  const result = draftStorageSchema.safeParse(storage);
  return result.success ? result.data : null;
}

/**
 * Type-safe draft creation helper
 *
 * Ensures all required fields are present and valid
 */
export function createDraftData(
  taxonomyType: TaxonomyType,
  operation: 'create',
  data: {
    data: unknown;
    level: string | null;
    parentId: string | null;
  }
): CreateDraft;

export function createDraftData(
  taxonomyType: TaxonomyType,
  operation: 'update',
  data: {
    itemId: string;
    data: unknown;
    previousData?: unknown;
    newParentId?: string | null;
    level?: string | null;
  }
): UpdateDraft;

export function createDraftData(
  taxonomyType: TaxonomyType,
  operation: 'delete',
  data: {
    itemId: string;
    deletedData: unknown;
  }
): DeleteDraft;

export function createDraftData(
  taxonomyType: TaxonomyType,
  operation: 'create' | 'update' | 'delete',
  data: any
): TaxonomyDraft {
  const baseData = {
    id: crypto.randomUUID(),
    taxonomyType,
    createdAt: Date.now(),
  };

  switch (operation) {
    case 'create':
      // Validate ID format for taxonomy type
      const validation = validateIdForTaxonomyType(
        (data.data as any).id,
        taxonomyType
      );
      if (!validation.valid) {
        throw new Error(
          `Invalid ID format for ${taxonomyType}: "${(data.data as any).id}". Expected: ${validation.expected}`
        );
      }

      // Prevent circular reference (item cannot be its own parent)
      if (data.parentId && data.parentId === (data.data as any).id) {
        throw new Error(
          `Circular reference detected: Item cannot be its own parent (ID: "${data.parentId}")`
        );
      }

      return createDraftSchema.parse({
        ...baseData,
        operation: 'create',
        data: data.data,
        level: data.level,
        parentId: data.parentId,
      }) as TaxonomyDraft;

    case 'update':
      return updateDraftSchema.parse({
        ...baseData,
        operation: 'update',
        itemId: data.itemId,
        data: data.data,
        previousData: data.previousData,
        ...(data.newParentId !== undefined && { newParentId: data.newParentId }),
        ...(data.level !== undefined && { level: data.level }),
      }) as TaxonomyDraft;

    case 'delete':
      return deleteDraftSchema.parse({
        ...baseData,
        operation: 'delete',
        itemId: data.itemId,
        deletedData: data.deletedData,
      });
  }
}

/**
 * Sanitize drafts array
 * Removes invalid drafts and returns only valid ones
 *
 * @param drafts - Array of draft objects
 * @returns Tuple of [valid drafts, invalid count]
 */
export function sanitizeDrafts(
  drafts: unknown[]
): [TaxonomyDraft[], number] {
  const validDrafts: TaxonomyDraft[] = [];
  let invalidCount = 0;

  for (const draft of drafts) {
    const validation = validateDraft(draft);
    if (validation.valid) {
      validDrafts.push(validation.draft);
    } else {
      invalidCount++;
      console.warn('Invalid draft filtered out:',
        'errors' in validation ? validation.errors : 'Unknown validation error');
    }
  }

  return [validDrafts, invalidCount];
}

/**
 * Merge draft operations
 * Collapses redundant operations (e.g., create + update = create with final data)
 *
 * @param drafts - Array of drafts to merge
 * @returns Optimized draft array
 */
export function mergeDraftOperations(
  drafts: TaxonomyDraft[]
): TaxonomyDraft[] {
  const mergedMap = new Map<string, TaxonomyDraft>();

  for (const draft of drafts) {
    const key = draft.operation === 'create'
      ? `${draft.taxonomyType}:${draft.data.id}`
      : `${draft.taxonomyType}:${draft.itemId}`;

    const existing = mergedMap.get(key);

    if (!existing) {
      mergedMap.set(key, draft);
      continue;
    }

    // Merge logic: create + update = create with updated data
    if (existing.operation === 'create' && draft.operation === 'update') {
      mergedMap.set(key, {
        ...existing,
        data: draft.data,
        updatedAt: draft.createdAt,
      });
      continue;
    }

    // Create + delete = remove both (item never existed)
    if (existing.operation === 'create' && draft.operation === 'delete') {
      mergedMap.delete(key);
      continue;
    }

    // Update + update = keep latest, preserve move info
    if (existing.operation === 'update' && draft.operation === 'update') {
      mergedMap.set(key, {
        ...draft,
        previousData: existing.previousData,
        newParentId: draft.newParentId ?? existing.newParentId,
        level: draft.level ?? existing.level,
      });
      continue;
    }

    // Update + delete = delete with original data
    if (existing.operation === 'update' && draft.operation === 'delete') {
      mergedMap.set(key, draft);
      continue;
    }

    // Default: keep latest
    mergedMap.set(key, draft);
  }

  return Array.from(mergedMap.values());
}

/**
 * Validate ID format for taxonomy type
 *
 * Enforces taxonomy-specific ID format rules:
 * - Service/Pro taxonomies (all categories, subcategories, subdivisions): 6-char nanoid
 * - Skills/Tags: numeric ID
 *
 * @param id - ID to validate
 * @param taxonomyType - Taxonomy type
 * @returns Validation result with expected format if invalid
 */
export function validateIdForTaxonomyType(
  id: string,
  taxonomyType: TaxonomyType
): { valid: boolean; expected?: string } {
  const nanoidTaxonomies = [
    'service-categories',
    'service-subcategories',
    'service-subdivisions',
    'pro-categories',
    'pro-subcategories',
  ];
  const numericTaxonomies = ['skills', 'tags'];

  if (nanoidTaxonomies.includes(taxonomyType)) {
    const valid = /^[a-zA-Z0-9_-]{6}$/.test(id);
    return { valid, expected: '6-char nanoid (e.g., "qWYlwq")' };
  } else if (numericTaxonomies.includes(taxonomyType)) {
    const valid = /^\d+$/.test(id);
    return { valid, expected: 'numeric ID (e.g., "123")' };
  }

  return { valid: false };
}
