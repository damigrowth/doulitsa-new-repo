import { GenericTableSkeleton, skeletonColumns } from './utils/table-skeleton-utils';

export function AdminTagsTableSkeleton() {
  const columns = [
    skeletonColumns.id(),
    skeletonColumns.label(),
    skeletonColumns.slug(),
    skeletonColumns.actions(),
  ];

  return <GenericTableSkeleton columns={columns} />;
}
