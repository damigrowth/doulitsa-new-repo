'use server';

import * as reviewsApi from '@/lib/api/reviews';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';
import type { DashboardReviewCardData } from '@/lib/types/reviews';

/**
 * Paginated list of dashboard review cards.
 * Matches the `{ reviews, total }` shape returned by the Django review-reads
 * selector (`_paginate` in apps/reviews/selectors/review_reads.py); each card
 * mirrors `_card` → {@link DashboardReviewCardData}.
 */
export interface UserReviewsList {
  reviews: DashboardReviewCardData[];
  total: number;
}

/** Positive/negative review counts (rating 5 vs 1). */
export interface UserReviewStats {
  positiveCount: number;
  negativeCount: number;
}

const action = async <T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> => {
  try {
    return { success: true, data: await fn() };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου' };
  }
};

export const getUserTotalReviewCount = async (): Promise<ActionResult<{ total: number }>> =>
  action(() => reviewsApi.getMeReceivedTotal() as Promise<{ total: number }>);

export const getUserReviewsGiven = async (
  page = 1,
  limit = 10,
): Promise<ActionResult<UserReviewsList>> =>
  action(() => reviewsApi.getMeGiven({ page, limit }) as Promise<UserReviewsList>);

export const getUserReviewStats = async (): Promise<ActionResult<UserReviewStats>> =>
  action(() => reviewsApi.getMeReceivedStats() as Promise<UserReviewStats>);

export const getUserReviewsWithComments = async (
  page = 1,
  limit = 10,
): Promise<ActionResult<UserReviewsList>> =>
  action(() => reviewsApi.getMeReceivedWithComments({ page, limit }) as Promise<UserReviewsList>);

export const getUserGivenReviewStats = async (): Promise<ActionResult<UserReviewStats>> =>
  action(() => reviewsApi.getMeGivenStats() as Promise<UserReviewStats>);

export const getUserGivenReviewsWithComments = async (
  page = 1,
  limit = 10,
): Promise<ActionResult<UserReviewsList>> =>
  action(() => reviewsApi.getMeGivenWithComments({ page, limit }) as Promise<UserReviewsList>);

export const getUserReviewsReceived = async (
  page = 1,
  limit = 10,
): Promise<ActionResult<UserReviewsList>> =>
  action(() => reviewsApi.getMeReceived({ page, limit }) as Promise<UserReviewsList>);
