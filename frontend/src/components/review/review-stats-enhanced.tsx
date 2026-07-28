import { ReviewStars } from './review-stars';

interface ReviewStatsProps {
  stats: {
    totalReviews: number;
    averageRating: number;
  };
  isServicePage?: boolean;
  hasReviewsBelow?: boolean;
}

/**
 * Review statistics display for Service & Profile pages
 * Stacked vertical layout matching Bootstrap reference design
 * Shows: Rating number (large) → Quality label → Review count
 */
export function ReviewStatsEnhanced({
  stats,
  isServicePage = false,
  hasReviewsBelow = false,
}: ReviewStatsProps) {
  const { totalReviews, averageRating } = stats;

  // Don't show anything if no reviews
  if (totalReviews === 0) {
    return null;
  }

  // Helper function for smart decimal formatting
  const formatRating = (rating: number): string => {
    return Number.isInteger(rating) ? rating.toString() : rating.toFixed(1);
  };

  return (
    <div className='w-full'>
      {/* Single Row Rating Display */}
      <div
        className={`flex items-center justify-center gap-3 md:justify-start ${hasReviewsBelow ? 'mb-6 sm:mb-8' : 'mb-0'}`}
      >
        {/* Rating number */}
        <div className='text-[55px] leading-4 font-bold text-primary h-fit'>
          {formatRating(averageRating)}
        </div>
        <div className='flex flex-col'>
          {/* Quality label */}
          <span className='text-xl font-semibold text-gray-800'>
            Βαθμολογία
          </span>

          {/* Review count with stars */}
          <span className='text-base font-normal text-gray-600 flex items-center gap-2'>
            <ReviewStars rating={averageRating} size='md' />
            {/* Review count text */}
            <span>
              {totalReviews.toLocaleString('el-GR')}{' '}
              {totalReviews === 1 ? 'αξιολόγηση' : 'αξιολογήσεις'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
