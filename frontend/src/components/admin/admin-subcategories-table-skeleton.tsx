import { GenericTableSkeleton, skeletonColumns } from './utils/table-skeleton-utils';

export function AdminSubcategoriesTableSkeleton() {
  const columns = [
    { ...skeletonColumns.image(), skeletonClassName: 'h-12 w-16 rounded' },
    skeletonColumns.id(),
    skeletonColumns.label(),
    skeletonColumns.slug(),
    { ...skeletonColumns.category(), skeletonClassName: 'h-4 w-36' },
    skeletonColumns.count('Subdivisions'),
    skeletonColumns.actions(),
  ];

  return <GenericTableSkeleton columns={columns} rowCount={5} />;
}
