'use server';

import * as reviewsApi from '@/lib/api/reviews';

// OLD default limit 10 (app_before_migrations/src/actions/reviews/get-reviews.ts:84).
export async function getProfileReviews(profileId: string, page = 1, limit = 10) {
  try {
    return (await reviewsApi.getProfileReviews(profileId, { page, limit })) as {
      reviews: unknown[]; total: number;
    };
  } catch {
    return { reviews: [], total: 0 };
  }
}

// OLD default limit 10 (app_before_migrations/src/actions/reviews/get-reviews.ts:184).
export async function getServiceReviews(serviceId: number, page = 1, limit = 10) {
  try {
    return (await reviewsApi.getServiceReviews(serviceId, { page, limit })) as {
      reviews: unknown[]; total: number;
    };
  } catch {
    return { reviews: [], total: 0 };
  }
}

// OLD default limit 5 (app_before_migrations/src/actions/reviews/get-reviews.ts:285).
export async function getProfileOtherServiceReviews(
  profileId: string, excludeServiceId?: number, limit = 5,
) {
  try {
    return (await reviewsApi.getProfileOtherServiceReviews(profileId, { excludeServiceId, limit })) as {
      reviews: unknown[]; total: number;
    };
  } catch {
    return { reviews: [], total: 0 };
  }
}
