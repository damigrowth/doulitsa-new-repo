'use client';

import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting/date';
import type { DashboardReviewCardData } from '@/lib/types/reviews';

interface GivenReviewCardProps {
  review: DashboardReviewCardData;
}

export function GivenReviewCard({ review }: GivenReviewCardProps) {
  const displayPerson = review.reviewedProfile;

  if (!displayPerson) return null;

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

      {/* 2. To: name - date */}
      <div className='text-sm text-muted-foreground'>
        Προς: <span className='font-medium'>{displayPerson.displayName}</span> - ({formattedDate})
      </div>

      {/* 3. Service */}
      {review.service && (
        <div className='text-sm text-muted-foreground'>
          Υπηρεσία: <span className='font-medium'>{review.service.title}</span>
        </div>
      )}

      {/* 4. Status badges */}
      <div className='flex items-center gap-2'>
        {review.status === 'pending' && (
          <span className='text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full'>
            Σε αναμονή έγκρισης
          </span>
        )}
        {review.status === 'rejected' && (
          <span className='text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full'>
            Απορρίφθηκε
          </span>
        )}
      </div>
    </div>
  );
}
