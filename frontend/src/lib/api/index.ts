/** Single import surface for the Django backend client.
 *
 *     import { auth, profiles, services } from '@/lib/api';
 *     await auth.login(email, pw);
 *     const me = await profiles.getMyProfile();
 *
 * Each namespace mirrors a Django app from MIGRATION_TRACKER.md. The lower-
 * level `api.{get,post,patch,delete}` is also re-exported for ad-hoc calls.
 */

export * as auth from './auth';
export * as profiles from './profiles';
export * as services from './services';
export * as reviews from './reviews';
export * as messaging from './messaging';
export * as billing from './billing';
export * as blog from './blog';
export * as saved from './saved';
export * as taxonomy from './taxonomy';
export * as media from './media';
export * as support from './support';
export * as core from './core';
export * as admin from './admin';

export { api, apiRequest, ApiError, withActionResult, getAccessToken, setTokens, clearTokens, API_BASE_URL } from './client';
