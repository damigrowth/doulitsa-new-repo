/** Admin API — every /api/admin/* endpoint, grouped by resource. */
import { api } from './client';
import type { BlogArticleAdmin } from '@/lib/types/blog';
import type {
  AdminApiKeyCreated,
  AdminApiKeyRow,
  AdminBrevoStats,
  AdminChatMessagesResponse,
  AdminProfileRow,
  AdminProfileStats,
  AdminProfilesListResponse,
  AdminReviewStats,
  AdminReviewsListResponse,
  AdminServiceStats,
  AdminServicesListResponse,
  AdminSubscriptionStats,
  AdminSubscriptionsListResponse,
  AdminTaxonomySubmissionStats,
  AdminTeamMember,
  AdminUserRow,
  AdminUserStats,
  AdminUsersListResponse,
  AdminVerificationStats,
  AdminVerificationsListResponse,
} from '@/lib/types/admin';

// ---- users (rows 144-170) ------------------------------------------------

export const adminUsers = {
  list: (q: Record<string, unknown> = {}) =>
    api.get<AdminUsersListResponse>('/admin/users', { query: q as Record<string, string | number | boolean | undefined | null> }),
  get: (id: string) => api.get<AdminUserRow>(`/admin/users/${id}`),
  create: (body: unknown) => api.post('/admin/users', body),
  setRole: (id: string, role: string) => api.post(`/admin/users/${id}/role`, { role }),
  ban: (id: string, body: { banReason?: string; banExpiresIn?: number }) =>
    api.post(`/admin/users/${id}/ban`, body),
  unban: (id: string) => api.post(`/admin/users/${id}/unban`),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
  impersonate: (id: string) => api.post(`/admin/users/${id}/impersonate`),
  stopImpersonate: () => api.post('/admin/users/me/stop-impersonating'),
  listSessions: (id: string) => api.get(`/admin/users/${id}/sessions`),
  revokeSession: (token: string) => api.delete(`/admin/users/sessions/${token}`),
  revokeAllSessions: (id: string) => api.post(`/admin/users/${id}/sessions/revoke-all`),
  update: (id: string, body: unknown) => api.patch(`/admin/users/${id}`, body),
  setPassword: (id: string, newPassword: string) =>
    api.post(`/admin/users/${id}/password`, { newPassword }),
  updateBasicInfo: (id: string, body: unknown) => api.patch(`/admin/users/${id}/basic-info`, body),
  updateStatus: (id: string, body: unknown) => api.patch(`/admin/users/${id}/status`, body),
  updateBanStatus: (id: string, body: unknown) => api.patch(`/admin/users/${id}/ban-status`, body),
  updateImage: (id: string, image?: string | null) =>
    api.patch<AdminUserRow>(`/admin/users/${id}/image`, { image }),
  toggleBlocked: (id: string, blocked: boolean) =>
    api.post(`/admin/users/${id}/blocked/toggle`, { blocked }),
  toggleConfirmed: (id: string, confirmed: boolean) =>
    api.post(`/admin/users/${id}/confirmed/toggle`, { confirmed }),
  updateStep: (id: string, step: string) => api.patch(`/admin/users/${id}/journey-step`, { step }),
  stats: () => api.get<AdminUserStats>('/admin/users/stats'),
  updateAccount: (id: string, body: unknown) => api.patch(`/admin/users/${id}/account`, body),
};

export const adminTeam = {
  list: () => api.get<AdminTeamMember[]>('/admin/team'),
  search: (params: { search: string; limit?: number }) =>
    api.get<AdminTeamMember[]>('/admin/team/search', { query: params }),
  assignRole: (userId: string, role: string) =>
    api.post(`/admin/team/${userId}/role`, { role }),
  removeRole: (userId: string) => api.delete(`/admin/team/${userId}/role`),
};

// ---- profiles (rows 205-222) --------------------------------------------

