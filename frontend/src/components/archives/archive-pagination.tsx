'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Selectbox } from '@/components/ui/selectbox';
import { cn } from '@/lib/utils';

interface ArchivePaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  startItem: number;
  endItem: number;
  limit: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  showResultsPerPage?: boolean;
  className?: string;
}

const RESULTS_PER_PAGE_OPTIONS = [
  { id: '10', label: '10' },
  { id: '20', label: '20' },
  { id: '50', label: '50' },
  { id: '100', label: '100' },
];

export function ArchivePagination({
  currentPage,
  totalPages,
  total,
  startItem,
  endItem,
  limit,
  isLoading = false,
  onPageChange,
  onLimitChange,
  showResultsPerPage = true,
  className,
}: ArchivePaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const maxVisible = 5;
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end for middle pages
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust for edge cases
      if (currentPage <= 3) {
        end = Math.min(totalPages - 1, 4);
      }
      if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
      }

      // Add ellipsis if needed before middle pages
      if (start > 2) {
        pages.push('ellipsis');
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed after middle pages
      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page (if different from first)
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePageClick = (page: number) => {
    if (page !== currentPage && !isLoading) {
      onPageChange(page);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1 && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLimitChange = (newLimit: string) => {
    if (onLimitChange) {
      onLimitChange(parseInt(newLimit));
    }
  };

  // Don't render if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {/* Results Info */}
      <div className='text-sm text-gray-600'>
        Εμφανίζονται {startItem.toLocaleString()}-{endItem.toLocaleString()} από{' '}
        {total.toLocaleString()} αποτελέσματα
      </div>

      {/* Pagination Controls */}
      <div className='flex flex-col md:flex-row items-center gap-3 sm:gap-2'>
        {/* Results Per Page */}
        {showResultsPerPage && onLimitChange && (
          <div className='flex items-center gap-2 sm:mr-4'>
            <span className='text-sm text-gray-600 whitespace-nowrap'>
              Ανά σελίδα:
            </span>
            <Selectbox
              options={RESULTS_PER_PAGE_OPTIONS}
              value={limit.toString()}
              onValueChange={handleLimitChange}
              disabled={isLoading}
              className='w-20'
            />
          </div>
        )}

        <div className='flex items-center gap-2'>
          {/* Previous Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={handlePrevious}
            disabled={currentPage <= 1 || isLoading}
            className='hidden xs:flex items-center gap-1'
          >
            <ChevronLeft className='w-4 h-4' />
            <span className='hidden sm:inline'>Προηγούμενη</span>
          </Button>

          {/* Page Numbers */}
          <div className='flex items-center gap-2'>
            {pageNumbers.map((page, index) => {
              if (page === 'ellipsis') {
                return (
                  <div
                    key={`ellipsis-${index}`}
                    className='flex items-center justify-center w-8 h-8 text-gray-400'
                  >
                    <MoreHorizontal className='w-4 h-4' />
                  </div>
                );
              }

              return (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => handlePageClick(page)}
                  disabled={isLoading}
                  className={cn(
                    'w-8 h-8 p-0',
                    page === currentPage &&
                      'bg-primary text-primary-foreground',
                  )}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          {/* Next Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={handleNext}
            disabled={currentPage >= totalPages || isLoading}
            className='hidden xs:flex items-center gap-1'
          >
            <span className='hidden sm:inline'>Επόμενη</span>
            <ChevronRight className='w-4 h-4' />
          </Button>
        </div>

        <div className='w-full flex xs:hidden space-x-2'>
          {/* Previous Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={handlePrevious}
            disabled={currentPage <= 1 || isLoading}
            className='flex sm:hidden items-center gap-1 w-1/2'
          >
            <ChevronLeft className='w-4 h-4' />
            <span className='hidden sm:inline'>Προηγούμενη</span>
          </Button>

          {/* Next Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={handleNext}
            disabled={currentPage >= totalPages || isLoading}
            className='flex sm:hidden items-center gap-1 w-1/2'
          >
            <span className='hidden sm:inline'>Επόμενη</span>
            <ChevronRight className='w-4 h-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}
