import { GenericTableSkeleton, skeletonColumns } from './utils/table-skeleton-utils';

export function AdminProCategoriesTableSkeleton() {
  const columns = [
    { ...skeletonColumns.id(), className: 'w-[50px]', skeletonClassName: 'h-4 w-8' },
    { header: 'Name', className: '', skeletonClassName: 'h-4 w-[180px]' },
    { header: 'Plural', className: '', skeletonClassName: 'h-4 w-[160px]' },
    { ...skeletonColumns.slug(), skeletonClassName: 'h-4 w-[150px]' },
    { ...skeletonColumns.count('Subcategories'), className: 'text-center', skeletonClassName: 'mx-auto h-6 w-6 rounded-full' },
    { ...skeletonColumns.actions(), className: 'text-right', skeletonClassName: 'ml-auto h-8 w-8' },
  ];

  return <GenericTableSkeleton columns={columns} />;
}
