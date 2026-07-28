'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { NextLink } from '@/components';

// Column definition type
export interface ColumnDef<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

// Table props
interface AdminDataTableProps<T = any> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  basePath: string; // For sorting navigation
  editPath?: (row: T) => string; // Optional edit link
  emptyMessage?: string;
  skeletonRows?: number;
}

// Sortable header component
function SortableHeader({
  field,
  children,
  className,
  basePath,
}: {
  field: string;
  children: React.ReactNode;
  className?: string;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSortBy = searchParams.get('sortBy') || 'createdAt';
  const currentSortOrder = searchParams.get('sortOrder') || 'desc';
  const isActive = currentSortBy === field;

  const handleSort = () => {
    const params = new URLSearchParams(searchParams);
    const newOrder = isActive && currentSortOrder === 'asc' ? 'desc' : 'asc';
    params.set('sortBy', field);
    params.set('sortOrder', newOrder);
    params.set('page', '1');
    router.push(`${basePath}?${params.toString()}`);
  };

  const getSortIcon = () => {
    if (!isActive) return <ArrowUpDown className='w-4 h-4' />;
    return currentSortOrder === 'asc' ? (
      <ArrowUp className='w-4 h-4' />
    ) : (
      <ArrowDown className='w-4 h-4' />
    );
  };

  return (
    <TableHead className={cn('cursor-pointer select-none', className)}>
      <Button
        variant='ghost'
        size='sm'
        onClick={handleSort}
        className={cn(
          'h-auto p-0 font-semibold text-base text-left justify-start gap-2 hover:bg-transparent',
          isActive && 'text-primary',
        )}
      >
        {children}
        {getSortIcon()}
      </Button>
    </TableHead>
  );
}

// Loading skeleton row
function TableRowSkeleton({ columnsCount }: { columnsCount: number }) {
  return (
    <TableRow>
      {Array.from({ length: columnsCount }).map((_, index) => (
        <TableCell key={index} className='px-4'>
          <Skeleton className='h-8 w-full' />
        </TableCell>
      ))}
    </TableRow>
  );
}

// Main table component
export function AdminDataTable<T extends { id: string | number }>({
  data,
  columns,
  loading = false,
  basePath,
  editPath,
  emptyMessage = 'No data found matching your criteria.',
  skeletonRows = 5,
}: AdminDataTableProps<T>) {
  // Add actions column if editPath is provided
  const displayColumns: ColumnDef<T>[] = editPath
    ? [
        ...columns,
        {
          key: 'actions',
          header: '',
          render: (row) => (
            <div className='flex items-center justify-end'>
              <Button variant='ghost' size='icon' className='h-8 w-8' asChild>
                <NextLink href={editPath(row)}>
                  <Edit className='w-4 h-4' />
                </NextLink>
              </Button>
            </div>
          ),
        },
      ]
    : columns;

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            {displayColumns.map((column) =>
              column.sortable ? (
                <SortableHeader
                  key={column.key}
                  field={column.key}
                  className={column.className}
                  basePath={basePath}
                >
                  {column.header}
                </SortableHeader>
              ) : (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <>
              {Array.from({ length: skeletonRows }).map((_, index) => (
                <TableRowSkeleton
                  key={index}
                  columnsCount={displayColumns.length}
                />
              ))}
            </>
          ) : data.length > 0 ? (
            data.map((row) => (
              <TableRow key={row.id}>
                {displayColumns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn('px-4', column.className)}
                  >
                    {column.render
                      ? column.render(row)
                      : (row as any)[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={displayColumns.length}
                className='h-24 text-center'
              >
                <div className='text-muted-foreground'>{emptyMessage}</div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