export const adminProfiles = {
  list: (q: Record<string, unknown> = {}) =>
    api.get<AdminProfilesListResponse>('/admin/profiles', { query: q as Record<string, string | number | boolean | undefined | null> }),
  get: (id: string) => api.get(`/admin/profiles/${id}`),
  update: (id: string, body: unknown) => api.patch(`/admin/profiles/${id}`, body),
  delete: (id: string) => api.delete(`/admin/profiles/${id}`),
  togglePublished: (id: string) => api.post(`/admin/profiles/${id}/published/toggle`),
  toggleFeatured: (id: string) => api.post(`/admin/profiles/${id}/featured/toggle`),
  toggleVerified: (id: string) => api.post(`/admin/profiles/${id}/verified/toggle`),
  // OLD updateVerificationStatus (actions/admin/profiles.ts:517) is profile-scoped
  // and upserts a verification when one does not exist.
  updateVerificationStatus: (id: string, body: { status: 'PENDING' | 'APPROVED' | 'REJECTED'; notes?: string }) =>
    api.patch(`/admin/profiles/${id}/verification-status`, body),
  search: (searchQuery: string) =>
    api.get<AdminProfileRow[]>('/admin/profiles/search', { query: { searchQuery } }),
  searchForServices: (searchQuery: string) =>
    api.get<AdminProfileRow[]>('/admin/profiles/search/for-services', { query: { searchQuery } }),
  stats: () => api.get<AdminProfileStats>('/admin/profiles/stats'),
  brevoStats: () => api.get<AdminBrevoStats>('/admin/profiles/brevo-stats'),
  updateSettings: (id: string, body: unknown) => api.patch(`/admin/profiles/${id}/settings`, body),
  updateBasicInfo: (id: string, body: unknown) => api.patch(`/admin/profiles/${id}/basic-info`, body),
  updateAdditionalInfo: (id: string, body: unknown) => api.patch(`/admin/profiles/${id}/additional-info`, body),
  updatePresentation: (id: string, body: unknown) => api.patch(`/admin/profiles/${id}/presentation`, body),
  updatePortfolio: (id: string, portfolio: unknown[]) =>
    api.patch(`/admin/profiles/${id}/portfolio`, { portfolio }),
  updateCoverage: (id: string, coverage: unknown) =>
    api.patch(`/admin/profiles/${id}/coverage`, { coverage }),
  updateBilling: (id: string, body: unknown) => api.patch(`/admin/profiles/${id}/billing`, body),
};

// ---- verifications (rows 184-188) ---------------------------------------

export const adminVerifications = {
  list: (q: Record<string, unknown> = {}) =>
    api.get<AdminVerificationsListResponse>('/admin/verifications', { query: q as Record<string, string | number | boolean | undefined | null> }),
  get: (id: string) => api.get(`/admin/verifications/${id}`),
  updateStatus: (id: string, body: { status: 'PENDING' | 'APPROVED' | 'REJECTED'; notes?: string }) =>
    api.patch(`/admin/verifications/${id}/status`, body),
  delete: (id: string) => api.delete(`/admin/verifications/${id}`),
  stats: () => api.get<AdminVerificationStats>('/admin/verifications/stats'),
};

// ---- services (rows 189-204) --------------------------------------------

