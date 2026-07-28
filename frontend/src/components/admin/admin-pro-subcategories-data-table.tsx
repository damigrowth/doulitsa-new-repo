'use client';

import React from 'react';
import { AdminDataTable } from './admin-data-table';
import { columnRenderers } from './table-columns/column-renderers';

interface ProSubcategory {
  id: string;
  label: string;
  slug: string;
  plural: string;
  description: string;
  type: 'freelancer' | 'company';
  parentId: string;
  parentLabel: string;
}

interface AdminProSubcategoriesDataTableProps {
  subcategories: ProSubcategory[];
  loading?: boolean;
}

export function AdminProSubcategoriesDataTable({
  subcategories,
  loading = false,
}: AdminProSubcategoriesDataTableProps) {
  const basePath = '/admin/taxonomies/pro/subcategories';

  const columns = [
    columnRenderers.id<ProSubcategory>(),
    columnRenderers.label<ProSubcategory>(basePath),
    columnRenderers.text<ProSubcategory>('plural', 'Plural'),
    columnRenderers.slug<ProSubcategory>(),
    columnRenderers.badge<ProSubcategory>('type', 'Type', 'outline'),
    columnRenderers.text<ProSubcategory>('parentLabel', 'Parent Category'),
    columnRenderers.actionsIcon<ProSubcategory>(basePath),
  ];

  return (
    <AdminDataTable
      data={subcategories}
      columns={columns}
      loading={loading}
      basePath={basePath}
    />
  );
}
