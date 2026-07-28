'use client';

import React from 'react';
import { AdminDataTable } from './admin-data-table';
import { columnRenderers } from './table-columns/column-renderers';

interface ProCategory {
  id: string;
  label: string;
  slug: string;
  plural: string;
  description: string;
  childCount: number;
}

interface AdminProCategoriesDataTableProps {
  categories: ProCategory[];
  loading?: boolean;
}

export function AdminProCategoriesDataTable({
  categories,
  loading = false,
}: AdminProCategoriesDataTableProps) {
  const basePath = '/admin/taxonomies/pro/categories';

  const columns = [
    columnRenderers.id<ProCategory>(),
    columnRenderers.label<ProCategory>(basePath),
    columnRenderers.text<ProCategory>('plural', 'Plural'),
    columnRenderers.slug<ProCategory>(),
    columnRenderers.count<ProCategory>('childCount', 'Subcategories'),
    columnRenderers.actionsIcon<ProCategory>(basePath),
  ];

  return (
    <AdminDataTable
      data={categories}
      columns={columns}
      loading={loading}
      basePath={basePath}
    />
  );
}
