'use client';

import React from 'react';
import { DatasetItem } from '@/lib/types/datasets';
import { AdminDataTable } from './admin-data-table';
import { columnRenderers } from './table-columns/column-renderers';

interface SubcategoryItem extends DatasetItem {
  subdivisionCount: number;
  categoryLabel?: string;
}

interface AdminSubcategoriesDataTableProps {
  data: SubcategoryItem[];
  loading?: boolean;
  basePath?: string;
}

export function AdminSubcategoriesDataTable({
  data,
  loading = false,
  basePath = '/admin/taxonomies/service',
}: AdminSubcategoriesDataTableProps) {
  const columns = [
    columnRenderers.imagePlaceholderAlt<SubcategoryItem>(),
    columnRenderers.id<SubcategoryItem>(),
    columnRenderers.label<SubcategoryItem>(`${basePath}/subcategories`),
    columnRenderers.slug<SubcategoryItem>(),
    columnRenderers.text<SubcategoryItem>('categoryLabel', 'Category'),
    columnRenderers.count<SubcategoryItem>('subdivisionCount', 'Subdivisions'),
    columnRenderers.actionsIcon<SubcategoryItem>(`${basePath}/subcategories`),
  ];

  return <AdminDataTable data={data} columns={columns} loading={loading} basePath={basePath} />;
}
