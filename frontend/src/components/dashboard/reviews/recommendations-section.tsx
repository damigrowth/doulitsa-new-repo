'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting/date';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toggleReviewVisibility } from '@/actions/reviews';
import { toast } from 'sonner';
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

interface RecommendationsSectionProps {
  reviews: DashboardReviewCardData[];
  totalReviews: number;
  currentPage: number;
  pageSize: number;
}

function RecommendationCard({ review }: { review: DashboardReviewCardData }) {
  const [isVisible, setIsVisible] = useState(review.visibility);
  const [isToggling, setIsToggling] = useState(false);

  const displayPerson = review.author;

  if (!displayPerson) return null;

  const handleToggleVisibility = async () => {
    setIsToggling(true);
    try {
      const result = await toggleReviewVisibility(review.id);
      if (result.success && result.data) {
        setIsVisible(result.data.visibility);
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Αποτυχία ενημέρωσης εμφάνισης');
      }
    } catch (error) {
      toast.error('Αποτυχία ενημέρωσης εμφάνισης');
    } finally {
      setIsToggling(false);
    }
  };

  const { formattedDate } = formatDate(review.createdAt, 'dd/MM/yyyy');
  const isPositive = review.rating === 5;

  return (
    <div className='flex flex-col gap-3 pb-6 mb-6 border-b last:border-b-0 last:pb-0 last:mb-0'>
      {/* 1. Comment with icon - FIRST */}
      {review.comment && (
        <div className='flex items-start gap-3'>
          <div className='shrink-0 mt-0.5'>
            {isPositive ? (
              <ThumbsUp className='h-5 w-5 text-green-600' />
            ) : (
              <ThumbsDown className='h-5 w-5 text-red-600' />
            )}
          </div>
          <p className='text-base font-semibold text-gray-900 leading-relaxed flex-1'>
            {review.comment}
          </p>
        </div>
      )}

      {/* 2. From: name - date */}
      <div className='text-sm text-muted-foreground'>
        Από: <span className='font-medium'>{displayPerson.displayName}</span> - ({formattedDate})
      </div>

      {/* 3. Service */}
      {review.service && (
        <div className='text-sm text-muted-foreground'>
          Υπηρεσία: <span className='font-medium'>{review.service.title}</span>
        </div>
      )}

      {/* 4. Visibility Toggle */}
      {review.status === 'approved' && (
        <div className='flex items-center gap-3'>
          <Label
            htmlFor={`comment-visibility-${review.id}`}
            className='text-sm font-medium cursor-pointer'
          >
            Εμφάνιση σχολίου
          </Label>
          <Switch
            id={`comment-visibility-${review.id}`}
            checked={isVisible}
            onCheckedChange={handleToggleVisibility}
            disabled={isToggling}
          />
          <span className='text-xs text-muted-foreground'>
            {isVisible ? 'Ναι' : 'Όχι'}
          </span>
        </div>
      )}
    </div>
  );
}

export function RecommendationsSection({
  reviews,
  totalReviews,
  currentPage,
  pageSize,
}: RecommendationsSectionProps) {
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
          <RecommendationCard key={review.id} review={review} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`/dashboard/reviews?rec_page=${currentPage - 1}`}
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
                      href={`/dashboard/reviews?rec_page=${page}`}
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
                href={`/dashboard/reviews?rec_page=${currentPage + 1}`}
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
