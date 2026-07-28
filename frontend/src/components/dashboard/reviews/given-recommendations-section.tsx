'use client';

import { GivenReviewCard } from './given-review-card';
import type { DashboardReviewCardData } from '@/lib/types/reviews';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface GivenRecommendationsSectionProps {
  reviews: DashboardReviewCardData[];
  totalReviews: number;
  currentPage: number;
  pageSize: number;
}

export function GivenRecommendationsSection({
  reviews,
  totalReviews,
  currentPage,
  pageSize,
}: GivenRecommendationsSectionProps) {
  const totalPages = Math.ceil(totalReviews / pageSize);

  // Empty state
  if (reviews.length === 0) {
    return (
      <div className='space-y-2 pt-2'>
        <h2 className='text-lg font-semibold'>Συστάσεις</h2>
        <p className='text-muted-foreground'>
          Δεν υπάρχουν ακόμα συστάσεις με σχόλια.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <h2 className='text-lg font-semibold'>Συστάσεις</h2>

      {/* Reviews List */}
      <div className='space-y-4'>
        {reviews.map((review) => (
          <GivenReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`/dashboard/reviews?g_rec_page=${currentPage - 1}`}
                aria-disabled={currentPage === 1}
                className={
                  currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                }
              />
            </PaginationItem>

            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              // Show first, last, current, and adjacent pages
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href={`/dashboard/reviews?g_rec_page=${page}`}
                      isActive={page === currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              // Show ellipsis
              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <PaginationItem key={page}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              return null;
            })}

            <PaginationItem>
              <PaginationNext
                href={`/dashboard/reviews?g_rec_page=${currentPage + 1}`}
                aria-disabled={currentPage === totalPages}
                className={
                  currentPage === totalPages
                    ? 'pointer-events-none opacity-50'
                    : ''
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
