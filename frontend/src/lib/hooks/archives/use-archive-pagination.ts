'use client';

import { useState, useCallback } from 'react';

interface UseArchivePaginationProps {
  initialPage?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
  onPageChange?: (page: number) => void;
}

export function useArchivePagination({
  initialPage = 1,
  limit = 20,
  total = 0,
  hasMore = false,
  onPageChange
}: UseArchivePaginationProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const startItem = total > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endItem = Math.min(currentPage * limit, total);

  // Handle page change
  const handlePageChange = useCallback(async (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) {
      return;
    }

    setIsLoading(true);
    setCurrentPage(page);

    try {
      if (onPageChange) {
        await onPageChange(page);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Navigate to next page
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, handlePageChange]);

  // Navigate to previous page
  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  }, [currentPage, handlePageChange]);

  // Navigate to first page
  const firstPage = useCallback(() => {
    if (currentPage !== 1) {
      handlePageChange(1);
    }
  }, [currentPage, handlePageChange]);

  // Navigate to last page
  const lastPage = useCallback(() => {
    if (currentPage !== totalPages) {
      handlePageChange(totalPages);
    }
  }, [currentPage, totalPages, handlePageChange]);

  // Get page numbers for pagination display
  const getPageNumbers = useCallback((maxVisible: number = 5) => {
    const pages: number[] = [];

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculate start and end pages
      let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages, start + maxVisible - 1);

      // Adjust start if end is at maximum
      if (end === totalPages) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  // Check if pagination is needed
  const isPaginationNeeded = totalPages > 1;

  // Check navigation states
  const canGoNext = currentPage < totalPages && !isLoading;
  const canGoPrevious = currentPage > 1 && !isLoading;

  return {
    currentPage,
    totalPages,
    total,
    startItem,
    endItem,
    isLoading,
    isPaginationNeeded,
    canGoNext,
    canGoPrevious,
    hasMore,
    handlePageChange,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    getPageNumbers
  };
}