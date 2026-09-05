/** Service API surface — talks to Django's /api/services/* endpoints. */
import { api } from './client';

// ---- CRUD -----------------------------------------------------------------

export const createService = (body: unknown) =>
  // Trailing slash — backend `path("", ...)` mounts on `/api/services/`.
  api.post('/services/', body);

export const saveServiceDraft = (body: unknown) =>
  api.post('/services/draft', body);

export const updateService = (id: number, body: unknown) =>
  api.patch(`/services/${id}`, body);

export const deleteService = (id: number) =>
  api.delete(`/services/${id}`);

export const archiveService = (id: number) =>
  api.post(`/services/${id}/archive`);

export const updateServiceMedia = (id: number, media: unknown[]) =>
  api.patch(`/services/${id}/media`, { media });

export const refreshService = (id: number) =>
  api.post(`/services/${id}/refresh`);

export const reportService = (
  id: number,
  body: { serviceTitle: string; serviceSlug: string; description: string },
) => api.post(`/services/${id}/report`, body);

// ---- reads ----------------------------------------------------------------

export const getCategoriesPage = (params: { categorySlug?: string; subcategorySlug?: string; limit?: number } = {}) =>
  api.get('/services/categories', { query: params });

export const getNavigationMenu = () =>
  api.get('/services/navigation', { anonymous: true, revalidate: 300 });

export const getRecentServices = () => api.get('/services/recent');

export const getServiceBySlug = (slug: string) =>
  api.get(`/services/by-slug/${encodeURIComponent(slug)}`);

export const getServicePage = (id: number) =>
  api.get(`/services/${id}/page`);

export const getServiceForEdit = (id: number) =>
  api.get(`/services/${id}/edit`);

export const getFeaturedServices = () => api.get('/services/featured');

export const getServicesPaginated = (params: {
  page?: number;
  limit?: number;
  category?: string;
  excludeFeatured?: boolean;
} = {}) => api.get('/services', { query: params });

export const searchServices = (filters: unknown) =>
  api.post('/services/search', filters);

export const countServices = (filters: unknown) =>
  api.post('/services/count', filters);

export const getServiceTaxonomyPaths = () => api.get('/services/taxonomy-paths');

export const getServiceArchiveBundle = (body: unknown) =>
  api.post('/services/archive', body);

// ---- dashboard -----------------------------------------------------------

export const getMyServices = (query: Record<string, unknown> = {}) =>
  api.get('/services/me', { query: query as Record<string, string | number | boolean | undefined | null> });

export const getMyServiceStats = () => api.get('/services/me/stats');

// ---- search suggestions --------------------------------------------------

export const searchSuggestions = (q: string) =>
  api.get('/services/search/suggestions', { query: { q } });
