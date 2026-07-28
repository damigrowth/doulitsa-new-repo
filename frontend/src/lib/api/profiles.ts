/** Profile API surface — talks to Django's /api/profiles/* endpoints. */
import { api } from './client';

// ---- own-profile updates --------------------------------------------------

export const updateBasicInfo = (body: unknown) =>
  api.patch('/profiles/me/basic-info', body);

export const updateAdditionalInfo = (body: unknown) =>
  api.patch('/profiles/me/additional-info', body);

export const updateBilling = (body: unknown) =>
  api.patch('/profiles/me/billing', body);

export const updateCoverage = (coverage: unknown) =>
  api.patch('/profiles/me/coverage', { coverage });

export const updatePortfolio = (portfolio: unknown[]) =>
  api.patch('/profiles/me/portfolio', { portfolio });

export const updatePresentation = (body: unknown) =>
  api.patch('/profiles/me/presentation', body);

export const getMyPresentation = () =>
  api.get('/profiles/me/presentation');

// ---- reads ----------------------------------------------------------------

export const getMyProfile = () => api.get('/profiles/me');

export const getProfileByUsername = (username: string) =>
  api.get(`/profiles/by-username/${encodeURIComponent(username)}`);

export const getProfilePageData = (username: string) =>
  api.get(`/profiles/page/${encodeURIComponent(username)}`);

export const getDirectoryData = (params: { limit?: number; categorySlug?: string; subcategorySlug?: string } = {}) =>
  api.get('/profiles/directory', { query: params });

export const getProfileTaxonomyPaths = (role?: 'freelancer' | 'company') =>
  api.get('/profiles/taxonomy-paths', { query: { role } });

// ---- POST search/count/archive (complex filter payloads) ------------------

export const searchProfiles = (filters: unknown) =>
  api.post('/profiles/search', filters);

export const countProfiles = (filters: unknown) =>
  api.post('/profiles/count', filters);

export const getArchiveBundle = (body: unknown) =>
  api.post('/profiles/archive', body);

// ---- AFM / verification / report -----------------------------------------

export const lookupAfm = (afm: string) =>
  api.post('/profiles/lookup-afm', { afm });

export const submitVerification = (body: { afm: string; name: string; address: string; phone: string }) =>
  api.post('/profiles/me/verification', body);

export const getMyVerification = () =>
  api.get('/profiles/me/verification');

export const reportProfile = (
  profileId: string,
  body: { profileName: string; profileUsername: string; description: string },
) => api.post(`/profiles/${profileId}/report`, body);
