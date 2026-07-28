import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GivenReviewsSummaryCard } from './given-reviews-summary-card';
import { GivenRecommendationsSection } from './given-recommendations-section';
import type { DashboardReviewCardData } from '@/lib/types/reviews';

interface GivenReviewsSectionProps {
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

export function GivenReviewsSection({
  reviews,
  total,
  page,
  stats,
  recommendations,
  recommendationsTotal,
  recommendationsPage,
}: GivenReviewsSectionProps) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-lg font-semibold'>Αξιολογήσεις</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Summary Statistics */}
        <GivenReviewsSummaryCard
          positiveCount={stats.positiveCount}
          negativeCount={stats.negativeCount}
        />

        {/* Recommendations Section (reviews with comments) */}
        <GivenRecommendationsSection
          reviews={recommendations}
          totalReviews={recommendationsTotal}
          currentPage={recommendationsPage}
          pageSize={3}
        />
      </CardContent>
    </Card>
  );
}
