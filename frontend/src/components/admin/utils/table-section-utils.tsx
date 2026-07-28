import { ReactNode } from 'react';
import AdminTablePagination from '../admin-table-pagination';

/**
 * Generic table section utilities for admin tables
 * Eliminates ~70-80% duplication across 13 table section files
 */

export interface BaseSearchParams {
  search?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | undefined;
}

export interface TableSectionConfig<T> {
  data: T[];
  searchParams: BaseSearchParams;
  basePath: string;
  defaultSortBy?: string;
  defaultLimit?: number;
  filterFn?: (item: T, params: BaseSearchParams) => boolean;
  sortFn?: (a: T, b: T, sortBy: string) => number;
}

export interface TableSectionResult<T> {
  paginatedData: T[];
  totalPages: number;
  currentPage: number;
  currentLimit: number;
}

/**
 * Generic function to process table data with filtering, sorting, and pagination
 */
export function processTableData<T>(config: TableSectionConfig<T>): TableSectionResult<T> {
  const {
    data,
    searchParams,
    defaultSortBy = 'label',
    defaultLimit = 12,
    filterFn,
    sortFn,
  } = config;

  const page = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || defaultLimit.toString());
  const sortBy = searchParams.sortBy || defaultSortBy;
  const sortOrder = searchParams.sortOrder || 'asc';

  // Filter data
  let filteredData = [...data];
  if (filterFn) {
    filteredData = filteredData.filter((item) => filterFn(item, searchParams));
  }

  // Sort data
  if (sortFn) {
    filteredData.sort((a, b) => {
      const comparison = sortFn(a, b, sortBy);
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  // Calculate pagination
  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return {
    paginatedData,
    totalPages,
    currentPage: page,
    currentLimit: limit,
  };
}

/**
 * Generic component wrapper for table sections with pagination
 */
interface TableSectionWrapperProps {
  children: ReactNode;
  totalPages: number;
  currentPage: number;
  currentLimit: number;
  basePath: string;
}

export function TableSectionWrapper({
  children,
  totalPages,
  currentPage,
  currentLimit,
  basePath,
}: TableSectionWrapperProps) {
  return (
    <>
      {children}
      {totalPages > 1 && (
        <AdminTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          currentLimit={currentLimit}
          basePath={basePath}
        />
      )}
    </>
  );
}

/**
 * Standard search filter function for items with label and slug
 */
export function standardSearchFilter<T extends { id?: string | number; label?: string; slug?: string }>(
  item: T,
  params: BaseSearchParams
): boolean {
  const { search } = params;
  if (!search) return true;

  const searchLower = search.toLowerCase();
  const id = String(item.id ?? '').toLowerCase();
  const label = item.label?.toLowerCase() || '';
  const slug = item.slug?.toLowerCase() || '';

  // Match by id too, so admins can look a record up by its numeric id
  // (e.g. searching "1336" to find a just-approved tag).
  return id.includes(searchLower) || label.includes(searchLower) || slug.includes(searchLower);
}

/**
 * Standard sort function for common fields
 */
export function standardSortFn<T extends Record<string, any>>(
  a: T,
  b: T,
  sortBy: string
): number {
  if (sortBy === 'id') {
    const idA = typeof a.id === 'string' ? parseInt(a.id) : a.id;
    const idB = typeof b.id === 'string' ? parseInt(b.id) : b.id;
    return idA - idB;
  }

  const valueA = a[sortBy];
  const valueB = b[sortBy];

  if (typeof valueA === 'string' && typeof valueB === 'string') {
    return valueA.localeCompare(valueB);
  }

  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return valueA - valueB;
  }

  return 0;
}

/**
 * Helper to combine multiple filter functions
 */
export function combineFilters<T>(
  ...filters: Array<(item: T, params: BaseSearchParams) => boolean>
) {
  return (item: T, params: BaseSearchParams) => {
    return filters.every((filter) => filter(item, params));
  };
}
