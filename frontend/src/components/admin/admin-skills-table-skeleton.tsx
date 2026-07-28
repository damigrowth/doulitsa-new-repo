import { GenericTableSkeleton, skeletonColumns } from './utils/table-skeleton-utils';

export function AdminSkillsTableSkeleton() {
  const columns = [
    skeletonColumns.id(),
    { ...skeletonColumns.label(), className: 'min-w-[220px]', skeletonClassName: 'h-4 w-36' },
    { ...skeletonColumns.slug(), className: 'min-w-[200px]', skeletonClassName: 'h-4 w-32' },
    skeletonColumns.category(),
    skeletonColumns.actions(),
  ];

  return <GenericTableSkeleton columns={columns} />;
}
