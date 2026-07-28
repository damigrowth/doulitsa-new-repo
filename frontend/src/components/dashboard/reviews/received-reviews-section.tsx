import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewsSummaryCard } from './reviews-summary-card';
import { RecommendationsSection } from './recommendations-section';
import type { DashboardReviewCardData } from '@/lib/types/reviews';

interface ReceivedReviewsSectionProps {
  reviews: DashboardReviewCardData[];
  total: number;
  page: number;
  stats: {
    positiveCount: number;
    negativeCount: number;
  };
  recommendations: DashboardReviewCardData[];
  recommendationsTotal: number;
  recommendationsPage: number;
}

export function ReceivedReviewsSection({
  reviews,
  total,
  page,
  stats,
  recommendations,
  recommendationsTotal,
  recommendationsPage,
}: ReceivedReviewsSectionProps) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-lg font-semibold'>Αξιολογήσεις</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Summary Statistics */}
        <ReviewsSummaryCard
          positiveCount={stats.positiveCount}
          negativeCount={stats.negativeCount}
        />

        {/* Recommendations Section (reviews with comments) */}
        <RecommendationsSection
          reviews={recommendations}
          totalReviews={recommendationsTotal}
          currentPage={recommendationsPage}
          pageSize={3}
        />
      </CardContent>
    </Card>
  );
}
