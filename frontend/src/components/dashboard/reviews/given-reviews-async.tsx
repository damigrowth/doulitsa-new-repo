import {
  getUserReviewsGiven,
  getUserGivenReviewStats,
  getUserGivenReviewsWithComments,
} from '@/actions/reviews/get-user-reviews';
import { GivenReviewsSection } from './given-reviews-section';

interface GivenReviewsAsyncProps {
  page: number;
  recommendationsPage: number;
}

export async function GivenReviewsAsync({
  page,
  recommendationsPage,
}: GivenReviewsAsyncProps) {
  const [reviewsResult, statsResult, recommendationsResult] =
    await Promise.all([
      getUserReviewsGiven(page, 3),
      getUserGivenReviewStats(),
      getUserGivenReviewsWithComments(recommendationsPage, 3),
    ]);

  const reviews = reviewsResult.success ? reviewsResult.data?.reviews || [] : [];
  const total = reviewsResult.success ? reviewsResult.data?.total || 0 : 0;

  const stats = statsResult.success
    ? statsResult.data || { positiveCount: 0, negativeCount: 0 }
    : { positiveCount: 0, negativeCount: 0 };

  const recommendations = recommendationsResult.success
    ? recommendationsResult.data?.reviews || []
    : [];
  const recommendationsTotal = recommendationsResult.success
    ? recommendationsResult.data?.total || 0
    : 0;

  return (
    <GivenReviewsSection
      reviews={reviews}
      total={total}
      page={page}
      stats={stats}
      recommendations={recommendations}
      recommendationsTotal={recommendationsTotal}
      recommendationsPage={recommendationsPage}
    />
  );
}
