import { getUserReviewsReceived, getUserReviewStats, getUserReviewsWithComments } from '@/actions/reviews/get-user-reviews';
import { getSession } from '@/actions/auth/server';
import { ReceivedReviewsSection } from './received-reviews-section';

interface ReceivedReviewsAsyncProps {
  page: number;
  recommendationsPage: number;
}

export async function ReceivedReviewsAsync({ page, recommendationsPage }: ReceivedReviewsAsyncProps) {
  // Check if user is a professional (only professionals can see received reviews)
  const session = (await (async () => { const r = await getSession(); return r.success && r.data?.user ? { user: r.data.user, session: r.data.session } : null; })());

  const isProfessional =
    session?.user?.role === 'freelancer' ||
    session?.user?.role === 'company';

  // Return null if not a professional
  if (!isProfessional) {
    return null;
  }

  // Fetch all data in parallel
  const [reviewsResult, statsResult, recommendationsResult] = await Promise.all([
    getUserReviewsReceived(page, 3),
    getUserReviewStats(),
    getUserReviewsWithComments(recommendationsPage, 3),
  ]);

  const reviews = reviewsResult.success ? reviewsResult.data?.reviews || [] : [];
  const total = reviewsResult.success ? reviewsResult.data?.total || 0 : 0;

  const stats = statsResult.success ? statsResult.data : { positiveCount: 0, negativeCount: 0 };

  const recommendations = recommendationsResult.success ? recommendationsResult.data?.reviews || [] : [];
  const recommendationsTotal = recommendationsResult.success ? recommendationsResult.data?.total || 0 : 0;

  return (
    <ReceivedReviewsSection
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