export const adminServices = {
  list: (q: Record<string, unknown> = {}) =>
    api.get<AdminServicesListResponse>('/admin/services', { query: q as Record<string, string | number | boolean | undefined | null> }),
  get: (id: number) => api.get(`/admin/services/${id}`),
  update: (id: number, body: unknown) => api.patch(`/admin/services/${id}/`, body),
  delete: (id: number) => api.delete(`/admin/services/${id}`),
  taxonomy: (id: number, body: unknown) => api.patch(`/admin/services/${id}/taxonomy`, body),
  basic: (id: number, body: unknown) => api.patch(`/admin/services/${id}/basic`, body),
  pricing: (id: number, body: unknown) => api.patch(`/admin/services/${id}/pricing`, body),
  settings: (id: number, body: unknown) => api.patch(`/admin/services/${id}/settings`, body),
  addons: (id: number, addons: unknown[]) => api.patch(`/admin/services/${id}/addons`, { addons }),
  faq: (id: number, faq: unknown[]) => api.patch(`/admin/services/${id}/faq`, { faq }),
  media: (id: number, media: unknown[]) => api.patch(`/admin/services/${id}/media`, { media }),
  togglePublished: (id: number) => api.post(`/admin/services/${id}/published/toggle`),
  toggleFeatured: (id: number) => api.post(`/admin/services/${id}/featured/toggle`),
  status: (id: number, body: { status: string; rejectionReason?: string }) =>
    api.patch(`/admin/services/${id}/status`, body),
  stats: () => api.get<AdminServiceStats>('/admin/services/stats'),
  createForProfile: (body: unknown) => api.post('/admin/services/for-profile', body),
};

// ---- reviews (rows 171-177) ---------------------------------------------

export const adminReviews = {
  list: (q: Record<string, unknown> = {}) =>
    api.get<AdminReviewsListResponse>('/admin/reviews', { query: q as Record<string, string | number | boolean | undefined | null> }),
  get: (id: string) => api.get(`/admin/reviews/${id}`),
  updateStatus: (id: string, body: { status: 'pending' | 'approved' | 'rejected'; notes?: string }) =>
    api.patch(`/admin/reviews/${id}/status`, body),
  delete: (id: string) => api.delete(`/admin/reviews/${id}`),
  stats: () => api.get<AdminReviewStats>('/admin/reviews/stats'),
  toggleVisibility: (id: string) => api.post(`/admin/reviews/${id}/visibility/toggle`),
  pending: (params: { page?: number; limit?: number } = {}) =>
    api.get<AdminReviewsListResponse>('/admin/reviews/pending', { query: params }),
};

// ---- subscriptions (rows 178-183) ---------------------------------------

export const adminSubscriptions = {
  list: (q: Record<string, unknown> = {}) =>
    api.get<AdminSubscriptionsListResponse>('/admin/billing', { query: q as Record<string, string | number | boolean | undefined | null> }),
  get: (id: string) => api.get(`/admin/billing/${id}`),
  payments: (id: string, page = 1) =>
    api.get(`/admin/billing/${id}/payments`, { query: { page } }),
  status: (id: string, status: string) => api.patch(`/admin/billing/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/admin/billing/${id}`),
  stats: () => api.get<AdminSubscriptionStats>('/admin/billing/stats'),
  manual: (body: { profileId: string; endDate: string }) => api.post('/admin/billing/manual', body),
};

// ---- chats (rows 139-143) -----------------------------------------------

export const adminChats = {
  stats: () => api.get('/admin/chats/stats'),
  list: (q: Record<string, unknown> = {}) =>
    api.get('/admin/chats', { query: q as Record<string, string | number | boolean | undefined | null> }),
  get: (id: string) => api.get(`/admin/chats/${id}`),
  chatStats: (id: string) => api.get(`/admin/chats/${id}/stats`),
  messages: (id: string, q: Record<string, unknown> = {}) =>
    api.get<AdminChatMessagesResponse>(`/admin/chats/${id}/messages`, { query: q as Record<string, string | number | boolean | undefined | null> }),
};

// ---- blog (rows 244-248) ------------------------------------------------

/** GET /admin/blog/articles — apps/blog/services/articles.list_admin */
export interface BlogArticleAdminListResponse {
  articles: BlogArticleAdmin[];
  total: number;
  totalPages: number;
}

