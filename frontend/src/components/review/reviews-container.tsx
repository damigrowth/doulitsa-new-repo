import { Card, CardContent } from '@/components/ui/card';
import { ReviewStatsEnhanced } from './review-stats-enhanced';
import { ReviewCard } from './review-card';
import { ReviewForm } from './review-form';
import type { ReviewWithAuthor } from '@/lib/types/reviews';

interface ReviewsContainerProps {
  reviews: ReviewWithAuthor[];
  stats: {
    totalReviews: number;
    averageRating: number;
  };
  profileId: string;
  profileDisplayName: string;
  serviceId?: number;
  otherServicesReviews?: ReviewWithAuthor[];
  showReviewsModel?: boolean;
  type: 'service' | 'profile';
  isOwner: boolean;
  isServicePage?: boolean;
  profileServices?: Array<{ id: number; title: string }>;
}

export function ReviewsContainer({
  reviews,
  stats,
  profileId,
  profileDisplayName,
  serviceId,
  otherServicesReviews,
  showReviewsModel = false,
  type,
  isOwner,
  isServicePage = false,
  profileServices,
}: ReviewsContainerProps) {
  // Server now filters reviews (status='approved' AND published=true AND visibility=true)
  // No client-side filtering needed
  const hasReviews = stats.totalReviews > 0;
  const hasPublishedReviews = reviews.length > 0;
  const hasOtherReviews =
    otherServicesReviews && otherServicesReviews.length > 0;
  const hasAnyReviews = hasPublishedReviews || hasOtherReviews;

  return (
    <section id="review">
      <h4 className='font-semibold text-lg text-foreground mb-5'>
        Αξιολογήσεις
      </h4>
      <Card className='shadow-lg border rounded-xl bg-white'>
        <CardContent className='p-6 md:p-8'>
          {/* Review Stats - Show even if no reviews to display the header */}
          <ReviewStatsEnhanced stats={stats} isServicePage={isServicePage} hasReviewsBelow={hasPublishedReviews} />

          {/* Empty State Message - Only show if NO rating AND NO visible reviews */}
          {!hasReviews && !hasAnyReviews && (
            <div className='py-2'>
              <p className='text-lg font-medium text-gray-600'>
                {isOwner
                  ? 'Δεν έχεις ακόμα αξιολογήσεις!'
                  : type === 'service'
                    ? 'Γίνε ο πρώτος που θα κάνει αξιολόγηση για αυτή την υπηρεσία!'
                    : 'Γίνε ο πρώτος που θα κάνει αξιολόγηση!'}
              </p>
            </div>
          )}

          {/* Main Reviews List */}
          {reviews.length > 0 && (
            <div className='space-y-4 mb-8'>
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  showService={showReviewsModel}
                />
              ))}
            </div>
          )}

          {/* Add Review Form (Protected - only if not owner) */}
          {!isOwner && (
            <div className={hasAnyReviews ? 'mt-8 pt-8 border-t' : 'mt-8'}>
              <ReviewForm
                profileId={profileId}
                serviceId={type === 'service' ? serviceId : undefined}
                type={type}
                profileServices={
                  type === 'profile' ? profileServices : undefined
                }
              />
            </div>
          )}

          {/* Other Services Reviews (Service pages only) */}
          {isServicePage && hasOtherReviews && otherServicesReviews && (
            <div className='mt-8 pt-8 border-t'>
              <h3 className='text-xl font-semibold mb-6'>
                {otherServicesReviews.length === 1
                  ? '1 αξιολόγηση από άλλες υπηρεσίες'
                  : otherServicesReviews.length +
                    ' αξιολογήσεις από άλλες υπηρεσίες'}
              </h3>
              <div className='space-y-4'>
                {otherServicesReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} showService />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
