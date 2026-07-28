import React from 'react';
import { Star } from 'lucide-react';
import { ProfileRatingProps } from '@/lib/types';
import { NextLink } from '@/components';

/**
 * Modern ProfileRating Component
 * Displays rating with stars and review count, optionally clickable
 */

/**
 * Format rating to one decimal place
 */
function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export default function ProfileRating({
  totalReviews,
  rating,
  clickable = false,
}: ProfileRatingProps) {
  // Don't render if no reviews
  if (!totalReviews || totalReviews === 0) {
    return null;
  }

  const ratingContent = (
    <div
      className={`flex items-center gap-2 text-sm ${clickable ? 'hover:opacity-80 transition-opacity' : ''}`}
    >
      <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
      <span className='font-medium text-foreground'>
        {formatRating(rating)}
      </span>
      <span className='text-muted-foreground whitespace-nowrap'>
        ({totalReviews} {totalReviews === 1 ? 'αξιολόγηση' : 'αξιολογήσεις'})
      </span>
    </div>
  );

  if (clickable) {
    return (
      <NextLink href='#reviews-section' className='inline-block cursor-pointer'>
        {ratingContent}
      </NextLink>
    );
  }

  return ratingContent;
}
