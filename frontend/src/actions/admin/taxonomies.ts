'use server';

import { createServiceTaxonomySchema, updateServiceTaxonomySchema } from '@/lib/validations/admin';
import type { DatasetItem } from '@/lib/types/datasets';
import type { ActionResult } from '@/lib/types/api';
import type { CloudinaryResource } from '@/lib/types/cloudinary';
import { TaxonomyConfig, createItem, updateItem } from './taxonomies-shared';

const SERVICE_CONFIG: TaxonomyConfig = {
  type: 'service',
  typeName: 'service taxonomy',
  basePath: '/admin/taxonomies/service',
};

/**
 * Core create function - Creates a new taxonomy item in the file
 */
export async function createServiceTaxonomy(data: {
  label: string;
  slug: string;
  description: string;
  level: 'category' | 'subcategory' | 'subdivision';
  parentId?: string;
  featured?: boolean;
  icon?: string;
  image?: CloudinaryResource | null;
}) {
  const newItem: Omit<DatasetItem, 'id'> = {
    label: data.label,
    slug: data.slug,
    description: data.description,
    ...(data.level === 'category' && {
      featured: data.featured || false,
      icon: data.icon || '',
    }),
    ...(data.image ? { image: data.image } : {}),
  };

  // Write straight to the DB (createItem dispatches 'service' -> createServiceTax).
  return createItem(SERVICE_CONFIG, newItem, {
    level: data.level,
    parentId: data.parentId,
  });
}

/**
 * Core update function - Updates a taxonomy item in the file
 */
export async function updateServiceTaxonomy(data: {
  id: string;
  label: string;
  slug: string;
  description: string;
  level: 'category' | 'subcategory' | 'subdivision';
  parentId?: string;
  featured?: boolean;
  icon?: string;
  image?: CloudinaryResource | null;
}) {
  const item: DatasetItem = {
    id: data.id,
    label: data.label,
    slug: data.slug,
    description: data.description,
    ...(data.level === 'category' && {
      ...(data.featured !== undefined ? { featured: data.featured } : {}),
      ...(data.icon !== undefined ? { icon: data.icon || '' } : {}),
    }),
    ...(data.image !== undefined ? { image: data.image || undefined } : {}),
  };

  // Write straight to the DB (updateItem dispatches 'service' -> updateServiceTax).
  return updateItem(SERVICE_CONFIG, item);
}

/**
 * Server action wrappers for form submissions
 */
import { createFormDataAction } from './action-wrappers';

export const createServiceTaxonomyAction = createFormDataAction(
  createServiceTaxonomySchema,
  createServiceTaxonomy,
  'create service taxonomy'
);

export const updateServiceTaxonomyAction = createFormDataAction(
  updateServiceTaxonomySchema,
  updateServiceTaxonomy,
  'update service taxonomy'
);
