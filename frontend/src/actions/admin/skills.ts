
'use server';

import type { DatasetItem } from '@/lib/types/datasets';
import { createSkillSchema, updateSkillSchema, deleteSkillSchema } from '@/lib/validations/admin';
import {
  createItem,
  updateItem,
  deleteItem,
  type TaxonomyConfig,
} from './taxonomies-shared';
import type {
  TaxonomyActionResult,
  CreateItemResult,
  UpdateItemResult,
  DeleteItemResult,
} from '@/lib/types/taxonomy-operations';

const SKILLS_CONFIG: TaxonomyConfig = {
  type: 'skills',
  typeName: 'skill',
  basePath: '/admin/taxonomies/skills',
};

interface SkillItem extends DatasetItem {
  id: string;
  slug: string;
  label: string;
  category?: string;
}

/**
 * Core create function
 */
export async function createSkill(data: {
  label: string;
  slug: string;
  category?: string;
}): Promise<TaxonomyActionResult<CreateItemResult>> {
  return createItem(SKILLS_CONFIG, data);
}

/**
 * Core update function
 */
export async function updateSkill(data: {
  id: string;
  label: string;
  slug: string;
  category?: string;
}): Promise<TaxonomyActionResult<UpdateItemResult>> {
  return updateItem(SKILLS_CONFIG, data);
}

/**
 * Core delete function
 */
export async function deleteSkill(data: { id: string }): Promise<TaxonomyActionResult<DeleteItemResult>> {
  return deleteItem(SKILLS_CONFIG, data.id);
}

/**
 * FormData action wrappers for useActionState
 */
import { createCrudActions } from './action-wrappers';

const { createAction, updateAction, deleteAction } = createCrudActions({
  createSchema: createSkillSchema,
  updateSchema: updateSkillSchema,
  deleteSchema: deleteSkillSchema,
  createFn: createSkill,
  updateFn: updateSkill,
  deleteFn: (data) => deleteSkill({ id: data.id }),
  entityName: 'skill',
});

export {
  createAction as createSkillAction,
  updateAction as updateSkillAction,
  deleteAction as deleteSkillAction,
};
