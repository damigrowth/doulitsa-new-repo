'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ServiceSortField, SortOrder } from '@/lib/types/services';

interface ServiceTableHeaderSortProps {
  field: ServiceSortField;
  currentSort: {
    field: ServiceSortField;
    order: SortOrder;
  };
  children: React.ReactNode;
  className?: string;
}

export default function ServiceTableHeaderSort({
  field,
  currentSort,
  children,
  className,
}: ServiceTableHeaderSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isActive = currentSort.field === field;

  const handleSort = () => {
    const params = new URLSearchParams(searchParams);

    // Determine new sort order
    const newOrder: SortOrder =
      isActive && currentSort.order === 'asc' ? 'desc' : 'asc';

    // Update params
    params.set('sortBy', field);
    params.set('sortOrder', newOrder);
    params.set('page', '1'); // Reset to first page when sorting

    // Navigate with new params
    router.push(`/dashboard/services?${params.toString()}`);
  };

  const getSortIcon = () => {
    if (!isActive) return <ArrowUpDown className='w-4 h-4' />;
    return currentSort.order === 'asc' ? (
      <ArrowUp className='w-4 h-4' />
    ) : (
      <ArrowDown className='w-4 h-4' />
    );
  };

  return (
    <TableHead className={cn('cursor-pointer select-none', className)}>
      <Button
        variant='ghost'
        size='lg'
        onClick={handleSort}
        className={cn(
          'h-auto p-0 font-semibold text-left justify-start gap-2 hover:bg-transparent',
          isActive && 'text-primary',
        )}
      >
        {children}
        {getSortIcon()}
      </Button>
    </TableHead>
  );
}
