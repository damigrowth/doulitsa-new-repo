import React from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface RatingDisplayProps {
  /** The rating value (0-5) */
  rating: number;
  /** The number of reviews */
  reviewCount: number;
  /** Size variant of the stars */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the numeric rating */
  showRating?: boolean;
  /** Whether to show the review count */
  showReviewCount?: boolean;
  /** Display variant for review count text */
  variant?: 'compact' | 'full';
  /** Custom review count text formatter */
  reviewCountFormatter?: (count: number) => string;
  /** Custom class name */
  className?: string;
  /** Show empty state when no reviews */
  showEmpty?: boolean;
  /** Link href for clickable rating (e.g., #reviews) */
  href?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

/**
 * Formats rating number with smart decimal handling
 * - Whole numbers: "5" (no decimal)
 * - Decimal numbers: "5.1", "4.6" (with decimal)
 * - Optional Greek comma formatting: "5,1", "4,6"
 */
const formatRating = (rating: number, useComma: boolean = false): string => {
  // Check if rating is a whole number
  if (Number.isInteger(rating)) {
    return rating.toString();
  }

  // Format with 1 decimal place
  const formatted = rating.toFixed(1);

  // Replace period with comma for Greek formatting if requested
  return useComma ? formatted.replace('.', ',') : formatted;
};

const defaultReviewCountFormatter = (
  count: number,
  variant: 'compact' | 'full' = 'full',
  rating?: number,
) => {
  if (variant === 'compact') {
    return `(${count})`;
  }
  // For full variant: "X αξιολογήσεις"
  return `${count} ${count === 1 ? 'αξιολόγηση' : 'αξιολογήσεις'}`;
};

export default function RatingDisplay({
  rating,
  reviewCount,
  size = 'md',
  showRating = true,
  showReviewCount = true,
  variant = 'full',
  reviewCountFormatter,
  className = 'text-sm',
  showEmpty = false,
  href,
}: RatingDisplayProps) {
  const starSize = sizeClasses[size];

  if (reviewCount === 0 && !showEmpty) {
    return <div className={clsx('h-6', className)}></div>;
  }

  // Calculate the percentage for each star
  const getStarFillPercentage = (starIndex: number) => {
    const starValue = starIndex + 1;
    if (rating >= starValue) {
      return 100; // Fully filled
    } else if (rating > starIndex) {
      return (rating - starIndex) * 100; // Partially filled
    }
    return 0; // Empty
  };

  const content = (
    <div className={clsx('flex items-center gap-2', className)}>
      {/* 5 Stars with progressive fill (Skroutz-style) */}
      {variant === 'compact' ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className='flex items-center gap-0.5'>
              {[0, 1, 2, 3, 4].map((starIndex) => {
                const fillPercentage = getStarFillPercentage(starIndex);

                return (
                  <div key={starIndex} className='relative'>
                    {/* Gray background star */}
                    <Star
                      className={`${starSize} text-gray-300 fill-gray-300`}
                    />

                    {/* Yellow filled star overlay */}
                    {fillPercentage > 0 && (
                      <div
                        className='absolute inset-0 overflow-hidden'
                        style={{ width: `${fillPercentage}%` }}
                      >
                        <Star
                          className={`${starSize} text-yellow-400 fill-yellow-400`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{`${formatRating(rating, true)} αστέρια από ${reviewCount} ${reviewCount === 1 ? 'χρήστη' : 'χρήστες'}`}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className='flex items-center gap-0.5'>
          {[0, 1, 2, 3, 4].map((starIndex) => {
            const fillPercentage = getStarFillPercentage(starIndex);

            return (
              <div key={starIndex} className='relative'>
                {/* Gray background star */}
                <Star className={`${starSize} text-gray-300 fill-gray-300`} />

                {/* Yellow filled star overlay */}
                {fillPercentage > 0 && (
                  <div
                    className='absolute inset-0 overflow-hidden'
                    style={{ width: `${fillPercentage}%` }}
                  >
                    <Star
                      className={`${starSize} text-yellow-400 fill-yellow-400`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rating number */}
      {showRating && reviewCount > 0 && variant === 'full' && (
        <span className='text-foreground font-medium'>{formatRating(rating, false)}</span>
      )}

      {/* Review count */}
      {showReviewCount && reviewCount > 0 && (
        <>
          {/* {showRating && variant === 'full' && (
            <span className='text-muted-foreground'></span>
          )} */}
          <span className='text-muted-foreground'>
            {reviewCountFormatter
              ? reviewCountFormatter(reviewCount)
              : defaultReviewCountFormatter(reviewCount, variant, rating)}
          </span>
        </>
      )}
    </div>
  );

  // Wrap in link if href is provided
  if (href) {
    return (
      <a href={href} className='hover:opacity-80 transition-opacity'>
        {content}
      </a>
    );
  }

  return content;
}
