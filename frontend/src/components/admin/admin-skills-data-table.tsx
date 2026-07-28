'use client';

import React from 'react';
import { AdminDataTable } from './admin-data-table';
import { columnRenderers } from './table-columns/column-renderers';
import { DatasetItem } from '@/lib/types/datasets';

interface AdminSkillsDataTableProps {
  data: DatasetItem[];
  categoryLookup?: Record<string, string>;
  loading?: boolean;
}

export function AdminSkillsDataTable({
  data,
  categoryLookup = {},
  loading = false,
}: AdminSkillsDataTableProps) {
  const basePath = '/admin/taxonomies/skills';

  const columns = [
    columnRenderers.id<DatasetItem>(),
    columnRenderers.label<DatasetItem>(basePath),
    columnRenderers.slug<DatasetItem>(),
    columnRenderers.categoryLookupFromMap<DatasetItem>('category', categoryLookup),
    columnRenderers.actionsIcon<DatasetItem>(basePath),
  ];

  return (
    <AdminDataTable
      data={data}
      columns={columns}
      loading={loading}
      basePath={basePath}
    />
  );
}
