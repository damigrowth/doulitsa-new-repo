'use client';

import React from 'react';
import { AdminDataTable } from './admin-data-table';
import { columnRenderers } from './table-columns/column-renderers';
import { DatasetItem } from '@/lib/types/datasets';

interface AdminTagsDataTableProps {
  data: DatasetItem[];
  loading?: boolean;
}

export function AdminTagsDataTable({
  data,
  loading = false,
}: AdminTagsDataTableProps) {
  const basePath = '/admin/taxonomies/tags';

  const columns = [
    columnRenderers.id<DatasetItem>(),
    columnRenderers.label<DatasetItem>(basePath),
    columnRenderers.slug<DatasetItem>(),
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
