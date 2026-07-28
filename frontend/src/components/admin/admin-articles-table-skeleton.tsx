import {
  GenericTableSkeleton,
  skeletonColumns,
} from './utils/table-skeleton-utils';

export function AdminArticlesTableSkeleton() {
  return (
    <GenericTableSkeleton
      columns={[
        {
          header: 'Τίτλος',
          className: 'max-w-[400px]',
          skeletonClassName: 'h-4 w-48',
        },
        skeletonColumns.category(),
        {
          header: 'Κατάσταση',
          className: 'w-[120px]',
          skeletonClassName: 'h-5 w-5',
        },
        {
          header: 'Ημ/νία Δημιουργίας',
          skeletonClassName: 'h-4 w-20',
        },
        skeletonColumns.actions(),
      ]}
      rowCount={5}
    />
  );
}
