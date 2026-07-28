import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Generic table skeleton utilities for admin tables
 * Eliminates ~95% duplication across 13 table skeleton files
 */

export interface TableSkeletonColumn {
  header: string;
  className?: string;
  skeletonClassName?: string;
}

export interface TableSkeletonProps {
  columns: TableSkeletonColumn[];
  rowCount?: number;
}

/**
 * Generic table skeleton component
 */
export function GenericTableSkeleton({ columns, rowCount = 10 }: TableSkeletonProps) {
  return (
    <div className='space-y-4'>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className={column.skeletonClassName || 'h-4 w-24'} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Standard column definitions for common skeleton patterns
 */
export const skeletonColumns = {
  id: (): TableSkeletonColumn => ({
    header: 'ID',
    className: 'w-[80px]',
    skeletonClassName: 'h-4 w-12',
  }),

  label: (): TableSkeletonColumn => ({
    header: 'Label',
    className: 'min-w-[250px]',
    skeletonClassName: 'h-4 w-40',
  }),

  slug: (): TableSkeletonColumn => ({
    header: 'Slug',
    className: 'min-w-[220px]',
    skeletonClassName: 'h-4 w-36',
  }),

  category: (): TableSkeletonColumn => ({
    header: 'Category',
    className: 'min-w-[160px]',
    skeletonClassName: 'h-5 w-24',
  }),

  parent: (): TableSkeletonColumn => ({
    header: 'Parent',
    className: 'min-w-[180px]',
    skeletonClassName: 'h-5 w-28',
  }),

  image: (): TableSkeletonColumn => ({
    header: 'Image',
    className: 'w-[80px]',
    skeletonClassName: 'h-12 w-12',
  }),

  count: (header: string): TableSkeletonColumn => ({
    header,
    className: 'w-[120px]',
    skeletonClassName: 'h-4 w-8',
  }),

  type: (): TableSkeletonColumn => ({
    header: 'Type',
    className: 'w-[120px]',
    skeletonClassName: 'h-5 w-20',
  }),

  featured: (): TableSkeletonColumn => ({
    header: 'Featured',
    className: 'w-[100px]',
    skeletonClassName: 'h-4 w-4',
  }),

  actions: (): TableSkeletonColumn => ({
    header: 'Actions',
    className: 'w-[100px]',
    skeletonClassName: 'h-8 w-8',
  }),
};
