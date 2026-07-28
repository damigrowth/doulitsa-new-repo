'use server';

import * as reviewsApi from '@/lib/api/reviews';

export async function getProfileReviewStats(profileId: string) {
  try {
    return (await reviewsApi.getProfileReviewStats(profileId)) as { totalReviews: number; averageRating: number };
  } catch {
    return { totalReviews: 0, averageRating: 0 };
  }
}

export async function getServiceReviewStats(serviceId: number) {
  try {
    return (await reviewsApi.getServiceReviewStats(serviceId)) as { totalReviews: number; averageRating: number };
  } catch {
    return { totalReviews: 0, averageRating: 0 };
  }
}
