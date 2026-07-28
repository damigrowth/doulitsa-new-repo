/**
 * Type-safe taxonomy route builders
 *
 * Ensures compile-time safety for all taxonomy-related URLs
 * Prevents typos and broken links
 */

import type { TaxonomyType, TaxonomyLevel } from '@/lib/types/taxonomy-operations';

/**
 * Base taxonomy admin routes
 */
const TAXONOMY_BASE_ROUTES = {
  'service-categories': '/admin/taxonomies/service/categories',
  'service-subcategories': '/admin/taxonomies/service/subcategories',
  'service-subdivisions': '/admin/taxonomies/service/subdivisions',
  'pro-categories': '/admin/taxonomies/pro/categories',
  'pro-subcategories': '/admin/taxonomies/pro/subcategories',
  'tags': '/admin/taxonomies/tags',
  'skills': '/admin/taxonomies/skills',
} as const satisfies Record<TaxonomyType, string>;

/**
 * Get base route for taxonomy type
 */
export function getTaxonomyBaseRoute(type: TaxonomyType): string {
  return TAXONOMY_BASE_ROUTES[type];
}

/**
 * Get list/index route for taxonomy type
 */
export function getTaxonomyListRoute(type: TaxonomyType): string {
  return TAXONOMY_BASE_ROUTES[type];
}

/**
 * Get create route for taxonomy type
 */
export function getTaxonomyCreateRoute(type: TaxonomyType): string {
  return `${TAXONOMY_BASE_ROUTES[type]}/create`;
}

/**
 * Get edit route for specific taxonomy item
 */
export function getTaxonomyEditRoute(
  type: TaxonomyType,
  itemId: string
): string {
  return `${TAXONOMY_BASE_ROUTES[type]}/${itemId}`;
}

/**
 * Get parent route for creating child items
 */
export function getTaxonomyCreateChildRoute(
  type: TaxonomyType,
  parentId: string,
  level: 'subcategory' | 'subdivision'
): string {
  const base = TAXONOMY_BASE_ROUTES[type];

  // For service taxonomy
  if (type.startsWith('service-')) {
    if (level === 'subcategory') {
      return `/admin/taxonomies/service/subcategories/create?parent=${parentId}`;
    }
    if (level === 'subdivision') {
      return `/admin/taxonomies/service/subdivisions/create?parent=${parentId}`;
    }
  }

  // For pro taxonomy
  if (type.startsWith('pro-')) {
    if (level === 'subcategory') {
      return `/admin/taxonomies/pro/subcategories/create?parent=${parentId}`;
    }
  }

  return `${base}/create?parent=${parentId}`;
}

/**
 * Build search params for taxonomy filters
 */
export interface TaxonomyFilterParams {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Build query string from filter params
 */
export function buildTaxonomyQueryString(
  params: TaxonomyFilterParams
): string {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set('search', params.search);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.order) searchParams.set('order', params.order);

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * Get taxonomy list route with filters
 */
export function getTaxonomyListRouteWithFilters(
  type: TaxonomyType,
  filters: TaxonomyFilterParams
): string {
  const base = getTaxonomyListRoute(type);
  const query = buildTaxonomyQueryString(filters);
  return `${base}${query}`;
}

/**
 * Parse taxonomy type from pathname
 * Returns null if pathname doesn't match taxonomy pattern
 */
export function parseTaxonomyTypeFromPath(
  pathname: string
): TaxonomyType | null {
  // Check each taxonomy route pattern
  for (const [type, route] of Object.entries(TAXONOMY_BASE_ROUTES)) {
    if (pathname.startsWith(route)) {
      return type as TaxonomyType;
    }
  }

  return null;
}

/**
 * Check if pathname is a taxonomy route
 */
export function isTaxonomyRoute(pathname: string): boolean {
  return parseTaxonomyTypeFromPath(pathname) !== null;
}

/**
 * Extract item ID from edit route pathname
 * Returns null if pathname is not an edit route or ID cannot be extracted
 */
export function extractItemIdFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  // Check if last segment looks like an ID (not 'create' or other keywords)
  if (
    lastSegment &&
    lastSegment !== 'create' &&
    lastSegment !== 'edit' &&
    !lastSegment.includes('?')
  ) {
    return lastSegment;
  }

  return null;
}

/**
 * Breadcrumb item for taxonomy navigation
 */
export interface TaxonomyBreadcrumb {
  label: string;
  href: string;
  isActive?: boolean;
}

/**
 * Generate breadcrumbs for taxonomy page
 */
export function getTaxonomyBreadcrumbs(
  type: TaxonomyType,
  context: {
    isCreate?: boolean;
    isEdit?: boolean;
    itemLabel?: string;
  } = {}
): TaxonomyBreadcrumb[] {
  const breadcrumbs: TaxonomyBreadcrumb[] = [
    {
      label: 'Admin',
      href: '/admin',
    },
    {
      label: 'Taxonomies',
      href: '/admin/taxonomies',
    },
  ];

  // Add type-specific breadcrumb
  const typeLabel = getTaxonomyTypeLabel(type);
  breadcrumbs.push({
    label: typeLabel,
    href: getTaxonomyListRoute(type),
  });

  // Add context-specific breadcrumb
  if (context.isCreate) {
    breadcrumbs.push({
      label: 'Create',
      href: getTaxonomyCreateRoute(type),
      isActive: true,
    });
  } else if (context.isEdit && context.itemLabel) {
    breadcrumbs.push({
      label: context.itemLabel,
      href: '#',
      isActive: true,
    });
  }

  return breadcrumbs;
}

/**
 * Get human-readable label for taxonomy type
 */
export function getTaxonomyTypeLabel(type: TaxonomyType): string {
  const labels: Record<TaxonomyType, string> = {
    'service-categories': 'Service Categories',
    'service-subcategories': 'Service Subcategories',
    'service-subdivisions': 'Service Subdivisions',
    'pro-categories': 'Pro Categories',
    'pro-subcategories': 'Pro Subcategories',
    'tags': 'Tags',
    'skills': 'Skills',
  };

  return labels[type];
}

/**
 * Get file path for taxonomy type
 * Used by Git operations
 */
export function getTaxonomyFilePath(type: TaxonomyType): string {
  const filePaths: Record<TaxonomyType, string> = {
    'service-categories': 'src/constants/datasets/service-taxonomies.ts',
    'service-subcategories': 'src/constants/datasets/service-taxonomies.ts',
    'service-subdivisions': 'src/constants/datasets/service-taxonomies.ts',
    'pro-categories': 'src/constants/datasets/pro-taxonomies.ts',
    'pro-subcategories': 'src/constants/datasets/pro-taxonomies.ts',
    'tags': 'src/constants/datasets/tags.ts',
    'skills': 'src/constants/datasets/skills.ts',
  };

  return filePaths[type];
}

/**
 * Check if user can edit taxonomy
 * (Placeholder - integrate with actual auth system)
 */
export function canEditTaxonomy(type: TaxonomyType): boolean {
  // TODO: Integrate with Better Auth permissions
  return true;
}
