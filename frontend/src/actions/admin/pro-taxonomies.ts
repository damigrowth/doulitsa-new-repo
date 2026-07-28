'use server';

import { createProTaxonomySchema, updateProTaxonomySchema } from '@/lib/validations/admin';
import type { DatasetItem } from '@/lib/types/datasets';
import { TaxonomyConfig, createItem, updateItem } from './taxonomies-shared';

const PRO_CONFIG: TaxonomyConfig = {
  type: 'pro',
  typeName: 'pro taxonomy',
  basePath: '/admin/taxonomies/pro',
};

/**
 * Core create function - Creates a new pro taxonomy item in the file
 */
export async function createProTaxonomy(data: {
  label: string;
  slug: string;
  plural: string;
  description: string;
  level: 'category' | 'subcategory';
  parentId?: string;
  type?: 'freelancer' | 'company';
}) {
  const newItem: Omit<DatasetItem, 'id'> = {
    label: data.label,
    slug: data.slug,
    plural: data.plural,
    description: data.description,
    ...(data.level === 'subcategory' ? { type: data.type || 'freelancer' } : {}),
  };

  // Write straight to the DB (createItem dispatches 'pro' -> createProTax).
  return createItem(PRO_CONFIG, newItem, {
    level: data.level,
    parentId: data.parentId,
  });
}

/**
 * Core update function - Updates a pro taxonomy item in the file
 */
export async function updateProTaxonomy(data: {
  id: string;
  label: string;
  slug: string;
  plural: string;
  description: string;
  level: 'category' | 'subcategory';
  parentId?: string;
  type?: 'freelancer' | 'company';
}) {
  const item: DatasetItem = {
    id: data.id,
    label: data.label,
    slug: data.slug,
    plural: data.plural,
    description: data.description,
    ...(data.level === 'subcategory' ? { type: data.type || 'freelancer' } : {}),
  };

  // Write straight to the DB (updateItem dispatches 'pro' -> updateProTax).
  return updateItem(PRO_CONFIG, item);
}

/**
 * Server action wrappers for form submissions
 */
import { createFormDataAction } from './action-wrappers';

export const createProTaxonomyAction = createFormDataAction(
  createProTaxonomySchema,
  createProTaxonomy,
  'create pro taxonomy'
);

export const updateProTaxonomyAction = createFormDataAction(
  updateProTaxonomySchema,
  updateProTaxonomy,
  'update pro taxonomy'
);
