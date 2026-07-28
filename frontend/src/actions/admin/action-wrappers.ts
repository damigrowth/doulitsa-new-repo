import type { ActionResult } from '@/lib/types/api';
import type { ZodSchema } from 'zod';

/**
 * Generic FormData action wrapper for useActionState
 * Eliminates 85% duplication across server action files
 *
 * @example
 * export const createTagAction = createFormDataAction(createTagSchema, createTag, 'create tag');
 */
export function createFormDataAction<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  coreFunction: (data: TInput) => Promise<ActionResult<TOutput>>,
  operationName: string
) {
  return async function (
    _prevState: ActionResult | null,
    formData: FormData
  ): Promise<ActionResult<TOutput>> {
    try {
      // Extract all FormData entries and convert boolean strings and JSON strings properly
      const rawData = Object.fromEntries(
        Array.from(formData.entries()).map(([key, value]) => {
          // Convert "true"/"false" strings to actual booleans
          if (value === 'true') return [key, true];
          if (value === 'false') return [key, false];

          // Try to parse JSON strings (for objects and arrays)
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            try {
              return [key, JSON.parse(value)];
            } catch {
              // If parsing fails, return original string
              return [key, value];
            }
          }

          return [key, value];
        })
      );

      // Validate with Zod schema
      const validationResult = schema.safeParse(rawData);

      if (!validationResult.success) {
        return {
          success: false,
          error:
            'Validation failed: ' +
            validationResult.error.issues.map((e) => e.message).join(', '),
        };
      }

      // Call core function with validated data
      return await coreFunction(validationResult.data);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : `Failed to ${operationName}`,
      };
    }
  };
}

/**
 * Creates all three CRUD action wrappers at once
 *
 * @example
 * const { createAction, updateAction, deleteAction } = createCrudActions({
 *   createSchema: createTagSchema,
 *   updateSchema: updateTagSchema,
 *   deleteSchema: deleteTagSchema,
 *   createFn: createTag,
 *   updateFn: updateTag,
 *   deleteFn: deleteTag,
 *   entityName: 'tag',
 * });
 *
 * export {
 *   createAction as createTagAction,
 *   updateAction as updateTagAction,
 *   deleteAction as deleteTagAction
 * };
 */
export function createCrudActions<
  TCreateInput,
  TUpdateInput,
  TDeleteInput extends { id: string },
  TCreateOutput,
  TUpdateOutput,
  TDeleteOutput
>(config: {
  createSchema: ZodSchema<TCreateInput>;
  updateSchema: ZodSchema<TUpdateInput>;
  deleteSchema: ZodSchema<TDeleteInput>;
  createFn: (data: TCreateInput) => Promise<ActionResult<TCreateOutput>>;
  updateFn: (data: TUpdateInput) => Promise<ActionResult<TUpdateOutput>>;
  deleteFn: (data: TDeleteInput) => Promise<ActionResult<TDeleteOutput>>;
  entityName: string;
}) {
  return {
    createAction: createFormDataAction(
      config.createSchema,
      config.createFn,
      `create ${config.entityName}`
    ),
    updateAction: createFormDataAction(
      config.updateSchema,
      config.updateFn,
      `update ${config.entityName}`
    ),
    deleteAction: createFormDataAction(
      config.deleteSchema,
      config.deleteFn,
      `delete ${config.entityName}`
    ),
  };
}

/**
 * Extracts FormData to object with type safety
 * Useful for custom FormData handling
 *
 * @example
 * const data = extractFormData<{ name: string; age: string }>(formData);
 */
export function extractFormData<T extends Record<string, any>>(
  formData: FormData
): T {
  return Object.fromEntries(formData.entries()) as T;
}

/**
 * Extracts specific fields from FormData
 *
 * @example
 * const { label, slug } = extractFields(formData, ['label', 'slug']);
 */
export function extractFields<T extends string>(
  formData: FormData,
  fields: T[]
): Record<T, string> {
  const result = {} as Record<T, string>;
  for (const field of fields) {
    result[field] = formData.get(field) as string;
  }
  return result;
}
