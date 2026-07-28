'use server';

import type { DatasetItem } from '@/lib/types/datasets';
import { getAdminSessionWithPermission } from './helpers';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import type {
  CreateItemResult,
  UpdateItemResult,
  DeleteItemResult,
  TaxonomyActionResult,
} from '@/lib/types/taxonomy-operations';
import { withLock } from '@/app/actions/taxonomy-lock';
import { adminTaxonomy } from '@/lib/api/admin';
import { revalidateTaxonomyCaches } from './revalidate-taxonomies';

/**
 * Configuration for taxonomy operations.
 * `type` is a string ('tags' | 'skills' | 'service' | 'pro') used to dispatch
 * to the matching admin DB endpoint.
 */
export interface TaxonomyConfig {
  type: string;
  typeName: string;
  basePath: string;
}

/**
 * Handle errors
 * Returns error shape compatible with TaxonomyActionResult
 */
function handleError(error: unknown): { success: false; error: string } {
  if (error instanceof Error) {
    if (error.message.includes('Unauthorized')) {
      return {
        success: false,
        error: 'You do not have permission to perform this action.',
      };
    }

    if (error.message.includes('locked')) {
      return {
        success: false,
        error: 'Another operation is in progress. Please try again in a few seconds.',
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: false,
    error: 'An unexpected error occurred. Please try again.',
  };
}

/**
 * Create a new taxonomy item.
 *
 * Writes straight to the DB via the admin API — the backend assigns the id and
 * a unique slug. Returns the created item (`allItems` is unused here, kept for
 * the shared action result shape).
 */
export async function createItem(
  config: TaxonomyConfig,
  data: Omit<DatasetItem, 'id'>,
  hierarchyInfo?: {
    level?: 'category' | 'subcategory' | 'subdivision';
    parentId?: string;
  }
): Promise<TaxonomyActionResult<CreateItemResult>> {
  try {
    await getAdminSessionWithPermission(ADMIN_RESOURCES.TAXONOMIES, 'edit');

    const d = data as DatasetItem;
    const created = (await withLock(`${config.type}-create`, async () => {
      // Write straight to the DB. The backend generates a unique id + slug.
      if (config.type === 'tags') {
        return adminTaxonomy.createTag({ label: d.label, slug: d.slug });
      }
      if (config.type === 'skills') {
        return adminTaxonomy.createSkill({ label: d.label, slug: d.slug, category: d.category });
      }
      const payload = {
        label: d.label,
        slug: d.slug,
        description: d.description,
        level: hierarchyInfo?.level ?? 'category',
        parentId: hierarchyInfo?.parentId,
        featured: d.featured,
        icon: d.icon,
        image: d.image,
        plural: d.plural,
        type: d.type,
      };
      if (config.type === 'service') return adminTaxonomy.createServiceTax(payload);
      if (config.type === 'pro') return adminTaxonomy.createProTax(payload);
      throw new Error(`Unknown taxonomy type: ${config.type}`);
    })) as { id: string; slug?: string };

    await revalidateTaxonomyCaches();

    return {
      success: true,
      data: {
        item: { ...d, id: created.id, slug: created.slug ?? d.slug } as DatasetItem,
        allItems: [],
      },
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Update an existing taxonomy item directly in the DB via the admin API.
 */
export async function updateItem(
  config: TaxonomyConfig,
  data: DatasetItem
): Promise<TaxonomyActionResult<UpdateItemResult>> {
  try {
    await getAdminSessionWithPermission(ADMIN_RESOURCES.TAXONOMIES, 'edit');

    await withLock(`${config.type}-update`, async () => {
      if (config.type === 'tags') {
        return adminTaxonomy.updateTag(data.id, { label: data.label, slug: data.slug });
      }
      if (config.type === 'skills') {
        return adminTaxonomy.updateSkill(data.id, { label: data.label, slug: data.slug, category: data.category });
      }
      const payload = {
        label: data.label,
        slug: data.slug,
        description: data.description,
        featured: data.featured,
        icon: data.icon,
        image: data.image,
        plural: data.plural,
        type: data.type,
      };
      if (config.type === 'service') return adminTaxonomy.updateServiceTax(data.id, payload);
      if (config.type === 'pro') return adminTaxonomy.updateProTax(data.id, payload);
      throw new Error(`Unknown taxonomy type: ${config.type}`);
    });

    await revalidateTaxonomyCaches();

    return {
      success: true,
      data: {
        item: data,
        allItems: [],
        previousItem: data,
      },
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Delete a taxonomy item directly in the DB via the admin API.
 * Service/pro nodes delete recursively (subtree), refused while referenced.
 */
export async function deleteItem(
  config: TaxonomyConfig,
  id: string
): Promise<TaxonomyActionResult<DeleteItemResult>> {
  try {
    await getAdminSessionWithPermission(ADMIN_RESOURCES.TAXONOMIES, 'edit');

    await withLock(`${config.type}-delete`, async () => {
      if (config.type === 'tags') return adminTaxonomy.deleteTag(id);
      if (config.type === 'skills') return adminTaxonomy.deleteSkill(id);
      // Recursive node delete (OLD deleteItemRecursively) — Django refuses
      // with a Greek error when live rows still reference the subtree.
      if (config.type === 'service') return adminTaxonomy.deleteServiceTax(id);
      if (config.type === 'pro') return adminTaxonomy.deleteProTax(id);
      throw new Error(`Delete is not supported for ${config.typeName}`);
    });

    await revalidateTaxonomyCaches();

    return {
      success: true,
      data: {
        itemId: id,
        allItems: [],
        deletedItem: { id } as DatasetItem,
      },
    };
  } catch (error) {
    return handleError(error);
  }
}
