/** Review API — talks to Django's /api/reviews/* endpoints. */
import { api } from './client';

export const createReview = (body: { rating: number; comment?: string; profileId: string; serviceId?: number }) =>
  // Trailing slash — Django's `path("", ...)` route resolves to `/api/reviews/`
  // and APPEND_SLASH can't redirect a POST without losing the body.
  api.post('/reviews/', body);

export const canUserReview = (params: { profileId: string; serviceId?: number }) =>
  api.get('/reviews/can-review', { query: params });

export const getProfileReviewStats = (profileId: string) =>
  api.get(`/reviews/profile/${profileId}/stats`);

export const getServiceReviewStats = (serviceId: number) =>
  api.get(`/reviews/service/${serviceId}/stats`);

export const getProfileReviews = (profileId: string, params: { page?: number; limit?: number } = {}) =>
  api.get(`/reviews/profile/${profileId}`, { query: params });

export const getServiceReviews = (serviceId: number, params: { page?: number; limit?: number } = {}) =>
  api.get(`/reviews/service/${serviceId}`, { query: params });

export const getProfileOtherServiceReviews = (
  profileId: string,
  params: { excludeServiceId?: number; limit?: number } = {},
) => api.get(`/reviews/profile/${profileId}/other-services`, { query: params });

// ---- /me dashboard --------------------------------------------------------

export const getMeReceivedTotal = () => api.get('/reviews/me/received/total');
export const getMeReceivedStats = () => api.get('/reviews/me/received/stats');
export const getMeReceived = (params: { page?: number; limit?: number } = {}) =>
  api.get('/reviews/me/received', { query: params });
export const getMeReceivedWithComments = (params: { page?: number; limit?: number } = {}) =>
  api.get('/reviews/me/received/with-comments', { query: params });

export const getMeGiven = (params: { page?: number; limit?: number } = {}) =>
  api.get('/reviews/me/given', { query: params });
export const getMeGivenStats = () => api.get('/reviews/me/given/stats');
export const getMeGivenWithComments = (params: { page?: number; limit?: number } = {}) =>
  api.get('/reviews/me/given/with-comments', { query: params });

export const toggleReviewVisibility = (reviewId: string) =>
  api.post(`/reviews/${reviewId}/visibility/toggle`);
