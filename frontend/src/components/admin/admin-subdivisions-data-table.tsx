'use client';

import React from 'react';
import { DatasetItem } from '@/lib/types/datasets';
import { AdminDataTable, ColumnDef } from './admin-data-table';
import { columnRenderers } from './table-columns/column-renderers';
import TableMedia from '@/components/shared/table-media';
import type { CloudinaryResource } from '@/lib/types/cloudinary';

interface SubdivisionItem extends DatasetItem {
  categoryLabel?: string;
  subcategoryLabel?: string;
  image?: CloudinaryResource;
}

interface AdminSubdivisionsDataTableProps {
  data: SubdivisionItem[];
  loading?: boolean;
  basePath?: string;
}

export function AdminSubdivisionsDataTable({
  data,
  loading = false,
  basePath = '/admin/taxonomies/service',
}: AdminSubdivisionsDataTableProps) {
  // Custom image column (TableMedia component)
  const imageColumn: ColumnDef<SubdivisionItem> = {
    key: 'image',
    header: 'Image',
    className: 'w-[80px]',
    render: (subdivision) => (
      <TableMedia media={subdivision.image ? [subdivision.image] : []} />
    ),
  };

  const columns = [
    imageColumn,
    columnRenderers.id<SubdivisionItem>(),
    columnRenderers.label<SubdivisionItem>(`${basePath}/subdivisions`),
    columnRenderers.slug<SubdivisionItem>(),
    columnRenderers.text<SubdivisionItem>('categoryLabel', 'Category'),
    columnRenderers.text<SubdivisionItem>('subcategoryLabel', 'Subcategory'),
    columnRenderers.actionsIcon<SubdivisionItem>(`${basePath}/subdivisions`),
  ];

  return <AdminDataTable data={data} columns={columns} loading={loading} basePath={basePath} />;
}
