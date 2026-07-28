/**
 * Taxonomy Tree Preview Builder
 *
 * Builds condensed JSON tree preview showing where new items will be inserted
 * in the taxonomy hierarchy, with visual highlighting via __highlight marker
 */

import type { DatasetItem } from './types/datasets';

type EllipsisMarker = { __ellipsis: true };
type CondensedItem = DatasetItem | EllipsisMarker;

/**
 * Simplify a dataset item by removing large nested objects
 * Keeps only essential fields for preview
 */
function simplifyItem(item: DatasetItem): Record<string, any> {
  const simplified: Record<string, any> = {
    id: item.id,
  };

  if (item.label) simplified.label = item.label;
  if (item.name) simplified.name = item.name;
  if (item.slug) simplified.slug = item.slug;

  // Don't include full image object, description, or other large fields
  // These make the preview too long and hard to read

  return simplified;
}

/**
 * Condense children array to show context around target item
 * Shows: [first few items] ... [context before target] [TARGET] [context after target] ...
 * If total children <= 5, shows all (no ellipsis)
 */
function condenseChildren(
  children: DatasetItem[],
  targetIndex: number,
  contextBefore: number = 2,
  contextAfter: number = 2
): CondensedItem[] {
  const totalChildren = children.length;

  // If small array, show everything
  if (totalChildren <= 5) {
    return children;
  }

  const result: CondensedItem[] = [];
  const ellipsis: EllipsisMarker = { __ellipsis: true };

  // For CREATE (target is at the end, doesn't exist yet)
  if (targetIndex === -1) {
    // Show first 2-3 items, then ellipsis
    result.push(...children.slice(0, Math.min(3, totalChildren)));
    if (totalChildren > 3) {
      result.push(ellipsis);
    }
    return result;
  }

  // For UPDATE/DELETE (target exists in array)
  const start = Math.max(0, targetIndex - contextBefore);
  const end = Math.min(totalChildren, targetIndex + contextAfter + 1);

  // Add leading ellipsis if not starting from beginning
  if (start > 0) {
    result.push(ellipsis);
  }

  // Add context around target
  result.push(...children.slice(start, end));

  // Add trailing ellipsis if not ending at the end
  if (end < totalChildren) {
    result.push(ellipsis);
  }

  return result;
}

/**
 * Build tree preview for CREATE operation
 * Shows parent with condensed children array including the new item
 */
export function buildCreateTreePreview(
  parentItem: DatasetItem | null,
  newItem: DatasetItem
): string {
  // Top-level item (no parent)
  if (!parentItem) {
    return JSON.stringify({ ...newItem, __highlight: 'create' }, null, 2);
  }

  // Build parent with children
  const preview: Record<string, any> = simplifyItem(parentItem);

  // Build condensed children array
  const children = parentItem.children || [];
  const condensed = condenseChildren(children, -1); // -1 for new item at end

  // Map condensed items and add new item at end
  preview.children = [
    ...condensed.map((item) =>
      '__ellipsis' in item ? item : simplifyItem(item as DatasetItem)
    ),
    {
      ...simplifyItem(newItem),
      __highlight: 'create', // Marker for highlighting
    },
  ];

  return JSON.stringify(preview, null, 2);
}

/**
 * Build tree preview for UPDATE operation
 * Shows the item in its parent context (if it has one)
 */
export function buildUpdateTreePreview(
  parentItem: DatasetItem | null,
  updatedItem: DatasetItem,
  itemId: string
): string {
  // Top-level item (no parent)
  if (!parentItem) {
    return JSON.stringify({ ...updatedItem, __highlight: 'update' }, null, 2);
  }

  // Build parent with children, highlighting the updated item
  const preview: Record<string, any> = simplifyItem(parentItem);

  const children = parentItem.children || [];
  const targetIndex = children.findIndex((child) => child.id === itemId);

  // Condense around target
  const condensed = condenseChildren(children, targetIndex);

  preview.children = condensed.map((item) => {
    if ('__ellipsis' in item) {
      return item;
    }

    const child = item as DatasetItem;
    if (child.id === itemId) {
      return {
        ...simplifyItem(updatedItem),
        __highlight: 'update', // Marker for highlighting
      };
    }
    return simplifyItem(child);
  });

  return JSON.stringify(preview, null, 2);
}

/**
 * Build tree preview for DELETE operation
 * Shows the item being removed from parent context
 */
export function buildDeleteTreePreview(
  parentItem: DatasetItem | null,
  deletedItem: DatasetItem,
  itemId: string
): string {
  // Top-level item (no parent)
  if (!parentItem) {
    return JSON.stringify({ ...deletedItem, __highlight: 'delete' }, null, 2);
  }

  // Build parent with children, marking the deleted item
  const preview: Record<string, any> = simplifyItem(parentItem);

  const children = parentItem.children || [];
  const targetIndex = children.findIndex((child) => child.id === itemId);

  // Condense around target
  const condensed = condenseChildren(children, targetIndex);

  preview.children = condensed.map((item) => {
    if ('__ellipsis' in item) {
      return item;
    }

    const child = item as DatasetItem;
    if (child.id === itemId) {
      return {
        ...simplifyItem(child),
        __highlight: 'delete', // Marker for highlighting
      };
    }
    return simplifyItem(child);
  });

  return JSON.stringify(preview, null, 2);
}

/**
 * Process JSON string for visual rendering
 * Replaces ellipsis markers and preserves __highlight for CSS-based styling
 */
export function processJsonForDisplay(jsonString: string): string {
  // Replace ellipsis objects with simple ...
  return jsonString.replace(/\{\s*"__ellipsis":\s*true\s*\}/g, '...');
}
