import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRating, getRatingLabel, getReviewCountLabel } from '@/lib/utils/rating';
import type { ReviewStats as ReviewStatsType } from '@/lib/types/reviews';

interface ReviewStatsProps {
  stats: ReviewStatsType;
  isServicePage?: boolean;
}

/**
 * Simplified card-based review statistics display
 * Shows average rating with large star and descriptive label
 * No distribution bars - clean and simple design
 */
export function ReviewStats({ stats, isServicePage = false }: ReviewStatsProps) {
  const { totalReviews, averageRating } = stats;

  // Don't show anything if no reviews
  if (totalReviews === 0) {
    return null;
  }

  return (
    <Card className='shadow-sm'>
      <CardHeader>
        <CardTitle>
          {getReviewCountLabel(totalReviews)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Average Rating Display */}
        <div className='flex flex-col items-center justify-center text-center py-4'>
          <div className='flex items-center gap-2 mb-2'>
            <span className='text-5xl font-bold text-gray-900'>
              {formatRating(averageRating)}
            </span>
            <Star className='h-10 w-10 fill-yellow-500 text-yellow-500' />
          </div>
          <p className='text-lg font-medium text-gray-700'>
            {getRatingLabel(averageRating)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
