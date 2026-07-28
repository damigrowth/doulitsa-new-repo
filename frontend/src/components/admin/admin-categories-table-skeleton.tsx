import { GenericTableSkeleton, skeletonColumns } from './utils/table-skeleton-utils';

export function AdminCategoriesTableSkeleton() {
  const columns = [
    skeletonColumns.image(),
    skeletonColumns.id(),
    skeletonColumns.label(),
    skeletonColumns.slug(),
    skeletonColumns.featured(),
    skeletonColumns.count('Subcategories'),
    skeletonColumns.actions(),
  ];

  return <GenericTableSkeleton columns={columns} rowCount={5} />;
}
