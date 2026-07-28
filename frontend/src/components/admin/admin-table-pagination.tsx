'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Selectbox } from '@/components/ui/selectbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AdminTablePaginationProps {
  currentPage: number;
  totalPages: number;
  currentLimit: number;
  basePath: string; // e.g., '/admin/services', '/admin/users', '/admin/profiles'
  pageSizeOptions?: number[]; // Optional custom page sizes
}

export default function AdminTablePagination({
  currentPage,
  totalPages,
  currentLimit,
  basePath,
  pageSizeOptions = [12, 24, 48],
}: AdminTablePaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updatePage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`${basePath}?${params.toString()}`);
  };

  const updateLimit = (limit: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('limit', limit);
    params.set('page', '1'); // Reset to first page when changing page size
    router.push(`${basePath}?${params.toString()}`);
  };

  const limitOptions = pageSizeOptions.map((size) => ({
    id: size.toString(),
    label: `${size} ανά σελίδα`,
  }));

  // Direct page navigation
  const [pageInput, setPageInput] = useState('');

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      updatePage(page);
      setPageInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
    }
  };

  return (
    <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
      {/* Page Size Selector */}
      <div className='flex items-center gap-2'>
        <span className='text-sm text-gray-600'>Εμφάνιση:</span>
        <Selectbox
          options={limitOptions}
          value={currentLimit.toString()}
          onValueChange={updateLimit}
          placeholder={`${currentLimit} ανά σελίδα`}
          className='w-[140px]'
        />
      </div>

      {/* Direct Page Navigation */}
      <div className='flex items-center gap-2 w-full sm:w-1/3'>
        <span className='text-sm text-gray-600'>
          Σελίδα {currentPage} από {totalPages}
        </span>
        <Input
          type='number'
          min={1}
          max={totalPages}
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='#'
          className='w-[70px] h-9 text-center'
        />
        <Button
          variant='outline'
          size='sm'
          onClick={handlePageInputSubmit}
          disabled={
            !pageInput ||
            parseInt(pageInput, 10) < 1 ||
            parseInt(pageInput, 10) > totalPages
          }
        >
          Μετάβαση
        </Button>
      </div>

      {/* Pagination Controls */}
      <Pagination>
        <PaginationContent>
          {currentPage > 1 && (
            <PaginationItem>
              <PaginationPrevious
                onClick={() => updatePage(currentPage - 1)}
                className='cursor-pointer'
              />
            </PaginationItem>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              // Show first page, last page, and pages around current page
              return (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              );
            })
            .map((page, index, array) => (
              <React.Fragment key={page}>
                {/* Add ellipsis if there's a gap */}
                {index > 0 && array[index - 1] !== page - 1 && (
                  <PaginationItem>
                    <span className='px-3 py-2 text-gray-500'>...</span>
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink
                    onClick={() => updatePage(page)}
                    isActive={page === currentPage}
                    className='cursor-pointer'
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              </React.Fragment>
            ))}

          {currentPage < totalPages && (
            <PaginationItem>
              <PaginationNext
                onClick={() => updatePage(currentPage + 1)}
                className='cursor-pointer'
              />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    </div>
  );
}
