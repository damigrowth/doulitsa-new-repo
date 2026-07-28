/** Blog API — talks to Django's /api/blog/*. */
import { api } from './client';

export const listArticles = (params: {
  page?: number;
  limit?: number;
  categorySlug?: string;
  authorProfileId?: string;
  featured?: boolean;
  search?: string;
} = {}) => api.get('/blog/articles', { query: params });

export const getArticle = (slug: string) =>
  api.get(`/blog/articles/${encodeURIComponent(slug)}`);

export const getRelatedArticles = (slug: string, limit = 4) =>
  api.get(`/blog/articles/${encodeURIComponent(slug)}/related`, { query: { limit } });
