'use client';

import React from 'react';
import { DatasetItem } from '@/lib/types/datasets';
import { AdminDataTable } from './admin-data-table';
import { columnRenderers } from './table-columns/column-renderers';

interface CategoryItem extends DatasetItem {
  subcategoryCount: number;
}

interface AdminCategoriesDataTableProps {
  data: CategoryItem[];
  loading?: boolean;
  basePath?: string;
}

export function AdminCategoriesDataTable({
  data,
  loading = false,
  basePath = '/admin/taxonomies/service',
}: AdminCategoriesDataTableProps) {
  const columns = [
    columnRenderers.imagePlaceholderAlt<CategoryItem>(),
    columnRenderers.id<CategoryItem>(),
    columnRenderers.label<CategoryItem>(`${basePath}/categories`),
    columnRenderers.slug<CategoryItem>(),
    columnRenderers.featured<CategoryItem>(),
    columnRenderers.count<CategoryItem>('subcategoryCount', 'Subcategories'),
    columnRenderers.actionsIcon<CategoryItem>(`${basePath}/categories`),
  ];

  return <AdminDataTable data={data} columns={columns} loading={loading} basePath={basePath} />;
}
