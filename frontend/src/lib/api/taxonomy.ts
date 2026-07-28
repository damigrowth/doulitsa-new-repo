/** Taxonomy API — talks to Django's /api/taxonomy/*. */
import { api } from './client';

export const submitTaxonomy = (body: {
  label: string;
  type: 'skill' | 'tag';
  category?: string;
}) => api.post<{ pendingId: string }>('/taxonomy/submissions', body);

export const getMyTaxonomySubmissions = (type?: 'skill' | 'tag') =>
  api.get('/taxonomy/submissions/me', { query: { type } });
