/**
 * ADMIN API RESPONSE TYPES
 *
 * Hand-written interfaces matching the exact JSON the Django backend returns
 * for every `/api/admin/*` endpoint. Derived from the per-app selector/service
 * functions and serializers (apps/<x>/services/admin_*.py,
 * apps/<x>/selectors/admin_*.py, apps/<x>/serializers/admin_*.py).
 *
 * These are the source of truth used to type `@/lib/api/admin` and therefore
 * every admin server action's ActionResult<T>.
 */

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** GET /admin/users/stats — apps/accounts/selectors/admin_users.get_user_stats */
export interface AdminUserStats {
  total: number;
  active: number;
  banned: number;
  blocked: number;
  unverified: number;
  byStep: Record<string, number>;
  byProvider: Record<string, number>;
  /** keys: "user", "pro" (UserType values). */
  byType: Record<string, number>;
}

/** A row in GET /admin/users — apps/accounts/serializers/admin_users.AdminUserSerializer */
export interface AdminUserRow {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  username: string | null;
  displayUsername: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  step: string;
  confirmed: boolean;
  blocked: boolean;
  banned: boolean;
  banExpires: string | null;
  banReason: string | null;
  testUser: boolean;
  type: string;
  role: string;
  provider: string;
  lastUnreadEmailSentAt: string | null;
  lastUsernameChangeAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /admin/users — apps/accounts/views/admin/users.AdminUserListCreateView */
export interface AdminUsersListResponse {
  users: AdminUserRow[];
  total: number;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

/** GET /admin/profiles/stats — apps/profiles/services/admin_profiles.get_profile_stats */
export interface AdminProfileStats {
  total: number;
  published: number;
  featured: number;
  verified: number;
  unverified: number;
  top: number;
  professional: number;
  company: number;
}

/** Nested user summary on profile rows. */
export interface AdminProfileRowUser {
  id: string;
  email: string;
  name: string;
  role: string;
  blocked: boolean;
  confirmed: boolean;
}

/** A row in GET /admin/profiles — apps/profiles/services/admin_profiles._admin_profile_row */
export interface AdminProfileRow {
  id: string;
  uid: string;
  username: string;
  displayName: string;
  email: string | null;
  type: string;
  category: string | null;
  subcategory: string | null;
  image: string | null;
  published: boolean;
  isActive: boolean;
  verified: boolean;
  featured: boolean;
  top: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  user: AdminProfileRowUser | null;
  _count: { services: number; reviews: number };
  /**
   * Only present on the profile-detail payload (and absent on list rows). Kept
   * optional so the admin table can render the taxonomy column when available.
   */
  taxonomyLabels?: {
    category: string;
    subcategory: string;
    subdivision?: string;
  };
}

/** GET /admin/profiles */
export interface AdminProfilesListResponse {
  profiles: AdminProfileRow[];
  total: number;
  limit: number;
  offset: number;
}

/** GET /admin/profiles/brevo-stats — apps/profiles/services/admin_profiles.get_brevo_stats */
export interface AdminBrevoStats {
  users: number;
  emptyProfile: number;
  noServices: number;
  activePros: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Verifications
// ---------------------------------------------------------------------------

/** GET /admin/verifications/stats — apps/profiles/services/admin_profiles.get_verification_stats */
export interface AdminVerificationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

/** A row in GET /admin/verifications — apps/profiles/services/admin_profiles._verification_row */
export interface AdminVerificationRow {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  afm: string | null;
  name: string | null;
  address: string | null;
  phone: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  profile: {
    id: string | null;
    username: string | null;
    displayName: string | null;
    email: string | null;
  };
  user: { id: string; email: string } | null;
}

/** GET /admin/verifications */
export interface AdminVerificationsListResponse {
  verifications: AdminVerificationRow[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

/** GET /admin/services/stats — apps/services/services/admin_services.get_service_stats */
export interface AdminServiceStats {
  total: number;
  published: number;
  draft: number;
  pending: number;
  rejected: number;
  approved: number;
  inactive: number;
  featured: number;
  topCategory: { name: string; count: number } | null;
  topSubcategory: { name: string; count: number } | null;
  topSubdivision: { name: string; count: number } | null;
  topTag: { name: string; count: number } | null;
  serviceTypes: {
    presence: number;
    online: number;
    oneoff: number;
    onbase: number;
    subscription: number;
    onsite: number;
  };
  pricing: {
    fixed: number;
    notFixed: number;
    subscriptionTypes: Record<string, number>;
    averageDuration: number;
    averagePrice: number;
  };
}

/** Service "type" flags object. */
export interface AdminServiceTypeFlags {
  presence: boolean;
  online: boolean;
  oneoff: boolean;
  onbase: boolean;
  subscription: boolean;
  onsite: boolean;
}

/** A row in GET /admin/services — apps/services/services/admin_services._admin_row */
export interface AdminServiceRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  subcategory: string | null;
  subdivision: string | null;
  tags: string[];
  fixed: boolean;
  price: number | null;
  type: AdminServiceTypeFlags;
  subscriptionType: string | null;
  duration: number | null;
  media: AppJson.Media | null;
  featured: boolean;
  rating: number;
  reviewCount: number;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  refreshedAt: string | null;
  profile: {
    id: string | null;
    username: string | null;
    displayName: string | null;
  } | null;
  /**
   * Only present on the service-detail payload (absent on list rows). Optional
   * so the admin table can render the taxonomy column when available.
   */
  taxonomyLabels?: {
    category: string;
    subcategory: string;
    subdivision: string;
  };
}

/** GET /admin/services */
export interface AdminServicesListResponse {
  services: AdminServiceRow[];
  total: number;
  page: number;
  limit: number;
  offset: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

/** GET /admin/reviews/stats — apps/reviews/views/admin/reviews.AdminReviewStatsView */
export interface AdminReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

/** A row in GET /admin/reviews — apps/reviews/selectors/review_reads._admin_card */
export interface AdminReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  type: string;
  published: boolean;
  visibility: boolean;
  sid: number | null;
  pid: string | null;
  authorId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  author: {
    id: string | null;
    name: string | null;
    email: string | null;
    displayName: string | null;
    image: string | null;
  } | null;
  profile: {
    id: string | null;
    displayName: string | null;
    username: string | null;
    image: string | null;
  } | null;
  service: { id: number | null; title: string; slug: string } | null;
}

/** GET /admin/reviews */
export interface AdminReviewsListResponse {
  reviews: AdminReviewRow[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// Subscriptions / billing
// ---------------------------------------------------------------------------

/** GET /admin/billing/stats — apps/billing/services/subscription_ops.admin_stats */
export interface AdminSubscriptionStats {
  total: number;
  active: number;
  canceled: number;
  pastDue: number;
}

/** Nested profile on a subscription row. */
export interface AdminSubscriptionRowProfile {
  id: string;
  username: string;
  displayName: string | null;
  image: string | null;
  email: string | null;
  user: { id: string; email: string; name: string; role: string } | null;
}

/** A row in GET /admin/billing — apps/billing/services/subscription_ops._row */
export interface AdminSubscriptionRow {
  id: string;
  pid: string;
  profileId: string;
  provider: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  worldlineToken: string | null;
  worldlineTokenExp: string | null;
  worldlineMasterOrderId: string | null;
  plan: string;
  status: string;
  billingInterval: string;
  billing: AppJson.BillingInfo | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  amount: number | null;
  currency: string | null;
  paymentMethodType: string | null;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  totalPaidLifetime: number | null;
  paymentCount: number | null;
  firstPaymentAt: string | null;
  lastPaymentAt: string | null;
  discountCode: string | null;
  discountPercentOff: number | null;
  discountAmountOff: number | null;
  profile: AdminSubscriptionRowProfile | null;
}

/** GET /admin/billing */
export interface AdminSubscriptionsListResponse {
  subscriptions: AdminSubscriptionRow[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// Chats / messaging
// ---------------------------------------------------------------------------

/** A row in GET /admin/chats/{id}/messages — apps/messaging/views/admin/chats._msg */
export interface AdminChatMessageRow {
  id: string;
  content: string | null;
  authorId: string;
  createdAt: string;
  deleted: boolean;
  edited: boolean;
}

/** GET /admin/chats/{id}/messages */
export interface AdminChatMessagesResponse {
  messages: AdminChatMessageRow[];
  total: number;
}

// ---------------------------------------------------------------------------
// Taxonomy submissions
// ---------------------------------------------------------------------------

/** GET /admin/taxonomy/submissions/stats — apps/taxonomy/services/admin_submissions.stats */
export interface AdminTaxonomySubmissionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

/** apps/admin_api/services/api_keys._row */
export interface AdminApiKeyRow {
  id: string;
  name: string;
  start: string;
  prefix: string;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

/** POST /admin/api-keys — _row plus the raw secret. */
export interface AdminApiKeyCreated extends AdminApiKeyRow {
  key: string;
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

/** GET /admin/team, /admin/team/search — apps/accounts/serializers/admin_users.AdminTeamMemberSerializer */
export interface AdminTeamMember {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  role: string;
  image: string | null;
  createdAt: string;
}
