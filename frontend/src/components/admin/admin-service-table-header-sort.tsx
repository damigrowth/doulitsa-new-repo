'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AdminServiceSortField = 'createdAt' | 'updatedAt' | 'title' | 'rating' | 'reviewCount' | 'price' | 'category' | 'status';
export type SortOrder = 'asc' | 'desc';

interface AdminServiceTableHeaderSortProps {
  field: AdminServiceSortField;
  currentSort: {
    field: AdminServiceSortField;
    order: SortOrder;
  };
  children: React.ReactNode;
  className?: string;
}

export default function AdminServiceTableHeaderSort({
  field,
  currentSort,
  children,
  className,
}: AdminServiceTableHeaderSortProps) {
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
    router.push(`/admin/services?${params.toString()}`);
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
