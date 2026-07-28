import { Suspense } from 'react';
import { ReceivedReviewsAsync } from './received-reviews-async';
import { GivenReviewsAsync } from './given-reviews-async';
import { ShareReviewLinkAsync } from './share-review-link-async';
import { ReviewsSectionSkeleton } from './reviews-section-skeleton';

interface DashboardReviewsContainerProps {
  receivedPage: number;
  givenPage: number;
  recommendationsPage: number;
  givensRecommendationsPage: number;
  isPro?: boolean;
}

export function DashboardReviewsContainer({
  receivedPage,
  givenPage,
  recommendationsPage,
  givensRecommendationsPage,
  isPro = false,
}: DashboardReviewsContainerProps) {
  return (
    <div className='space-y-6 p-2 pr-0'>
      {/* Received Reviews - Only for professionals */}
      {isPro && (
        <div className='space-y-4'>
          <h3 className='text-xl font-semibold text-gray-900 mb-0'>
            Αξιολογήσεις που έλαβα
          </h3>
          <Suspense
            key={`received-${receivedPage}-${recommendationsPage}`}
            fallback={<ReviewsSectionSkeleton title='Αξιολογήσεις' />}
          >
            <ReceivedReviewsAsync
              page={receivedPage}
              recommendationsPage={recommendationsPage}
            />
          </Suspense>
        </div>
      )}

      <div className='space-y-4'>
        <h3 className='text-xl font-semibold text-gray-900 mb-0'>
          Αξιολογήσεις που έκανα
        </h3>
        {/* Given Reviews with independent Suspense boundary */}
        <Suspense
          key={`given-${givenPage}-${givensRecommendationsPage}`}
          fallback={<ReviewsSectionSkeleton title='Αξιολογήσεις' />}
        >
          <GivenReviewsAsync
            page={givenPage}
            recommendationsPage={givensRecommendationsPage}
          />
        </Suspense>
      </div>

      {/* Share Review Link - Only for professionals */}
      {isPro && (
        <div className='space-y-4'>
          <h3 className='text-xl font-semibold text-gray-900 mb-0'>
            Κοινοποίηση
          </h3>
          <ShareReviewLinkAsync />
        </div>
      )}
    </div>
  );
}