export const adminBlog = {
  list: (q: Record<string, unknown> = {}) =>
    api.get<BlogArticleAdminListResponse>('/admin/blog/articles', { query: q as Record<string, string | number | boolean | undefined | null> }),
  create: (body: unknown) => api.post('/admin/blog/articles', body),
  get: (id: string) => api.get(`/admin/blog/articles/${id}`),
  update: (id: string, body: unknown) => api.patch(`/admin/blog/articles/${id}`, body),
  delete: (id: string) => api.delete(`/admin/blog/articles/${id}`),
};

// ---- taxonomy / git (rows 223-242) --------------------------------------

export const adminTaxonomy = {
  // Skills
  createSkill: (body: { label: string; slug?: string; category?: string }) =>
    api.post('/admin/skills', body),
  updateSkill: (id: string, body: unknown) => api.patch(`/admin/skills/${id}`, body),
  deleteSkill: (id: string) => api.delete(`/admin/skills/${id}`),
  // Tags
  createTag: (body: { label: string; slug?: string }) => api.post('/admin/tags', body),
  updateTag: (id: string, body: unknown) => api.patch(`/admin/tags/${id}`, body),
  deleteTag: (id: string) => api.delete(`/admin/tags/${id}`),
  // Service / pro taxonomies
  createServiceTax: (body: unknown) => api.post('/admin/taxonomies/services', body),
  updateServiceTax: (id: string, body: unknown) =>
    api.patch(`/admin/taxonomies/services/${id}`, body),
  createProTax: (body: unknown) => api.post('/admin/taxonomies/pros', body),
  updateProTax: (id: string, body: unknown) => api.patch(`/admin/taxonomies/pros/${id}`, body),
  deleteServiceTax: (id: string) => api.delete(`/admin/taxonomies/services/${id}`),
  deleteProTax: (id: string) => api.delete(`/admin/taxonomies/pros/${id}`),
  commit: (body: { changes: unknown[]; overallMessage: string }) =>
    api.post('/admin/taxonomies/commit', body),
  revalidate: () => api.post('/admin/taxonomies/revalidate'),
};

// ---- API keys + navigation (rows 132-138) -------------------------------

export const adminApi = {
  validateKey: (apiKey: string) => api.post('/admin/api-keys/validate', { apiKey }, { anonymous: true }),
  list: () => api.get<AdminApiKeyRow[]>('/admin/api-keys'),
  create: (body: { name: string; expiresIn?: number; metadata?: unknown }) =>
    api.post<AdminApiKeyCreated>('/admin/api-keys', body),
  update: (id: string, body: { name?: string; enabled?: boolean }) =>
    api.patch(`/admin/api-keys/${id}`, body),
  delete: (id: string) => api.delete(`/admin/api-keys/${id}`),
  myAccess: () => api.get('/admin/api-keys/me/access'),
  navigation: () => api.get<{ items: { key: string; label: string; href: string; resource: string }[] }>('/admin/navigation'),
};

// ---- Taxonomy submission moderation -------------------------------------

export const adminTaxonomySubmissions = {
  list: (q: Record<string, unknown> = {}) =>
    api.get('/admin/taxonomy/submissions', {
      query: q as Record<string, string | number | boolean | undefined | null>,
    }),
  stats: () => api.get<AdminTaxonomySubmissionStats>('/admin/taxonomy/submissions/stats'),
  approve: (id: string) => api.post(`/admin/taxonomy/submissions/${id}/approve`),
  // OLD reject reason is optional (admin/taxonomy-submission.ts:366-368).
  reject: (id: string, reason?: string) =>
    api.post(`/admin/taxonomy/submissions/${id}/reject`, { reason }),
  bulkApprove: (ids: string[]) =>
    api.post('/admin/taxonomy/submissions/bulk-approve', { ids }),
  bulkReject: (ids: string[], reason?: string) =>
    api.post('/admin/taxonomy/submissions/bulk-reject', { ids, reason }),
};

// ---- Cache revalidation ---------------------------------------------------

export const adminCache = {
  revalidateAll: () => api.post('/admin/cache/revalidate-all'),
};
