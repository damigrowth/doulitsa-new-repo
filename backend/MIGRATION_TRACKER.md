# MIGRATION TRACKER — Next.js → Django REST Framework

**Source project:** `/Users/sereth/Desktop/nextjs/`
**Target project:** `/Users/sereth/Desktop/django-backend/` (this directory)
**Started:** 2026-05-14

> **THIS FILE IS THE SOURCE OF TRUTH.** Update it after every endpoint migration.
> Never delete rows. Never reorder. Only update `Status` and `Notes`.
> If a new endpoint is discovered, ADD IT before doing anything else.

---

## Status legend

| Symbol | Meaning |
|---|---|
| ⬜ Not started | Tracker row exists, no Django code written |
| 🟡 In progress | Currently being migrated |
| ✅ Done | Endpoint code merged (model + service + serializer + view + URL) |
| 🧪 Tested | Has at least one happy-path test + one auth/permission test |
| 📘 Documented | Appears correctly in `drf-spectacular` schema (`/api/schema/`) |

**An endpoint is "complete" only when status is `📘 Documented`.**

---

## Counts

| Surface | Count |
|---|---|
| App Router REST routes (Section 1) | 14 |
| Server-action endpoints (Sections 2.1–2.13) | 234 |
| **Total endpoint rows (1–248)** | **248** |
| Internal helpers (utility ports, not endpoints) | ~45 (H1–H11 batches) |
| Database model rows (Section 3, M1–M24) | 24 |
| Middleware rows (Section 4, MW1–MW5) | 5 |
| Async task rows (Section 5, T1–T4) | 4 |
| WebSocket consumer rows (Section 2.6) | 2 |
| **Grand total tracker items** | **328** |

> Per-function audit of `src/actions/**` found ~290 exported async functions (less than the ~335 initial grep estimate, which double-counted re-exports). Of those, ~45 are internal helpers (`requireAuth`, `getCurrentUser`, Octokit wrappers, etc.) that become Django utilities/permissions rather than REST endpoints. Helpers are listed inline as `H1`–`H11` batches with status `N/A — utility port`. The ~245 user-invokable functions, plus the 14 REST routes, were collapsed where possible (e.g. `*Action` FormData variants merge into their JSON sibling) — final endpoint count is 248.

---

## Tracker progress

`Endpoints fully done (📘 Documented):` **0 / 248**
`Endpoints with code (✅ Done):` **248 / 248** (100%) 🎉
`Endpoints in progress (🟡):` **0**
`Models migrated:` **24 / 24** (all migrated) (User, Profile, Session, Account, Verification, ProfileVerification, Jwks, PendingRegistration, ApiKey, Media, SavedService, SavedProfile)

---

# Section 1 — App Router REST routes (14)

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | GET, POST | `/api/auth/[...all]` | Better Auth catch-all (login, register, OAuth, sessions, password reset) | Better Auth protocol | Better Auth protocol | mixed | User, Session, Account, Verification | Better Auth, Brevo (emails), Google OAuth | Issues session cookies | accounts | ✅ | Replace with allauth + simplejwt routes (`/api/auth/login/`, `/api/auth/register/`, `/api/auth/google/`, `/api/auth/token/refresh/`, etc.). Single catch-all becomes ~10 explicit DRF endpoints. |
| 2 | POST, GET | `/api/auth/exchange-token` | Exchange Better Auth token for Supabase-signed JWT for RLS | `{ }` (cookie auth) | `{ token: string }` | session | User | Better Auth JWT plugin | Mints JWT for Supabase RLS | accounts | ✅ | If Supabase Realtime is replaced by Channels, this endpoint becomes obsolete. Keep until messaging app cuts over. |
| 3 | GET | `/api/verify-email` | Custom email-verification redirect wrapper | `?token=<>` | 302 redirect | none | User | Better Auth | Verifies user, redirects to onboarding/dashboard | accounts | ✅ | Becomes `GET /api/auth/verify-email/?token=<>` |
| 4 | POST | `/api/sign-cloudinary-params` | Sign Cloudinary upload params for unsigned client uploads | `{ paramsToSign: object }` | `{ signature: string }` | session | — | Cloudinary | Returns signed params | media | ✅ | Direct port; uses `cloudinary.utils.api_sign_request` |
| 5 | GET | `/api/payments/check-access` | Check if user can access payments (test mode + feature gate) | (cookie auth) | `{ allowed: boolean, reason?: string }` | session | User | — | none | billing | ✅ |  |
| 6 | GET | `/api/payment/worldline/redirect` | Auto-submitting form redirect to Cardlink hosted payment page | `?session=<id>` | HTML form (auto-submit) | session | Subscription | Worldline/Cardlink | Renders 200 OK with HTML | billing | ✅ | Returns `text/html`; mark as renderer override in DRF |
| 7 | POST | `/api/webhooks/worldline` | Worldline payment callback (subscription updates) | Worldline signed payload | `200 OK` | webhook signature | Subscription, Profile | Worldline | Updates subscription, sends email | billing | ✅ | Auth via HMAC-style signature header — implement custom auth class |
| 8 | POST | `/api/webhooks/revalidate-cache` | Vercel deployment webhook to revalidate Next.js caches | Vercel webhook payload | `200 OK` | shared secret | — | Vercel | Calls `revalidateAllCaches()` | core | ✅ | In Django, no Next.js cache to revalidate. Becomes a no-op or removed; keep tracker row to confirm decision. |
| 9 | POST | `/api/cron/auto-refresh` | Daily cron: auto-refresh promoted subscribers' services | Vercel cron header | `{ refreshed: number }` | cron secret | Service, Profile, Subscription | — | Bulk update `refreshedAt` | services | ✅ | Becomes a Celery beat task `services.tasks.auto_refresh_promoted` + admin trigger endpoint |
| 10 | GET | `/api/cron/process-email-batches` | 15-min cron: send unread-message email digests | Vercel cron header | `{ processed: number }` | cron secret | EmailBatch, Message, Chat, ChatMember, User | Brevo | Sends emails, updates EmailBatch | messaging | ✅ | Becomes Celery beat task `messaging.tasks.process_email_batches` |
| 11 | GET | `/api/cron/worldline-renewals` | Daily cron: process recurring Worldline charges with retry | Vercel cron header | `{ processed: number, succeeded: number, failed: number }` | cron secret | Subscription | Worldline, Brevo | Charges cards, sends receipts/failure notices | billing | ✅ | Becomes Celery beat task `billing.tasks.process_worldline_renewals` |
| 12 | GET | `/sitemap.xml` | Top-level sitemap reference | — | XML | none | — | — | — | core | ✅ | Use Django sitemap framework |
| 13 | GET | `/(sitemap)/sitemap_index.xml` | Sitemap index (paginated sitemap shards) | — | XML | none | Service, Profile, BlogArticle | — | Reads paginated counts | core | ✅ |  |
| 14 | GET | `/sitemap_static.xml` | Static-only sitemap fallback (about, contact, etc.) | — | XML | none | — | — | — | core | ✅ |  |

---

# Section 2 — Server actions → DRF endpoints

Per-row format same as Section 1. HTTP method derived per the convention in the plan.

## 2.1 — App: `accounts` (auth + user account management)

### From `src/actions/auth/`

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 15 | POST | `/api/auth/login` | Email/password login | `{ identifier, password }` | `{ user, redirectPath }` | none | User, Session | Better Auth | Issues access+refresh tokens | accounts | ✅ | Use `simplejwt` `TokenObtainPairView` w/ custom serializer; `redirectPath` derived server-side |
| 16 | POST | `/api/auth/register` | Register new user (simple or pro) | `{ email, username, password, displayName, authType, role?, consent[] }` | `{ message }` (302 to verify-email) | none | User | Better Auth, Brevo | Sends verification email | accounts | ✅ |  |
| 17 | POST | `/api/auth/password/change` | Change current user's password | `{ currentPassword, newPassword, confirmPassword }` | `{ message }` | session | User | — | Invalidates other sessions | accounts | ✅ |  |
| 18 | POST | `/api/auth/username/change` | Change username (pro only, 7-day cooldown) | `{ newUsername, confirmUsername }` | `{ newUsername, nextChangeDate }` | session+role(pro) | User, Profile | — | Cache invalidation | accounts | ✅ |  |
| 19 | POST | `/api/auth/onboarding/complete` | Finalize professional onboarding (image, bio, category, coverage, portfolio) | `{ image?, bio, category, subcategory, coverage, portfolio[] }` | `{ message }` | session+role(pro) | User, Profile | Brevo | Step ONBOARDING→DASHBOARD | accounts | ✅ |  |
| 20 | DELETE | `/api/auth/account` | Delete own account (cascade) | `{ username, confirmUsername }` | `{ success }` | session | User, Account, Session | Brevo | GDPR cleanup | accounts | ✅ |  |
| 21 | POST | `/api/auth/password/forgot` | Send password reset email (rate-limited) | `{ email }` | `{ success }` | none | User | Better Auth, Brevo | Sends reset email | accounts | ✅ | Throttle scope: `password_reset` |
| 22 | POST | `/api/auth/verification/resend` | Resend verification email | `{ email }` | `{ success }` | none | User | Better Auth, Brevo | Sends verification email | accounts | ✅ | Throttle scope: `verification_resend` |
| 23 | POST | `/api/auth/password/reset` | Reset password via token | `{ token, newPassword }` | `{ message }` | none | User | Better Auth | Updates password | accounts | ✅ |  |
| 24 | GET | `/api/auth/maintenance` | Check maintenance status | — | `{ isUnderMaintenance, message? }` | none | — | — | — | core | ✅ | Move to `core` app — global concern |
| 25 | POST | `/api/auth/oauth/intent` | Store OAuth registration intent in cookie | `{ type: user\|pro, role? }` | `{ success }` | none | — | — | Sets httpOnly cookie | accounts | ✅ |  |
| 26 | GET | `/api/auth/oauth/intent` | Read & clear OAuth intent cookie | — | `{ intent }` | none | — | — | Clears cookie | accounts | ✅ |  |
| 27 | POST | `/api/auth/oauth/setup` | Complete OAuth registration (username, type, role) | `{ username, displayName, role, type }` | `{ message }` | session | User, Profile | Better Auth, Brevo | Creates profile | accounts | ✅ |  |
| 28 | POST | `/api/auth/upgrade-to-pro` | Upgrade simple user → professional | `{ username, role: freelancer\|company }` | `{ message }` | session+role(user) | User | Brevo | Step → ONBOARDING | accounts | ✅ |  |
| 29 | PATCH | `/api/auth/account` | Update own display name and/or image | `{ displayName?, image? }` | `{ message }` | session | User, Profile | — | Cache invalidation | accounts | ✅ |  |
| 30 | PATCH | `/api/auth/user-type` | Update user type/role after OAuth type selection | `{ userId, type, role? }` | `{ success }` | session | User | — | step → OAUTH_SETUP | accounts | ✅ | Internal post-OAuth flow; keep server-side authz |
| 31 | GET | `/api/auth/session` | Get current session + user | — | `{ user, session }` | optional | User, Session | — | — | accounts | ✅ | Replaces Better Auth's session inspection |
| 32 | GET | `/api/auth/me` | Get current user with profile | — | `{ user, profile, session }` | optional | User, Profile | — | — | accounts | ✅ |  |

