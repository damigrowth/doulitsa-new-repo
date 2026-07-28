'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRating } from '@/lib/utils/rating';

interface SimpleRatingDisplayProps {
  averageRating: number;
  totalReviews: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  compactCount?: boolean; // Show count in parentheses (X) instead of full text
  className?: string;
}

const starSizeMap = {
  sm: 14,
  md: 18,
  lg: 22,
};

const textSizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/**
 * Skroutz-style rating display component
 * Shows 5 stars that fill proportionally based on average rating
 * Displays exact rating on hover and review count
 */
export function SimpleRatingDisplay({
  averageRating,
  totalReviews,
  size = 'md',
  showCount = true,
  compactCount = false,
  className,
}: SimpleRatingDisplayProps) {
  const starSize = starSizeMap[size];
  const textSize = textSizeMap[size];

  // Don't show anything if no reviews
  if (totalReviews === 0) {
    return null;
  }

  // Calculate fill percentage for each star
  const getStarFill = (starIndex: number): number => {
    const starValue = starIndex + 1;
    if (averageRating >= starValue) return 100;
    if (averageRating < starValue - 1) return 0;
    return (averageRating - (starValue - 1)) * 100;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Stars Container with Tooltip */}
      <div
        className='flex items-center gap-0.5 group relative'
        role='img'
        aria-label={`${formatRating(averageRating)} από 5 αστέρια`}
      >
        {[0, 1, 2, 3, 4].map((index) => {
          const fillPercentage = getStarFill(index);

          return (
            <div key={index} className='relative'>
              {/* Gray background star */}
              <Star
                size={starSize}
                className='fill-gray-300 text-gray-300'
                aria-hidden='true'
              />

              {/* Yellow filled star overlay */}
              {fillPercentage > 0 && (
                <div
                  className='absolute inset-0 overflow-hidden'
                  style={{ width: `${fillPercentage}%` }}
                >
                  <Star
                    size={starSize}
                    className='fill-yellow-500 text-yellow-500'
                    aria-hidden='true'
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Tooltip showing exact rating on hover */}
        <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10'>
          {formatRating(averageRating)}
          <div className='absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900' />
        </div>
      </div>

      {/* Review Count */}
      {showCount && (
        <span className={cn('font-medium text-gray-700', textSize)}>
          {compactCount
            ? `(${totalReviews})`
            : totalReviews === 1
              ? '1 Αξιολόγηση'
              : `${totalReviews} Αξιολογήσεις`}
        </span>
      )}
    </div>
  );
}