### Internal helpers (no endpoint — port to Django utilities/permissions)

| # | Function | Source | Where it lands | Status |
|---|---|---|---|---|
| H1 | `getSession`, `getCurrentSession`, `getCurrentUser`, `getFreshServerSession` | `actions/auth/server.ts` | `apps/accounts/services/session.py` (DB read) + DRF authentication classes derive from request | N/A — utility port |
| H2 | `hasRole`, `hasAnyRole`, `isAdmin`, `isProfessional`, `isProUser`, `hasAdminRole` | `actions/auth/server.ts` | `apps/accounts/permissions/roles.py` (DRF permission classes: `IsAdmin`, `IsProfessional`, `HasRole(role)`, `HasAnyRole(roles)`) | N/A — utility port |
| H3 | `requireAuth`, `requireRole`, `requireAdmin`, `requireAnyRole`, `requireOnboardingComplete`, `requireRoleRedirect`, `requireEmailVerified`, `requireProfileComplete`, `requireProUser` | `actions/auth/server.ts` | DRF permission classes + middleware (no redirects — return 401/403 JSON) | N/A — utility port |
| H4 | `redirectOnboardingUsers`, `redirectCompletedUsers`, `redirectOAuthUsersToSetup` | `actions/auth/server.ts` | Frontend concern; not a backend endpoint | N/A — frontend |
| H5 | `hasPermission`, `canEditResource`, `hasFullPermission`, `requirePermission`, `requireEditPermission`, `requireFullPermission` | `actions/auth/server.ts` | `apps/accounts/permissions/admin.py` (`HasResourcePermission(resource, level)`) | N/A — utility port |
| H6 | `getAdminNavigationItems`, `canViewNavItem` | `actions/auth/server.ts` | `apps/admin_api/services/navigation.py` (returned from `/api/admin/navigation/`) | N/A — folded into admin_api endpoint |
| H7 | `canAccessApplication` | `actions/auth/maintenance.ts` | Folded into maintenance endpoint (#24) | N/A — folded |
| H8 | `resetUserPassword` | `actions/auth/reset-password.ts` | Same as #23 (programmatic variant) | N/A — duplicate of #23 |

---

## 2.2 — App: `profiles`

### From `src/actions/profiles/` (public-facing)

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 33 | PATCH | `/api/profiles/me/additional-info` | Update rate, experience, contact/payment methods | `{ rate?, commencement?, contactMethods?, paymentMethods?, settlementMethods?, budget?, terms? }` | `{ message }` | session+role(pro) | Profile | — | Cache invalidation | profiles | ✅ |  |
| 34 | PATCH | `/api/profiles/me/basic-info` | Update tagline, bio, category, subcategory, skills | `{ tagline?, bio?, category, subcategory, speciality?, image?, skills?, coverage? }` | `{ message }` | session+role(pro) | Profile | — | Cache invalidation | profiles | ✅ |  |
| 35 | PATCH | `/api/profiles/me/billing` | Update billing/invoice info (AFM, DOY, address) | `{ receipt, invoice, afm?, doy?, name?, profession?, address? }` | `{ message }` | session+role(pro\|admin) | Profile | — | Cache invalidation | profiles | ✅ |  |
| 36 | PATCH | `/api/profiles/me/coverage` | Update service coverage areas | `{ coverage: { online, onbase, onsite, address?, area?, county?, zipcode?, counties[]?, areas[]? } }` | `{ message }` | session+role(pro) | Profile | — | Cache invalidation | profiles | ✅ |  |
| 37 | PATCH | `/api/profiles/me/portfolio` | Update portfolio media | `{ portfolio: CloudinaryResource[] }` | `{ message }` | session+role(pro) | Profile | Cloudinary | Sanitization | profiles | ✅ |  |
| 38 | PATCH | `/api/profiles/me/presentation` | Update visibility, contact, socials | `{ phone?, website?, viber?, whatsapp?, visibility?, socials? }` | `{ message }` | session+role(pro) | Profile | — | Cache invalidation | profiles | ✅ |  |
| 39 | GET | `/api/profiles/me/presentation` | Get own presentation data | — | `{ id, phone, website, viber, whatsapp, visibility, socials }` | session | Profile | — | — | profiles | ✅ |  |
| 40 | GET | `/api/profiles/directory` | Directory page data (popular subcategories + categories) | `?limit=&categorySlug=&subcategorySlug=` | `{ popularSubcategories[], categories[] }` | none | Profile | — | — | profiles | ✅ |  |
| 41 | GET | `/api/profiles/me` | Get authenticated user's profile | — | `Profile` | session | Profile | — | — | profiles | ✅ | Was `getProfileByUserId` |
| 42 | GET | `/api/profiles/by-username/{username}` | Public profile by username | — | `Profile` | none | Profile | — | — | profiles | ✅ |  |
| 43 | GET | `/api/profiles/page/{username}` | Profile detail page bundle (taxonomy + services + reviews) | — | `ProfilePageData` | none | Profile, Service, Review | — | — | profiles | ✅ | Heavy aggregation; selector |
| 44 | POST | `/api/profiles/search` | Filtered list with pagination & sorting | `{ category?, subcategory?, role?, online?, county?, search?, page?, limit?, sortBy? }` | `{ profiles[], total, hasMore }` | none | Profile, User | — | — | profiles | ✅ | POST because filter payload is complex |
| 45 | POST | `/api/profiles/count` | Count profiles matching filters | `ProfileFilters (partial)` | `number` | none | Profile | — | — | profiles | ✅ |  |
| 46 | POST | `/api/profiles/archive` | Archive page bundle (pros/companies/directory) | `{ archiveType?, categorySlug?, subcategorySlug?, limit?, searchParams }` | `{ profiles, total, hasMore, taxonomyData, breadcrumbData, counties, filters, availableSubcategories }` | none | Profile, User, ProfileVerification | — | — | profiles | ✅ |  |
| 47 | GET | `/api/profiles/taxonomy-paths` | All slug paths for SSG (cached 24h) | `?role=` | `[{ category?, subcategory? }]` | none | Profile | — | — | profiles | ✅ |  |
| 48 | POST | `/api/profiles/lookup-afm` | Greek AFM (tax ID) lookup via AADE SOAP | `{ afm }` | `{ companyInfo... }` | session | — | AADE SOAP | — | profiles | ✅ | Implement SOAP client; cache results |
| 49 | POST | `/api/profiles/{id}/report` | Report inappropriate profile | `{ profileName, profileUsername, description }` | `{ message }` | session | Profile, User | Brevo | Email to admin | profiles | ✅ |  |
| 50 | POST | `/api/profiles/me/verification` | Submit/update profile verification request | `{ afm, name, address, phone }` | `{ message }` | session+role(pro) | ProfileVerification, Profile, User | Brevo | Email to admin | profiles | ✅ |  |
| 51 | GET | `/api/profiles/me/verification` | Get own verification status | — | `{ status, afm?, name?, address?, phone?, createdAt, updatedAt }` | session | ProfileVerification | — | — | profiles | ✅ |  |

---

## 2.3 — App: `services`

### From `src/actions/services/`

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 52 | POST | `/api/services` | Submit new service to moderation | `{ title, description, category, subcategory, subdivision, type, tags, addons, faq, media, price, duration, fixed }` | `{ serviceId, serviceTitle }` | session+role(pro) | Service, Profile | Brevo | Email to admin, Brevo state change | services | ✅ |  |
| 53 | POST | `/api/services/draft` | Save service as draft (30s rate-limit) | (same as #52, fields optional) | `{ message }` | session+role(pro) | Service, Profile | — | — | services | ✅ | Throttle scope: `service_draft` |
| 54 | DELETE | `/api/services/{id}` | Permanently delete service (cascades reviews) | — | `{ message }` | session+role(pro) | Service, Review | Brevo | Cache invalidation | services | ✅ |  |
| 55 | POST | `/api/services/{id}/archive` | Soft-delete (mark inactive) | — | `{ message }` | session+role(pro) | Service | Brevo | — | services | ✅ |  |
| 56 | GET | `/api/services/categories` | Categories page (counts + breadcrumbs) | `?categorySlug=&subcategorySlug=&limit=` | `{ subdivisions[], categories[], popularSubdivisions[] }` | none | Service | — | — | services | ✅ |  |
| 57 | GET | `/api/services/navigation` | Mega menu data with counts | — | `NavigationMenuCategory[]` | none | Service | — | — | services | ✅ |  |
| 58 | GET | `/api/services/recent` | User's 5 most recently modified services | — | `{ services[] }` | session | Service, Profile | — | — | services | ✅ |  |
| 59 | GET | `/api/services/by-slug/{slug}` | Single published service by slug | — | `ServiceWithFullProfile` | none | Service, Profile | — | — | services | ✅ |  |
| 60 | GET | `/api/services/{id}/page` | Service detail page bundle | — | `ServicePageData` | none | Service, Profile, Review, Subscription, SavedService | — | — | services | ✅ |  |
| 61 | GET | `/api/services/{id}/edit` | Service for owner editing | — | `Service & { profile }` | session | Service, Profile | — | — | services | ✅ | Ownership check in permission |
| 62 | GET | `/api/services/featured` | Featured services for home grouped by category | — | `{ mainCategories, servicesByCategory, allServices }` | none | Service | — | — | services | ✅ |  |
| 63 | GET | `/api/services` | Paginated services list | `?page=&limit=&category=&excludeFeatured=` | `{ services[], total, hasMore }` | none | Service, Profile | — | — | services | ✅ |  |
| 64 | POST | `/api/services/search` | Filtered archive query | `ServiceFilters` | `{ services[], total, hasMore }` | none | Service, Profile | — | — | services | ✅ | POST due to complex filter |
| 65 | POST | `/api/services/count` | Count by filters | `ServiceFilters` | `number` | none | Service | — | — | services | ✅ |  |
| 66 | GET | `/api/services/taxonomy-paths` | All taxonomy paths with counts | — | `[{ category, subcategory, subdivision, count }]` | none | Service | — | — | services | ✅ |  |
| 67 | POST | `/api/services/archive` | Archive page bundle | `{ categorySlug?, subcategorySlug?, subdivisionSlug?, limit?, searchParams }` | `{ services, taxonomyData, breadcrumbs, counties, availableSubdivisions, ... }` | none | Service, Profile | — | — | services | ✅ |  |
| 68 | GET | `/api/services/me` | User's own services dashboard | `?page=&limit=&status=&category=&search=&sortBy=&sortOrder=` | `{ services[], total, page, limit, totalPages, canFeatureMore, canCreateMore }` | session | Service, Profile, Subscription | — | — | services | ✅ |  |
| 69 | GET | `/api/services/me/stats` | Service counts by status (dashboard widget) | — | `{ total, draft, pending, published, rejected }` | session | Service | — | — | services | ✅ |  |
| 70 | POST | `/api/services/{id}/refresh` | Boost service to top (rate-limited 24h/service, 10/day/user) | — | `{ refreshedAt, remainingRefreshes }` | session | Service, Profile | — | Updates `dailyServiceRefreshCount` | services | ✅ |  |
| 71 | POST | `/api/services/{id}/report` | Report inappropriate service | `{ serviceTitle, serviceSlug, description }` | `{ message }` | session | — | Brevo | Email to admin | services | ✅ |  |
| 72 | PATCH | `/api/services/{id}/media` | Update service media gallery | `{ media: CloudinaryResource[] }` | `{ message }` | session | Service, Profile | Cloudinary | Cache invalidation | services | ✅ |  |
| 73 | PATCH | `/api/services/{id}` | Update core fields (title, desc, taxonomy, pricing) | `{ ...service fields }` | `{ message }` | session | Service, Profile | Brevo | draft→pending email if state change | services | ✅ |  |

### Search (single endpoint, lives in `services` app)

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 74 | GET | `/api/services/search/suggestions` | Autocomplete: taxonomy + service suggestions | `?q=` (min 2 chars) | `{ taxonomies[], services[], hasResults }` | none | Service, Profile | — | — | services | ✅ |  |

---

## 2.4 — App: `reviews`

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 75 | POST | `/api/reviews` | Submit review for profile/service (pending moderation) | `{ rating, comment, profileId, serviceId? }` | `{ id, message }` | session | Review, Profile, Service | Brevo | Email to admin | reviews | ✅ |  |
| 76 | GET | `/api/reviews/can-review` | Check if user can review target | `?profileId=&serviceId=` | `{ canReview, reason? }` | session | Profile, Review | — | — | reviews | ✅ |  |
| 77 | GET | `/api/reviews/profile/{profileId}/stats` | Profile rating aggregate (approved+published) | — | `{ totalReviews, averageRating }` | none | Review | — | — | reviews | ✅ |  |
| 78 | GET | `/api/reviews/service/{serviceId}/stats` | Service rating aggregate | — | `{ totalReviews, averageRating }` | none | Review | — | — | reviews | ✅ |  |
| 79 | GET | `/api/reviews/profile/{profileId}` | Reviews for profile (paginated) | `?page=&limit=` | `{ reviews[], total }` | none | Review, Profile | — | — | reviews | ✅ |  |
| 80 | GET | `/api/reviews/service/{serviceId}` | Reviews for service (paginated) | `?page=&limit=` | `{ reviews[], total }` | none | Review, Profile | — | — | reviews | ✅ |  |
| 81 | GET | `/api/reviews/profile/{profileId}/other-services` | Reviews for other services by same profile | `?excludeServiceId=&limit=` | `{ reviews[], total }` | none | Review, Profile | — | — | reviews | ✅ |  |
| 82 | GET | `/api/reviews/me/received/total` | Total approved reviews received | — | `{ total }` | session | Review | — | — | reviews | ✅ |  |
| 83 | GET | `/api/reviews/me/given` | Reviews given by current user | `?page=&limit=` | `{ reviews[], total }` | session | Review, Profile | — | — | reviews | ✅ |  |
| 84 | GET | `/api/reviews/me/received/stats` | Positive/negative counts received | — | `{ positiveCount, negativeCount }` | session | Review | — | — | reviews | ✅ |  |
| 85 | GET | `/api/reviews/me/received/with-comments` | Received reviews with comments (paginated) | `?page=&limit=` | `{ reviews[], total }` | session | Review, Profile | — | — | reviews | ✅ |  |
| 86 | GET | `/api/reviews/me/given/stats` | Positive/negative counts given | — | `{ positiveCount, negativeCount }` | session | Review | — | — | reviews | ✅ |  |
| 87 | GET | `/api/reviews/me/given/with-comments` | Given reviews with comments | `?page=&limit=` | `{ reviews[], total }` | session | Review, Profile | — | — | reviews | ✅ |  |
| 88 | GET | `/api/reviews/me/received` | Received reviews (paginated) | `?page=&limit=` | `{ reviews[], total }` | session | Review, Profile | — | — | reviews | ✅ |  |
| 89 | POST | `/api/reviews/{id}/visibility/toggle` | Profile owner: hide/show comment | — | `{ visibility }` | session | Review | — | — | reviews | ✅ |  |

### Internal helpers (Django services, not endpoints)

| # | Function | Source | Where it lands | Status |
|---|---|---|---|---|
| H9 | `updateProfileRating` | `actions/reviews/update-rating.ts` | `apps/reviews/services/recalculate_ratings.py` | N/A — utility port |
| H10 | `updateServiceRating` | `actions/reviews/update-rating.ts` | `apps/reviews/services/recalculate_ratings.py` | N/A — utility port |

---

## 2.5 — App: `saved`

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 90 | POST | `/api/saved/toggle` | Toggle save/unsave for service or profile | `{ itemType: service\|profile, itemId }` | `{ isSaved }` | session | SavedService, SavedProfile | — | — | saved | ✅ |  |
| 91 | GET | `/api/saved` | Dashboard: paginated saved services + profiles | `?servicesPage=&servicesLimit=&profilesPage=&profilesLimit=` | `{ services[], profiles[], servicesTotal, profilesTotal, servicesTotalPages, profilesTotalPages }` | session | SavedService, SavedProfile | — | — | saved | ✅ |  |
| 92 | GET | `/api/saved/state` | O(1) lookup sets for client-side heart icons | — | `{ serviceIds[], profileIds[] }` | optional | SavedService, SavedProfile | — | — | saved | ✅ | Returns lists; client converts to Set |

---

## 2.6 — App: `messaging`

### Public chat/message endpoints

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 93 | GET | `/api/chats` | List user's chats with unread counts | — | `ChatListItem[]` | session | Chat, ChatMember, Message | — | — | messaging | ✅ |  |
| 94 | GET | `/api/chats/{chatId}` | Single chat detail | — | `ChatWithRelations` | session | Chat, ChatMember, User | — | — | messaging | ✅ |  |
| 95 | POST | `/api/chats/with/{otherUserId}` | Get-or-create 1-on-1 chat | — | `{ chatId, isNew }` | session | Chat, ChatMember, BlockedUser | — | — | messaging | ✅ | BlockedUser check |
| 96 | GET | `/api/chats/{chatId}/messages` | Paginated messages (cursor-based) | `?limit=&before=` | `ChatMessageItem[]` | session | Message, Chat, ChatMember, User | — | — | messaging | ✅ | CursorPagination |
| 97 | POST | `/api/chats/{chatId}/messages` | Send message; broadcasts via Channels | `{ content, replyToId? }` | `ChatMessageItem` | session | Message, Chat, ChatMember | Django Channels | Updates Chat.lastMessage, broadcasts | messaging | ✅ | Triggers `group_send` to chat consumer |
| 98 | PATCH | `/api/messages/{id}` | Edit message (owner only) | `{ content }` | `{ }` | session | Message | Channels | Broadcast edit | messaging | ✅ |  |
| 99 | DELETE | `/api/messages/{id}` | Delete message (soft) | — | `{ }` | session | Message | Channels | Broadcast delete | messaging | ✅ | Inferred from messages.ts (soft-delete pattern) |
| 100 | POST | `/api/messages/mark-read` | Batch mark messages read | `{ messageIds[] }` | `{ }` | session | Message | Channels | Broadcast read receipt | messaging | ✅ |  |
| 101 | GET | `/api/chats/{chatId}/unread/count` | Unread count for one chat | — | `number` | session | Message | — | — | messaging | ✅ |  |
| 102 | POST | `/api/chats/unread/counts` | Batch unread counts | `{ chatIds[] }` | `{ chatId: count }` | session | Message | — | — | messaging | ✅ |  |
| 103 | GET | `/api/chats/unread/total` | Total unread across all chats | — | `number` | session | Message, ChatMember | — | — | messaging | ✅ |  |
| 104 | GET | `/api/chats/me/recent-unread` | Recent unread (for cron context) | `?minutes=15` | `{ messages[] }` | session | Message, ChatMember, User | — | — | messaging | ✅ |  |
| 105 | POST | `/api/users/{id}/block` | Block another user | — | `{ }` | session | BlockedUser | — | — | messaging | ✅ |  |
| 106 | DELETE | `/api/users/{id}/block` | Unblock | — | `{ }` | session | BlockedUser | — | — | messaging | ✅ |  |
| 107 | GET | `/api/users/me/blocked` | List users I have blocked | — | `[{ id, blockedId, blocked, createdAt }]` | session | BlockedUser, User | — | — | messaging | ✅ |  |
| 108 | GET | `/api/users/{id}/blocked-status` | Check bidirectional block | — | `boolean` | session | BlockedUser | — | — | messaging | ✅ |  |
| 109 | POST | `/api/presence` | Update own online status across all chats | `{ online }` | `{ }` | session | ChatMember | Channels | Broadcast presence | messaging | ✅ | Also driven by WS connect/disconnect |
| 110 | GET | `/api/users/{id}/presence` | Get user's presence | — | `{ online, lastSeen }` | session | ChatMember | — | — | messaging | ✅ |  |
| 111 | GET | `/api/chats/me/presence-summary` | Chats + presence of other members | — | `[{ chatId, online }]` | session | ChatMember | — | — | messaging | ✅ |  |
| 112 | POST | `/api/messages/{id}/reactions/toggle` | Toggle emoji reaction | `{ emoji }` | `{ reactions: { emoji: [userIds] } }` | session | Message | Channels | Broadcast | messaging | ✅ |  |
| 113 | POST | `/api/messages/{id}/reactions` | Add reaction | `{ emoji }` | `{ }` | session | Message | Channels | Broadcast | messaging | ✅ |  |
| 114 | DELETE | `/api/messages/{id}/reactions/{emoji}` | Remove reaction | — | `{ }` | session | Message | Channels | Broadcast | messaging | ✅ |  |

### WebSocket consumers (Django Channels — not REST, but tracked)

| # | Channel | Purpose | Auth | Status | Notes |
|---|---|---|---|---|---|
| WS1 | `ws://.../ws/chat/{chatId}/` | Chat room: receive new messages, edits, deletes, reactions, read receipts | session (cookie/JWT) | ⬜ | Replaces Supabase Realtime channel `chat:<id>` |
| WS2 | `ws://.../ws/presence/` | Per-user presence: online/offline broadcast on connect/disconnect | session | ⬜ | Replaces Supabase presence channel |

### Cron task (also row #10)

| # | Schedule | Task | Purpose | Status | Notes |
|---|---|---|---|---|---|
| T1 | every 15 min | `messaging.tasks.process_email_batches` | Send unread message email digests | ⬜ | Same as REST row #10; tracked here for app ownership |

---

## 2.7 — App: `billing` (subscriptions + payments)

### From `src/actions/subscription/`

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 115 | POST | `/api/billing/checkout` | Create checkout session (Stripe/Worldline/PayPal) | `{ billingInterval, couponCode? }` | `{ url }` | session+role(pro\|admin) | Profile, Subscription | Stripe/Worldline/PayPal | Phone formatting; provider call | billing | ✅ |  |
| 116 | POST | `/api/billing/services/{id}/featured/toggle` | Toggle featured status (max 5 for promoted) | — | `{ featured }` | session+role(pro\|admin) | Service, Profile | — | Cache invalidation | billing | ✅ | Lives in billing because feature gate is subscription-driven |
| 117 | POST | `/api/billing/sync` | Sync billing data from profile to subscription | — | `{ synced }` | session | Profile, Subscription | — | — | billing | ✅ | Webhook fallback |
| 118 | POST | `/api/billing/coupons/validate` | Validate coupon and return discounted pricing | `{ code, billingInterval }` | `{ code, percentOff, pricing }` | none | — | — | — | billing | ✅ |  |
| 119 | POST | `/api/billing/subscription/restore` | Restore subscription scheduled for cancellation | — | `{ restored }` | session+role(pro\|admin) | Profile, Subscription | Provider | — | billing | ✅ |  |
| 120 | POST | `/api/billing/subscription/cancel` | Cancel subscription (at period end or immediately) | `{ cancelAtPeriodEnd? }` | `{ canceledAt }` | session+role(pro\|admin) | Profile, Subscription | Provider | — | billing | ✅ |  |
| 121 | GET | `/api/billing/subscription` | Get current user's subscription | — | `{ subscription }` | session+role(pro\|admin) | Profile, Subscription | — | — | billing | ✅ |  |

---

## 2.8 — App: `blog`

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 122 | GET | `/api/blog/articles` | Paginated published articles (filters) | `?page=&limit=&categorySlug=&authorProfileId=&featured=&search=` | `BlogArticlesResponse` | none | BlogArticle, BlogArticleAuthor, Profile | — | — | blog | ✅ |  |
| 123 | GET | `/api/blog/articles/{slug}/related` | Related articles in same category | `?limit=4` | `BlogArticleCard[]` | none | BlogArticle, BlogArticleAuthor, Profile | — | — | blog | ✅ |  |
| 124 | GET | `/api/blog/articles/{slug}` | Single published article | — | `BlogArticleDetail` | none | BlogArticle, BlogArticleAuthor, Profile | — | — | blog | ✅ |  |

---

## 2.9 — App: `taxonomy`

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 125 | POST | `/api/taxonomy/submissions` | Submit skill or tag for admin approval | `{ label, type: skill\|tag, category? }` | `{ pendingId }` | session+role(pro) | TaxonomySubmission | — | — | taxonomy | ✅ | Throttle: 5/24h |
| 126 | GET | `/api/taxonomy/submissions/me` | List current user's pending submissions | `?type=` | `[{ pendingId, label, category? }]` | session | TaxonomySubmission | — | — | taxonomy | ✅ |  |

### Internal helpers (Django utilities)

| # | Function | Source | Where it lands | Status |
|---|---|---|---|---|
| H11 | `getCurrentBranch`, `getFileContent`, `getDatasetFiles`, `detectFileChanges`, `getCommitDiff`, `createCommit`, `getRecentCommits`, `getCommitsAhead`, `getLatestCommitSha` | `actions/github/operations.ts` | `apps/taxonomy/services/github_client.py` (Octokit-equivalent wrapper using `PyGithub` or `gidgethub`) | N/A — utility port |

---

## 2.10 — App: `media`

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 127 | POST | `/api/media/cloudinary/media-library-token` | Generate token for Cloudinary Media Library widget | — | `{ signature, timestamp, apiKey, cloudName }` | session+role(admin) | — | Cloudinary | — | media | ✅ |  |

---

## 2.11 — App: `support`

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 128 | POST | `/api/support/contact` | Submit contact form (with reCAPTCHA) | `{ name, email, message, captchaToken }` | `{ message }` | none | Contact | reCAPTCHA, Brevo | Admin email | support | ✅ |  |
| 129 | POST | `/api/support/feedback` | Submit feedback/bug report | `{ issueType, description, pageUrl }` | `{ message }` | session | — | Brevo | Admin email | support | ✅ |  |

---

## 2.12 — App: `core` (sitemaps, healthcheck, home aggregation)

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 130 | GET | `/api/home` | Home page bundle (featured, profiles, popular, categories) | — | `HomePageData (large)` | none | Service, Profile | — | — | core | ✅ |  |
| 131 | GET | `/api/health` | Healthcheck (DB + Redis + Celery ping) | — | `{ ok, db, redis, celery }` | none | — | — | — | core | ✅ | New endpoint, not in Next.js but standard for Django ops |

---

## 2.13 — App: `admin_api`

> Admin endpoints follow `/api/admin/<resource>/...`. Per-resource viewsets live in their owning app under `views/admin/`. The `admin_api` app owns API-key auth + cross-cutting admin services.

### Admin: API keys

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 132 | POST | `/api/admin/api-keys/validate` | Validate admin API key (env or DB) | `{ apiKey }` | `{ valid, source?, data? }` | api-key | ApiKey | — | — | admin_api | ✅ |  |
| 133 | POST | `/api/admin/api-keys` | Create admin API key | `{ name, expiresIn?, metadata? }` | `ApiKey` | session+SETTINGS:edit | ApiKey | — | — | admin_api | ✅ |  |
| 134 | GET | `/api/admin/api-keys` | List admin API keys | — | `ApiKey[]` | session+SETTINGS:view | ApiKey | — | — | admin_api | ✅ |  |
| 135 | PATCH | `/api/admin/api-keys/{id}` | Update API key (name, enabled) | `{ name?, enabled? }` | `ApiKey` | session+SETTINGS:edit | ApiKey | — | — | admin_api | ✅ |  |
| 136 | DELETE | `/api/admin/api-keys/{id}` | Delete API key | — | `{ }` | session+SETTINGS:view | ApiKey | — | — | admin_api | ✅ |  |
| 137 | GET | `/api/admin/api-keys/me/access` | Check current session's admin API access | — | `{ hasAccess, user? }` | session+SETTINGS:view | — | — | — | admin_api | ✅ |  |
| 138 | GET | `/api/admin/navigation` | Allowed nav items for current admin (folds H6) | — | `{ items[] }` | session+admin | — | — | — | admin_api | ✅ |  |

### Admin: chats

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 139 | GET | `/api/admin/chats/stats` | Aggregate chat/message stats | — | `{ totalChats, totalMessages, messagesToday, totalChatMembers }` | session+CHATS:view | Chat, Message, ChatMember | — | — | messaging | ✅ |  |
| 140 | GET | `/api/admin/chats` | List chats (admin filters, pagination) | `?search=&sort=&sortBy=&sortOrder=&page=&limit=` | `{ chats[], total }` | session+CHATS:view | Chat, Message, ChatMember, User | — | — | messaging | ✅ |  |
| 141 | GET | `/api/admin/chats/{id}` | Single chat detail (admin view) | — | `Chat (with members + lastMessage + count)` | session+CHATS:view | Chat, ChatMember, User, Message | — | — | messaging | ✅ |  |
| 142 | GET | `/api/admin/chats/{id}/stats` | Stats for specific chat | — | `{ totalMessages, messagesToday, creator, member }` | session+CHATS:view | Chat, ChatMember, Message, User | — | — | messaging | ✅ |  |
| 143 | GET | `/api/admin/chats/{id}/messages` | Paginated messages (search) | `?search=&sortBy=&sortOrder=&page=&limit=` | `{ messages[], total }` | session+CHATS:view | Chat, Message, User | — | — | messaging | ✅ |  |

### Admin: users

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 144 | GET | `/api/admin/users/{id}` | Get user with profile + accounts + sessions | — | `User+` | session+USERS:view | User, Profile, Account, Session | — | — | accounts | ✅ |  |
| 145 | GET | `/api/admin/users` | List with filters | `?searchValue=&searchField=&searchOperator=&type=&provider=&step=&status=&role=&limit=&offset=&sortBy=&sortDirection=` | `{ users[], total }` | session+USERS:view | User | — | — | accounts | ✅ |  |
| 146 | POST | `/api/admin/users` | Create new user | `{ email, password, name, role, displayName, username }` | `User` | session+USERS:view | User | Brevo | List sync | accounts | ✅ |  |
| 147 | POST | `/api/admin/users/{id}/role` | Set user role | `{ role }` | `{ }` | session+USERS:view | User | Brevo | — | accounts | ✅ |  |
| 148 | POST | `/api/admin/users/{id}/ban` | Ban user (reason + expiration) | `{ banReason?, banExpires? }` | `{ }` | session+USERS:view | User | Brevo | List cleanup | accounts | ✅ |  |
| 149 | POST | `/api/admin/users/{id}/unban` | Unban user | — | `{ }` | session+USERS:view | User | Brevo | List restore | accounts | ✅ |  |
| 150 | DELETE | `/api/admin/users/{id}` | Permanently delete user | — | `{ }` | session+USERS:full | User, Verification | Brevo | Cleanup | accounts | ✅ |  |
| 151 | POST | `/api/admin/users/{id}/impersonate` | Impersonate user (test session) | — | `{ token }` | session+USERS:edit | User, Session | — | Creates session | accounts | ✅ |  |
| 152 | POST | `/api/admin/users/me/stop-impersonating` | End impersonation | — | `{ }` | session+USERS:edit | Session | — | Deletes session | accounts | ✅ |  |
| 153 | GET | `/api/admin/users/{id}/sessions` | List user's sessions | — | `Session[]` | session+USERS:edit | Session | — | — | accounts | ✅ |  |
| 154 | DELETE | `/api/admin/users/{id}/sessions/{token}` | Revoke specific session | — | `{ }` | session+USERS:view | Session | — | — | accounts | ✅ |  |
| 155 | DELETE | `/api/admin/users/{id}/sessions` | Revoke all sessions | — | `{ }` | session+USERS:view | Session | — | — | accounts | ✅ |  |
| 156 | PATCH | `/api/admin/users/{id}` | Update user fields (role only currently) | `{ role? }` | `User` | session+USERS:view | User | Brevo | — | accounts | ✅ |  |
| 157 | POST | `/api/admin/users/{id}/password` | Set/reset user password | `{ password }` | `{ }` | session+USERS:edit | User | — | — | accounts | ✅ |  |
| 158 | PATCH | `/api/admin/users/{id}/basic-info` | Update name/email/username/displayName | `{ name?, email?, username?, displayName? }` | `User` | session+USERS:view | User | — | Username uniqueness check | accounts | ✅ |  |
| 159 | PATCH | `/api/admin/users/{id}/status` | Update status fields (confirmed, blocked, etc.) | `{ type?, confirmed?, blocked?, emailVerified?, step? }` | `User` | session+USERS:edit | User, Profile | Brevo | — | accounts | ✅ |  |
| 160 | PATCH | `/api/admin/users/{id}/ban-status` | Update ban status (DB-level) | `{ banned, banReason?, banExpires? }` | `User` | session+USERS:edit | User | Brevo | — | accounts | ✅ |  |
| 161 | PATCH | `/api/admin/users/{id}/image` | Update user avatar | `{ image }` | `User` | session+USERS:edit | User | — | — | accounts | ✅ |  |
| 162 | POST | `/api/admin/users/{id}/blocked/toggle` | Block/unblock | `{ blocked }` | `{ message }` | session+USERS:view | User | Brevo | — | accounts | ✅ |  |
| 163 | POST | `/api/admin/users/{id}/confirmed/toggle` | Confirm/unconfirm | `{ confirmed }` | `{ message }` | session+USERS:view | User | — | — | accounts | ✅ |  |
| 164 | PATCH | `/api/admin/users/{id}/journey-step` | Update onboarding step | `{ step }` | `{ message }` | session+USERS:edit | User, Profile | Brevo | Auto-correct DASHBOARD if profile incomplete | accounts | ✅ |  |
| 165 | GET | `/api/admin/users/stats` | Comprehensive user stats | — | `{ total, active, banned, blocked, unverified, byStep, byProvider, byType }` | session+USERS:view | User | — | — | accounts | ✅ |  |
| 166 | PATCH | `/api/admin/users/{id}/account` | Update displayName + image (admin) with profile sync | `{ displayName, image }` | `{ }` | session+USERS:view | User, Profile | — | Cache revalidation | accounts | ✅ |  |
| 167 | GET | `/api/admin/team` | List admin/support/editor team members | — | `TeamMember[]` | session+TEAM:view | User | — | — | accounts | ✅ |  |
| 168 | POST | `/api/admin/team/{userId}/role` | Assign admin/support/editor role | `{ role }` | `{ }` | session+TEAM:edit | User | Brevo | Cache revalidate | accounts | ✅ |  |
| 169 | DELETE | `/api/admin/team/{userId}/role` | Remove admin role (revert to user role) | — | `{ }` | session+TEAM:edit | User, Profile | Brevo | Cache revalidate | accounts | ✅ |  |
| 170 | GET | `/api/admin/team/search` | Search users for role assignment dropdown | `?search=&limit=` | `TeamMember[]` | session+TEAM:view | User | — | — | accounts | ✅ |  |

> The 5 `*Action` FormData wrappers (`updateUserBasicInfoAction`, `updateUserStatusAction`, `updateUserBanAction`, `updateUserImageAction`, `updateAccountAdmin`) collapse into the corresponding endpoints above (158, 159, 160, 161, 166) — DRF accepts JSON or multipart on the same view.

### Admin: reviews

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 171 | GET | `/api/admin/reviews` | List with filters (status, rating, type) | `?searchQuery=&status=&rating=&type=&limit=&offset=&sortBy=&sortDirection=` | `{ reviews[], total, limit, offset }` | session+REVIEWS:view | Review, User, Profile, Service | — | — | reviews | ✅ |  |
| 172 | GET | `/api/admin/reviews/{id}` | Single review with author + target | — | `Review+` | session+REVIEWS:view | Review, User, Profile, Service | — | — | reviews | ✅ |  |
| 173 | PATCH | `/api/admin/reviews/{id}/status` | Approve/reject + recalculate ratings + email | `{ status, notes? }` | `Review` | session+REVIEWS:edit | Review, Profile, Service | Brevo | Rating recalc, email | reviews | ✅ |  |
| 174 | DELETE | `/api/admin/reviews/{id}` | Delete review (recalc ratings if was approved) | — | `{ id }` | session+REVIEWS:full | Review, Profile, Service | — | Rating recalc | reviews | ✅ |  |
| 175 | GET | `/api/admin/reviews/stats` | Counts by status | — | `{ total, pending, approved, rejected }` | session+REVIEWS:view | Review | — | — | reviews | ✅ |  |
| 176 | POST | `/api/admin/reviews/{id}/visibility/toggle` | Admin toggle visibility (independent of status) | — | `{ visibility }` | session+REVIEWS:edit | Review | — | — | reviews | ✅ |  |
| 177 | GET | `/api/admin/reviews/pending` | Moderation queue (pending only) | `?page=&limit=` | `{ reviews[], total }` | session+REVIEWS:view | Review | — | — | reviews | ✅ | Was `getPendingReviews` |

### Admin: subscriptions

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 178 | GET | `/api/admin/subscriptions` | List with filters | `?searchQuery=&status=&plan=&billingInterval=&limit=&offset=&sortBy=&sortDirection=` | `{ subscriptions[], total, limit, offset }` | session+SUBSCRIPTIONS:view | Subscription, Profile, User | — | — | billing | ✅ |  |
| 179 | GET | `/api/admin/subscriptions/{id}` | Single subscription detail | — | `Subscription+` | session+SUBSCRIPTIONS:view | Subscription, Profile, User | — | — | billing | ✅ |  |
| 180 | PATCH | `/api/admin/subscriptions/{id}/status` | Update status (sync profile featured) | `{ status }` | `Subscription` | session+SUBSCRIPTIONS:edit | Subscription, Profile | — | Profile featured sync | billing | ✅ |  |
| 181 | DELETE | `/api/admin/subscriptions/{id}` | Delete subscription (clear featured) | — | `{ id }` | session+SUBSCRIPTIONS:full | Subscription, Profile | — | — | billing | ✅ |  |
| 182 | GET | `/api/admin/subscriptions/stats` | Counts by status | — | `{ total, active, canceled, pastDue }` | session+SUBSCRIPTIONS:view | Subscription | — | — | billing | ✅ |  |
| 183 | POST | `/api/admin/subscriptions/manual` | Create manual subscription (offline payment) | `{ profileId, endDate }` | `{ id }` | session+SUBSCRIPTIONS:edit | Subscription, Profile, User | — | Featured set true | billing | ✅ |  |

### Admin: verifications

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 184 | GET | `/api/admin/verifications` | List with filters | `?searchQuery=&status=&limit=&offset=&sortBy=&sortDirection=` | `{ verifications[], total, limit, offset }` | session+VERIFICATIONS:view | ProfileVerification, Profile, User | — | — | profiles | ✅ |  |
| 185 | GET | `/api/admin/verifications/{id}` | Single verification | — | `ProfileVerification+` | session+VERIFICATIONS:view | ProfileVerification, Profile, User | — | — | profiles | ✅ |  |
| 186 | PATCH | `/api/admin/verifications/{id}/status` | Approve/reject/pending; sync profile.verified | `{ status, notes? }` | `ProfileVerification` | session+VERIFICATIONS:edit | ProfileVerification, Profile | — | Profile verified flag | profiles | ✅ |  |
| 187 | DELETE | `/api/admin/verifications/{id}` | Delete verification (unverify profile) | — | `{ id }` | session+VERIFICATIONS:full | ProfileVerification, Profile | — | — | profiles | ✅ |  |
| 188 | GET | `/api/admin/verifications/stats` | Counts by status | — | `{ total, pending, approved, rejected }` | session+VERIFICATIONS:view | ProfileVerification | — | — | profiles | ✅ |  |

### Admin: services

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 189 | GET | `/api/admin/services` | List with extensive filters | `?searchQuery=&status=&category=&...` | `{ services[], total, page, limit, offset, totalPages }` | session+SERVICES:view | Service, Profile, User | — | — | services | ✅ |  |
| 190 | GET | `/api/admin/services/{id}` | Single service with profile + reviews + counts | — | `Service+` | session+SERVICES:view | Service, Profile, User, Review | — | — | services | ✅ |  |
| 191 | PATCH | `/api/admin/services/{id}` | Update fields (title, description, status, taxonomy, etc.) | `{ ...fields }` | `Service` | session+SERVICES:edit | Service, Profile, User | Brevo | Cache invalidation, publish email | services | ✅ |  |
| 192 | PATCH | `/api/admin/services/{id}/taxonomy` | Update taxonomy (cat/sub/subdivision/tags) | `{ category?, subcategory?, subdivision?, tags? }` | `{ }` | session+SERVICES:edit | Service, Profile | — | Cache invalidation | services | ✅ |  |
| 193 | PATCH | `/api/admin/services/{id}/basic` | Update title + description | `{ title?, description? }` | `{ }` | session+SERVICES:edit | Service, Profile | — | — | services | ✅ |  |
| 194 | PATCH | `/api/admin/services/{id}/pricing` | Update price/fixed/duration/subscriptionType | `{ price?, fixed?, duration?, subscriptionType? }` | `{ }` | session+SERVICES:edit | Service, Profile | — | — | services | ✅ |  |
| 195 | PATCH | `/api/admin/services/{id}/settings` | Update status + featured | `{ status?, featured? }` | `{ }` | session+SERVICES:edit | Service, Profile | — | — | services | ✅ |  |
| 196 | PATCH | `/api/admin/services/{id}/addons` | Update addons JSON | `{ addons }` | `{ }` | session+SERVICES:edit | Service, Profile | — | — | services | ✅ |  |
| 197 | PATCH | `/api/admin/services/{id}/faq` | Update FAQ JSON | `{ faq }` | `{ }` | session+SERVICES:edit | Service, Profile | — | — | services | ✅ |  |
| 198 | PATCH | `/api/admin/services/{id}/media` | Update media gallery | `{ media }` | `{ message }` | session+SERVICES:edit | Service, Profile | Cloudinary | — | services | ✅ |  |
| 199 | POST | `/api/admin/services/{id}/published/toggle` | Toggle published status | — | `{ message }` | session+SERVICES:edit | Service, Profile, User | Brevo | — | services | ✅ |  |
| 200 | POST | `/api/admin/services/{id}/featured/toggle` | Toggle featured status | — | `{ message }` | session+SERVICES:edit | Service, Profile | — | — | services | ✅ |  |
| 201 | PATCH | `/api/admin/services/{id}/status` | Update status with rejection reason | `{ status, rejectionReason? }` | `{ message }` | session+SERVICES:edit | Service, Profile, User | Brevo | Email if published | services | ✅ |  |
| 202 | DELETE | `/api/admin/services/{id}` | Delete service (cascade reviews, recalc user) | — | `{ message }` | session+SERVICES:full | Service, Profile, User | Brevo | NOSERVICES sync | services | ✅ |  |
| 203 | GET | `/api/admin/services/stats` | Counts + top categories/tags | — | `{ total, published, draft, ..., topCategory, topSubcategory, topTag }` | session+SERVICES:view | Service, Profile | — | — | services | ✅ |  |
| 204 | POST | `/api/admin/services/for-profile` | Admin creates service for specific profile | `{ profileId, title, description, category, tags, price, ... }` | `{ serviceId, serviceTitle, serviceSlug }` | session+SERVICES:edit | Service, Profile, User | Brevo | Email + slug + Brevo first-service | services | ✅ |  |

### Admin: profiles

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 205 | GET | `/api/admin/profiles` | List with filters | `?searchQuery=&type=&category=&...` | `{ profiles[], total, limit, offset }` | session+PROFILES:view | Profile, User, ProfileVerification, Service, Review | — | — | profiles | ✅ |  |
| 206 | GET | `/api/admin/profiles/{id}` | Profile + relations (services 10, reviews 10, counts) | — | `Profile+` | session+PROFILES:view | Profile, User, ProfileVerification, Service, Review | — | — | profiles | ✅ |  |
| 207 | PATCH | `/api/admin/profiles/{id}` | Update profile fields | `{ displayName?, tagline?, bio?, category?, subcategory?, speciality?, image?, skills? }` | `Profile` | session+PROFILES:edit | Profile | — | Normalization | profiles | ✅ |  |
| 208 | POST | `/api/admin/profiles/{id}/published/toggle` | Toggle published | — | `Profile` | session+PROFILES:edit | Profile | — | — | profiles | ✅ |  |
| 209 | POST | `/api/admin/profiles/{id}/featured/toggle` | Toggle featured (cache revalidation) | — | `Profile` | session+PROFILES:edit | Profile | — | Cache | profiles | ✅ |  |
| 210 | POST | `/api/admin/profiles/{id}/verified/toggle` | Toggle verified + sync ProfileVerification | — | `Profile` | session+PROFILES:edit | Profile, ProfileVerification | — | — | profiles | ✅ |  |
| 211 | PATCH | `/api/admin/profiles/{id}/verification-status` | Update verification status (alias of #186 from Profile angle) | `{ status, notes? }` | `ProfileVerification` | session+PROFILES:edit | Profile, ProfileVerification | — | — | profiles | ✅ | Considered duplicate of #186; collapse during implementation |
| 212 | DELETE | `/api/admin/profiles/{id}` | Delete profile (cascade services, reviews, verification) | — | `{ deletedProfile, cascadeInfo }` | session+PROFILES:full | Profile, Service, Review, ProfileVerification | Brevo | — | profiles | ✅ |  |
| 213 | GET | `/api/admin/profiles/search` | Search profiles for selection (max 50) | `?searchQuery=` | `Profile[]` | session+PROFILES:view | Profile, User | — | — | profiles | ✅ |  |
| 214 | GET | `/api/admin/profiles/search/for-services` | Search profiles for service-creation dropdown | `?searchQuery=` | `Profile[]` | session+SERVICES:edit | Profile, User | — | — | profiles | ✅ |  |
| 215 | GET | `/api/admin/profiles/stats` | Profile stats | — | `{ total, published, featured, verified, unverified, top, professional, company }` | session+PROFILES:view | Profile, User | — | — | profiles | ✅ |  |
| 216 | GET | `/api/admin/profiles/brevo-stats` | Brevo list stats | — | `{ users, emptyProfile, noServices, activePros, total }` | session+PROFILES:view | User, Profile, Service | Brevo (or DB count) | — | profiles | ✅ |  |
| 217 | PATCH | `/api/admin/profiles/{id}/settings` | Update boolean flags (published, featured, verified, top, isActive) | `{ published?, featured?, verified?, top?, isActive? }` | `{ }` | session+PROFILES:edit | Profile | — | Cache | profiles | ✅ |  |
| 218 | PATCH | `/api/admin/profiles/{id}/basic-info` | Admin variant of #34 | `{ tagline?, bio?, category?, subcategory?, speciality?, image?, skills?, coverage? }` | `{ }` | session+PROFILES:edit (or support) | Profile | — | Cache | profiles | ✅ |  |
| 219 | PATCH | `/api/admin/profiles/{id}/presentation` | Admin variant of #38 | `{ phone?, website?, viber?, whatsapp?, visibility?, socials? }` | `{ }` | session+PROFILES:edit (or support) | Profile | — | Cache | profiles | ✅ |  |
| 220 | PATCH | `/api/admin/profiles/{id}/portfolio` | Admin variant of #37 | `{ portfolio }` | `{ }` | session+PROFILES:edit (or support) | Profile | Cloudinary | Cache | profiles | ✅ |  |
| 221 | PATCH | `/api/admin/profiles/{id}/coverage` | Admin variant of #36 | `{ coverage }` | `{ }` | session+PROFILES:edit (or support) | Profile | — | Cache | profiles | ✅ |  |
| 222 | PATCH | `/api/admin/profiles/{id}/billing` | Admin variant of #35 | `{ receipt, invoice, afm?, doy?, name?, profession?, address? }` | `{ }` | session+PROFILES:edit (or support) | Profile | — | Cache | profiles | ✅ |  |

### Admin: skills & tags (taxonomy items)

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 223 | POST | `/api/admin/skills` | Create skill | `{ label, slug, category? }` | `{ }` | session+TAXONOMIES:edit | (file-based or SkillItem model) | — | Cache | taxonomy | ✅ | Decide: keep file-based via Git, or migrate to DB? Default plan: migrate skills/tags to DB tables |
| 224 | PATCH | `/api/admin/skills/{id}` | Update skill | `{ label, slug, category? }` | `{ }` | session+TAXONOMIES:edit | SkillItem | — | Cache | taxonomy | ✅ |  |
| 225 | DELETE | `/api/admin/skills/{id}` | Delete skill | — | `{ }` | session+TAXONOMIES:edit | SkillItem | — | Cache | taxonomy | ✅ |  |
| 226 | POST | `/api/admin/tags` | Create tag | `{ label, slug }` | `{ }` | session+TAXONOMIES:edit | TagItem | — | Cache | taxonomy | ✅ |  |
| 227 | PATCH | `/api/admin/tags/{id}` | Update tag | `{ label, slug }` | `{ }` | session+TAXONOMIES:edit | TagItem | — | Cache | taxonomy | ✅ |  |
| 228 | DELETE | `/api/admin/tags/{id}` | Delete tag | — | `{ }` | session+TAXONOMIES:edit | TagItem | — | Cache | taxonomy | ✅ |  |

> The 6 `*Action` FormData wrappers for skills/tags (createSkillAction, etc.) collapse into the corresponding endpoints above.

### Admin: taxonomies (service + pro categories — file-based via Git)

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 229 | POST | `/api/admin/taxonomies/services` | Create service taxonomy item | `{ label, slug, description, level, parentId?, featured?, icon?, image? }` | `{ backupPath, id }` | session+TAXONOMIES:edit | (file-based) | GitHub | Git commit | taxonomy | ✅ |  |
| 230 | PATCH | `/api/admin/taxonomies/services/{id}` | Update service taxonomy | (same) | `{ backupPath }` | session+TAXONOMIES:edit | (file-based) | GitHub | Git commit | taxonomy | ✅ |  |
| 231 | POST | `/api/admin/taxonomies/pros` | Create pro taxonomy item | `{ label, slug, plural, description, level, parentId?, type? }` | `{ backupPath, id }` | session+TAXONOMIES:edit | (file-based) | GitHub | Git commit | taxonomy | ✅ |  |
| 232 | PATCH | `/api/admin/taxonomies/pros/{id}` | Update pro taxonomy | (same) | `{ backupPath }` | session+TAXONOMIES:edit | (file-based) | GitHub | Git commit | taxonomy | ✅ |  |
| 233 | POST | `/api/admin/taxonomies/commit` | Commit multiple taxonomy changes in one PR | `{ changes[], overallMessage }` | `{ commitSha, commitUrl, prNumber, prUrl }` | session+TAXONOMIES:edit | — | GitHub | PR/commit | taxonomy | ✅ |  |
| 234 | POST | `/api/admin/taxonomies/revalidate` | Revalidate taxonomy caches | — | `{ message, revalidated[] }` | session+TAXONOMIES:edit | — | — | (Django: invalidate `cache.delete_many`) | taxonomy | ✅ |  |

> The 4 `*Action` FormData wrappers (createServiceTaxonomyAction, updateServiceTaxonomyAction, createProTaxonomyAction, updateProTaxonomyAction) collapse into the endpoints above.

### Admin: git operations (taxonomy workflow)

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 235 | GET | `/api/admin/git/status` | Datasets branch Git status | — | `{ branch, hasDatasetChanges, ahead_by, behind_by }` | session+GIT:view | — | GitHub | — | taxonomy | ✅ | Cached 30s |
| 236 | POST | `/api/admin/git/push` | Push commits (compatibility no-op) | `{ branch? }` | `{ branch, commitCount }` | session+GIT:view | — | GitHub | — | taxonomy | ✅ |  |
| 237 | GET | `/api/admin/git/commits` | Recent commits ahead of comparison branch | `?limit=&branch=` | `{ commits[] }` | session+GIT:view | — | GitHub | — | taxonomy | ✅ |  |
| 238 | POST | `/api/admin/git/revert` | Revert specific commits | `{ commitHashes[] }` | `{ commitSha, message, filesCommitted, commitUrl }` | session+GIT:full | — | GitHub | New revert commit | taxonomy | ✅ |  |
| 239 | POST | `/api/admin/git/undo-last` | Force-reset branch HEAD | `{ count? }` | `{ branch, undoneCommits, newHeadSha, newHeadUrl }` | session+GIT:view | — | GitHub | Destructive | taxonomy | ✅ | Confirm before exposing |
| 240 | POST | `/api/admin/git/merge-to-main` | Merge datasets → main | — | `{ sourceBranch, targetBranch, mergeCommitSha, mergeCommitUrl, message }` | session+GIT:view | — | GitHub | Production deploy | taxonomy | ✅ |  |
| 241 | POST | `/api/admin/git/sync-from-main` | Sync datasets ← main | — | `{ ... }` | session+GIT:edit | — | GitHub | — | taxonomy | ✅ |  |
| 242 | POST | `/api/admin/git/reset-to-main` | Force-reset datasets ← main | — | `{ ... }` | session+GIT:view | — | GitHub | Destructive | taxonomy | ✅ |  |

> Deprecated functions (`commitDatasetChanges`, `discardStagedChanges`) are NOT migrated. Confirmed obsolete in source — they return error redirecting to new workflow.

### Admin: cache & revalidation

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 243 | POST | `/api/admin/cache/revalidate-all` | Revalidate all caches (post-deployment hook) | — | `{ message, revalidated[] }` | api-key or session+admin | — | — | `cache.clear()` + targeted invalidation | core | ✅ | In Django, replaces Next.js cache concept; clears Redis cache keys |

### Admin: blog (already in `blog` app, but admin-only)

| # | Method | Path | Purpose | Request shape | Response shape | Auth | Models touched | External services | Side effects | Target Django app | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 244 | POST | `/api/admin/blog/articles` | Create blog article | `{ slug?, title, excerpt, content, categorySlug, image?, featured?, status, authors[] }` | `{ id, slug }` | session+BLOG:edit | BlogArticle, BlogArticleAuthor, Profile | — | Slug normalization, cache | blog | ✅ |  |
| 245 | PATCH | `/api/admin/blog/articles/{id}` | Update article | (same) | `{ id, slug }` | session+BLOG:edit | BlogArticle, BlogArticleAuthor | — | Cache | blog | ✅ |  |
| 246 | DELETE | `/api/admin/blog/articles/{id}` | Delete article | — | `{ }` | session+BLOG:full | BlogArticle, BlogArticleAuthor | — | Cache | blog | ✅ |  |
| 247 | GET | `/api/admin/blog/articles` | List all (any status) with pagination | `?page=&limit=&status=&categorySlug=&search=` | `{ articles[], total, totalPages }` | session+BLOG:view | BlogArticle, BlogArticleAuthor, Profile | — | — | blog | ✅ |  |
| 248 | GET | `/api/admin/blog/articles/{id}` | Single article (admin view, all fields) | — | `BlogArticleAdmin` | session+BLOG:view | BlogArticle, BlogArticleAuthor, Profile | — | — | blog | ✅ |  |

---

# Section 3 — Database models (24 + 1 already counted)

Per-model migration plan: derive from Prisma schema via `inspectdb`, then refine.

| # | Prisma model | Django app | Django model file | Status | Notes |
|---|---|---|---|---|---|
| M1 | User | accounts | `apps/accounts/models/user.py` | ✅ | Custom `AbstractBaseUser`. Replace Better Auth `User` table fields one-for-one. `db_table = 'user'` (lowercase, matches Prisma). |
| M2 | Profile | profiles | `apps/profiles/models/profile.py` | ✅ | OneToOne(User). JSONField for `coverage`, `socials`, `visibility`, `portfolio`, `billing`. |
| M3 | Session | accounts | `apps/accounts/models/session.py` | ✅ | Better Auth session row; coexists with simplejwt blacklist. `managed=False` initially. |
| M4 | Account | accounts | `apps/accounts/models/account.py` | ✅ | OAuth provider link (Google, etc.). |
| M5 | Verification | accounts | `apps/accounts/models/verification.py` | ✅ | Better Auth verification tokens. |
| M6 | ProfileVerification | profiles | `apps/profiles/models/profile_verification.py` | ✅ | Pro AFM/business verification request. |
| M7 | ApiKey | admin_api | `apps/admin_api/models/api_key.py` | ✅ | Better Auth API key plugin. Move ownership to admin_api. |
| M8 | Jwks | accounts | `apps/accounts/models/jwks.py` | ✅ | JWT key set. May be obsoleted by simplejwt — confirm. |
| M9 | Chat | messaging | `apps/messaging/models/chat.py` | ✅ |  |
| M10 | ChatMember | messaging | `apps/messaging/models/chat_member.py` | ✅ |  |
| M11 | Message | messaging | `apps/messaging/models/message.py` | ✅ | JSONField for `reactions`, `editedAt`, `deletedAt`. |
| M12 | BlockedUser | messaging | `apps/messaging/models/blocked_user.py` | ✅ |  |
| M13 | Service | services | `apps/services/models/service.py` | ✅ | JSONField for `media`, `addons`, `faq`, `tags`. |
| M14 | Review | reviews | `apps/reviews/models/review.py` | ✅ |  |
| M15 | SavedService | saved | `apps/saved/models/saved_service.py` | ✅ |  |
| M16 | SavedProfile | saved | `apps/saved/models/saved_profile.py` | ✅ |  |
| M17 | Subscription | billing | `apps/billing/models/subscription.py` | ✅ | Multi-provider (Stripe, PayPal, Worldline, Manual). JSONField for `billingSnapshot`. |
| M18 | BlogArticle | blog | `apps/blog/models/blog_article.py` | ✅ |  |
| M19 | BlogArticleAuthor | blog | `apps/blog/models/blog_article_author.py` | ✅ | M2M through table. |
| M20 | TaxonomySubmission | taxonomy | `apps/taxonomy/models/taxonomy_submission.py` | ✅ |  |
| M21 | Media | media | `apps/media/models/media.py` | ✅ | Cloudinary asset registry. |
| M22 | Contact | support | `apps/support/models/contact.py` | ✅ |  |
| M23 | EmailBatch | messaging | `apps/messaging/models/email_batch.py` | ✅ | Tracks unread message email digests. |
| M24 | PendingRegistration | accounts | `apps/accounts/models/pending_registration.py` | ✅ | OAuth intent (24h expiry). May be obsoleted by cookie-based flow — confirm. |

---

# Section 4 — Middleware (5)

Each Next.js middleware → Django equivalent (middleware, permission, or settings).

| # | Next.js middleware | Behavior | Django equivalent | Status | Notes |
|---|---|---|---|---|---|
| MW1 | `withSimpleAuth` | Session cookie verification + redirects | DRF authentication classes (cookie/JWT) + `IsAuthenticated` permission per view; redirect logic moves to frontend | ⬜ |  |
| MW2 | `withHeaders` | Sets X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, CSP, x-current-path | `django-csp` + Django security middleware (`SECURE_*` settings) | ⬜ |  |
| MW3 | `withLowercaseRedirect` | 301 redirects uppercase paths to lowercase, /pros → /dir | Custom Django middleware `core.middleware.LowercaseRedirectMiddleware` | ⬜ |  |
| MW4 | `withAdminAuth` | Admin route guard | Per-view DRF permission classes (`IsAdmin`, `HasResourcePermission(...)`) | ⬜ |  |
| MW5 | `stackHandler` | Composer (utility) | N/A — Django middleware MIDDLEWARE list does this declaratively | ⬜ |  |

---

# Section 5 — Async tasks (Celery beat)

| # | Beat schedule | Task | Source | Status | Notes |
|---|---|---|---|---|---|
| T1 | every 15 min | `messaging.tasks.process_email_batches` | endpoint #10 | ⬜ |  |
| T2 | daily 03:00 UTC | `services.tasks.auto_refresh_promoted` | endpoint #9 | ⬜ |  |
| T3 | daily 04:00 UTC | `billing.tasks.process_worldline_renewals` | endpoint #11 | ⬜ |  |
| T4 | hourly | `accounts.tasks.cleanup_expired_pending_registrations` | (new — replaces 24h expiry on `PendingRegistration`) | ⬜ |  |

---

# Section 6 — Tracker discipline reminders

- Re-read this file at the start of every work session.
- Before migrating endpoint N: change row N's status to `🟡 In progress`.
- After code merged: `✅ Done`.
- After tests merged: `🧪 Tested`.
- After it appears in `/api/schema/`: `📘 Documented`.
- If anything diverged from Next.js behavior, add a Notes column entry.
- If a new endpoint is discovered in source that isn't here, ADD a row before doing anything else.
- The migration is only complete when **all 248 endpoint rows** (rows 1–248) are at `📘 Documented`.

---

# Section 6.5 — Endpoints added after the original tracker

These admin moderation endpoints didn't exist in the Next.js source — the
original code did taxonomy-submission moderation directly in Prisma. Added
here to give the admin UI a clean Django path.

| # | Method | Path | Purpose | Auth | Status | Notes |
|---|---|---|---|---|---|---|
| 249 | GET | `/api/admin/taxonomy/submissions` | List submissions w/ filters (status, type, search) | session+TAXONOMIES:view | ✅ |  |
| 250 | GET | `/api/admin/taxonomy/submissions/stats` | Counts by status | session+TAXONOMIES:view | ✅ |  |
| 251 | POST | `/api/admin/taxonomy/submissions/{id}/approve` | Approve + commit dataset entry | session+TAXONOMIES:edit | ✅ | Calls dataset_ops.create_skill/create_tag |
| 252 | POST | `/api/admin/taxonomy/submissions/{id}/reject` | Reject with reason | session+TAXONOMIES:edit | ✅ |  |
| 253 | POST | `/api/admin/taxonomy/submissions/bulk-approve` | Bulk approve | session+TAXONOMIES:edit | ✅ |  |
| 254 | POST | `/api/admin/taxonomy/submissions/bulk-reject` | Bulk reject (single shared reason) | session+TAXONOMIES:edit | ✅ |  |

---

# Section 7 — Open questions for the user

Before Phase 2 (architecture plan), these decisions affect grouping and need confirmation:

1. **Skills & tags storage** (rows 223–228): Currently file-based + committed via GitHub. Should we (a) keep file-based and call GitHub from Django, or (b) migrate to DB tables (`SkillItem`, `TagItem`) and drop the GitHub workflow for skills/tags? *Recommendation: migrate to DB; keep service/pro taxonomies (categories/subcategories) file-based since they're more structural.*
2. **Taxonomy datasets** (`service-taxonomies`, `pro-taxonomies` JSON files in `src/lib/constants/datasets/`): Keep file-based with GitHub workflow (rows 229–234, 235–242), or migrate to DB?
3. **Sitemaps** (rows 12–14): Verify — should Django generate sitemaps if Next.js stays as the frontend SSR/SSG? Or keep sitemaps in Next.js?
4. **Cache revalidation webhook** (row 8) and **revalidate-all admin endpoint** (row 243): If Next.js stays as the frontend with ISR, Django needs to call back to Next.js's `/api/revalidate` after writes. Confirm whether to keep this bidirectional webhook, or whether the frontend will switch to client-side data fetching (no ISR).
5. **`/api/auth/exchange-token`** (row 2): Becomes obsolete once messaging cuts over to Django Channels. Plan to delete after messaging app migration?
6. **`useFormState`/`useActionState` collapse**: Many admin actions have `*Action` FormData variants of plain functions (collapsed in tracker, e.g. row 158 covers both `updateUserBasicInfo` and `updateUserBasicInfoAction`). Confirm DRF endpoints accept JSON only — frontend will be refactored to drop FormData wrappers.

---

**End of tracker.** Total endpoint rows: 248 (rows 1–248). Plus 24 model rows, 5 middleware rows, 4 async task rows, 2 WebSocket consumers.
