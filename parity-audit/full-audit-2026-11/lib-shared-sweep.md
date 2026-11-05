# Lib / shared / app-level SWEEP parity audit — 2026-11-05

Scope: every file under `oldnext/src` + `oldnext/scripts` + root config that is
NOT owned by another domain agent, plus "orphan" cross-cutting libraries nobody
else would cover (email templates + Brevo, error translation, TZ/instrumentation,
SEO, sitemaps/robots, consent/GTM, rate-limiting, middleware non-auth parts,
shared components, ui primitives, constants, types, config).
Method: full file enumeration (1172 old files, inventory in §1.4), byte-level
`diff` of every same-path file old→new, read of every differing / missing sweep
file, and lookup of the Django counterpart (backend `common/`, `config/`,
`apps/messaging/{emails,brevo,tasks}.py`, `apps/core/views/public/sitemaps.py`,
`apps/blog/constants.py`, …). Zero code changes made.

## 1. Coverage

### 1.1 OLD files read (sweep-owned, with role) — grouped
- **App-level**: `src/app/layout.tsx` (root layout, metadata, favicon set, GTM loader), `global-error.tsx`, `global-not-found.tsx` (404/500 copy), `robots.txt`, `sitemap.xml/route.ts` (sitemap index), `sitemap_static.xml/route.ts`, `(sitemap)/sitemap_index.xml/route.ts`, all route-group layouts (`(home)`, `(pages)`, `(archives)`, `(blog)`, `(auth)`, `(profile)`, `(service)`, `(dashboard)/dashboard/layout.tsx` + `page.tsx`), static pages `(pages)/{about,contact,faq,for-pros,privacy,terms,politiki-akirosis}/page.tsx`; per-section sitemaps `(service)/s/sitemap.ts`, `(profile)/profile/sitemap.ts`, `(blog)/articles/sitemap.ts`, `(archives)/(pro)/dir/sitemap.ts`, `(archives)/(services)/{categories,ipiresies}/sitemap.ts` (read for sitemap parity even though their folders belong to domain agents).
- **Root/infra**: `src/instrumentation.ts` (forces `process.env.TZ='Europe/Athens'`), `src/middleware.ts`, `src/middlewares/{index,stackHandler,withHeaders,withLowercaseRedirect}.ts`, `withAdminAuth.ts` (dead — never imported), `next.config.js`, `next.config.analyzer.js`, `vercel.json` (3 crons, UTC), `package.json`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `components.json`, `Dockerfile`, `docker-compose.yml`, `prisma.config.ts`, `README.md`.
- **actions**: `src/actions/index.ts` (re-exports auth only), `src/actions/shared/index.ts` (all exports commented — empty barrel).
- **lib (sweep part)**: `lib/errors.ts` (EN→GR error translation map + AppError + Prisma error mapper), `lib/fonts.ts`, `lib/utils.ts`, `lib/utils/{api,cn,cooldown,datasets,date,form,format,index,media,zod}.ts`, `lib/utils/formatting/{date,index,rich-text,text,time}`, `lib/utils/text/{greek-latin,html,index,normalize,sanitize,slug,truncate}.ts`, `lib/utils/validation/{formats,index}.ts`, `lib/utils/misc/{errors.js,experience,index,shuffle}.ts`, `lib/utils/navigation/{active.js,index,paths.js,sitemap.js}` (dead), `lib/utils/taxonomy-routes.ts` (dead), `lib/config/index.ts` (empty placeholder), `lib/cache/{config,index,keys,revalidation}.ts` + `__tests__/caching.test.ts`, `lib/seo/{fetch-entity,format-template,get-entity-values,meta,metadata,pages}.ts`, `lib/seo/schema/*` (10 files, JSON-LD), `lib/email/**` (15 files: Brevo client, list-management, workflows, types, services/*-emails, auth-integration, constants, workflow-config), `constants/email/email-config.ts` + 16 `templates/*.ts`, `lib/types/*` (type-only files incl. `email.ts`, `components.ts`, `common.ts`, `index.ts`, `api.ts`, `datasets.ts`, `server-actions.ts`), `lib/prisma/{client,json-types}.ts` + 13 `schema/*.prisma` + 3 migration files (platform swap), `lib/database/selects/index.ts`, `lib/hooks/{index,use-hash-scroll,use-resettable-action-state}.ts`, `lib/hooks/ui/*`, `lib/stores/use-navigation-skeleton-store.ts`, `lib/validations/{index,shared}.ts`, `types/global.d.ts`, `styles/{critical,globals}.css`.
- **constants/datasets (sweep part)**: `about, blog-categories, budgets, collections, company-sizes, contact, counter-stats, dashboard, data, faq, footer, for-pros, options, subscription-types, tabs`.
- **components (sweep part)**: `components/index.ts`, `components/link.ts` (dead), `components/dynamic/*`, `components/providers/*` (dead — never imported), `components/guards/index.ts`, `components/icon/**` (63 files), `components/ui/**` (53 primitives), `components/shared/**` (60 files: header/footer/wrappers, breadcrumbs, cards, galleries, 404/error pages, badges…), `components/dashboard/{dashboard-*,index,no-service-dialog}.tsx` (dashboard shell), `components/home/index.ts`.
- **scripts/** (26 one-off Strapi→Prisma migration / debug / backfill scripts) and `scripts/build-taxonomy-maps.ts` (read; owned by home-search-taxonomy).

### 1.2 NEW files read
frontend: `src/lib/api/client.ts`, `src/lib/errors.ts`, `src/middleware.ts`, `src/middlewares/*`, `src/app/layout.tsx`, `src/app/sitemap*.ts(x)`, all 6 section `sitemap.ts`, `src/app/(pages)/cookies/page.tsx`, `src/lib/analytics/{consent,cookie-consent-config}.ts`, `src/components/consent/*` (7 files), `src/lib/seo/**`, `src/lib/utils/{datasets,date,formatting/date,messages,media,form}.ts`, `src/lib/subscription/feature-gate.ts`, `src/lib/hooks/use-payments-access.ts`, `src/app/api/payments/check-access/route.ts`, `src/constants/datasets/{blog-categories,footer,dashboard,cookies}.ts`, `src/components/shared/{service-card,service-media-card,user-avatar,next-link,dynamic-breadcrumb,layout/footer/footer-global}.tsx`, `src/components/ui/sheet.tsx`, `src/components/dashboard/{dashboard-content,dashboard-sidebar,dashboard-nav-services}.tsx`, `src/actions/services/get-services.ts` (breadcrumbs), `src/actions/profiles/get-profiles.ts` (breadcrumbs), `src/actions/auth/forgot-password.ts`, `next.config.js`, `Dockerfile`, `package.json`, `scripts/build-taxonomy-maps.ts`, root `docker-compose.yml`, `GO-PRODUCTION-CHECKLIST.md`, `docs/CATEGORIES-FEATURED-TAXONOMY.md`.
backend: `common/{exceptions,throttling,pagination,mixins,permissions}.py`, `common/utils/{slug,greek_latin,normalize,cuid}.py`, `config/{urls,celery}.py`, `config/settings/{base,prod}.py`, `apps/messaging/{emails,brevo,tasks}.py`, `apps/core/views/public/sitemaps.py`, `apps/core/urls/{public,sitemaps}.py`, `apps/blog/constants.py`, `apps/blog/services/articles.py` (validation), `apps/accounts/services/admin_users.py` (Brevo hooks), `apps/accounts/views/public/auth.py` (ForgotPasswordView), `apps/profiles/selectors/profile_aggregations.py` (breadcrumbs), `apps/support/views/public/support.py`, `apps/services/views/public/service.py` (report email), `backend/.env.example`.

### 1.3 Delegated elsewhere (file group → owning domain)
Exact per-file assignment is the "Owner" column of §1.4. Summary:
- auth-accounts: `actions/auth/*`, `components/forms/auth/*`, `app/(auth)/*`, `app/api/auth/*`, `app/api/verify-email`, `lib/auth/*`, `lib/utils/{better-auth-error,auth-error-handler}.ts`, `lib/rate-limit/memory.ts`, `middlewares/{withSimpleAuth,withAdminAuth}.ts`, `lib/stores/authStore.ts`, `lib/validations/{auth,user}.ts`, `lib/types/auth.ts`, `components/guards/{oauth-setup,onboarding}-guard.tsx`. *Hand-off notes*: (a) `oauth-setup-guard.tsx:35` condition changed `step === 'ONBOARDING'` → `step !== 'DASHBOARD'`; (b) forgot-password throttle keying — see D11.
- profiles-dashboard: `actions/profiles/{additional-info,basic-info,billing,coverage,portfolio,presentation,verification,lookup-afm}.ts`, `components/forms/profile/*`, `app/(dashboard)/dashboard/{profile,documents}/*`, `lib/validations/profile.ts`. *Hand-off note*: `profilePresentationUpdateSchema.visibility.{phone,address}` changed from `z.boolean().optional()` to required `z.boolean()` (new `lib/validations/profile.ts:507-509`); `address` became `.nullable()` (line 116).
- profiles-public-archives: `actions/profiles/{get-directory,get-profile,get-profiles,report-profile}.ts`, `components/profile/*`, `components/archives/*`, `app/(profile)/*`, `app/(archives)/(pro)/*`, `lib/hooks/archives/*`, `lib/database/selects/profile.ts`, `components/shared/profile-*`.
- services: `actions/services/*`, `components/{service,services,forms/service,dashboard/services}/*`, `app/(service)/*`, `app/(archives)/(services)/ipiresies/*`, `app/(dashboard)/dashboard/services/*`, `lib/utils/service.ts`, `lib/stores/use-service-order-store.ts`, `lib/validations/service.ts`, `lib/types/services.ts`, `lib/database/selects/service.ts`, `components/shared/service-*` (I still diffed `service-card`/`service-media-card` — see D10).
- home-search-taxonomy: `actions/{home,search}/*`, `actions/taxonomy-submission.ts`, `components/home/*`, `lib/taxonomies/*`, `app/(home)/*`, `app/(archives)/(services)/categories/*`, `lib/utils/{search/*,taxonomy-submission.ts}`, `lib/validations/taxonomy-submission.ts`, `lib/stores/use-home-featured-services-store.ts`, `lib/types/search.ts`, header search + `navigation-menu.tsx` (both byte-identical), taxonomy datasets (`pro-taxonomies, service-taxonomies, skills, tags, locations, category-icons` — all byte-identical), `scripts/build-taxonomy-maps.ts`.
- reviews-saved: `actions/{reviews,saved}/*`, `components/review/*`, `components/dashboard/{reviews,saved}/*`, `app/(dashboard)/dashboard/{reviews,saved}/*`, `lib/validations/review.ts`, `lib/providers/saved-state-provider.tsx`, `components/shared/save-button.tsx`, `lib/types/{reviews,saved}.ts`, `lib/database/selects/saved.ts`, `components/dashboard/menu-saved.tsx`, `lib/utils/{rating,format-rating}.ts`.
- messaging: `actions/messages/*`, `components/messages/*`, `app/(dashboard)/dashboard/messages/*`, `lib/hooks/chat/*`, `lib/supabase/*`, `lib/utils/messages.ts`, `lib/validations/{chat,contact}.ts`, `lib/database/selects/chat.ts`, `components/dashboard/button-messages.tsx`, `lib/hooks/use-unread-count.ts`, `lib/types/messages.ts`, `components/forms/form-contact.tsx`.
- billing-payments: `actions/subscription/*`, `app/api/payment/*`, `app/api/webhooks/worldline/*`, `app/api/cron/worldline-renewals`, `components/subscription/*`, `app/(dashboard)/dashboard/{checkout,promote}/*`, `app/payment/*`, `lib/payment/*`, `lib/subscription/*`, `lib/validations/subscription.ts`, `lib/hooks/use-subscription-gate.ts`, `lib/stores/use-subscription-sheet-store.ts`, `scripts/backfill-subscription-billing.ts`. *Hand-off note*: new `feature-gate.ts` ignores its `profileId` arg and reads the caller's own subscription; only `canCreateService` is still used by the frontend so currently harmless.
- admin: `actions/admin/*`, `components/admin/**`, `app/(admin)/*`, `app/actions/*` (incl. `shared-file-formatter.ts`, `taxonomy-file-manager.ts` — git-file taxonomy publishing, superseded by Django DB), `lib/hooks/admin/*`, `lib/{taxonomy-drafts,taxonomy-tree-preview}.ts`, `lib/validations/{admin,taxonomy-drafts}.ts`, `lib/types/taxonomy-operations.ts`, `components/guards/admin-guard.tsx`, and the admin-only ui primitives `ui/chart.tsx`, `ui/toggle-group.tsx` (only importers are `components/admin/{data-table,chart-area-interactive}.tsx`).
- blog-support-media-crons: `actions/{blog,support,cloudinary,github}/*`, `app/api/{sign-cloudinary-params,cron/auto-refresh,cron/process-email-batches,webhooks/revalidate-cache,debug/time}`, `components/blog/*`, `app/(blog)/*`, `components/dashboard/support-feedback-dialog.tsx`, `lib/github/*`, `lib/utils/{blog,cloudinary}.ts`, `components/media/**`, `lib/validations/{blog,support,media}.ts`, `lib/types/{blog,cloudinary,github}.ts`. (Blog-category constants are mine — D2.)

### 1.4 Complete inventory (every old file, owner, and same-path status in `frontend/`)
"NO same-path file" ≠ missing feature: Prisma/Supabase/Better-Auth/Brevo/Worldline
logic moved to Django — the Django counterpart is named in §2 / the findings.
For every **sweep** row: identical rows were confirmed byte-identical by `diff`;
every differing or absent sweep row was read and is accounted for in §2–§4.
Totals by owner: admin=261, auth-accounts=59, billing-payments=47, blog-support-media-crons=47, home-search-taxonomy=47, messaging=50, profiles-dashboard=37, profiles-public-archives=65, reviews-saved=52, services=82, sweep=425 (total 1172)

| # | OLD file | Owner | New same-path counterpart |
|---|---|---|---|
| 1 | `Dockerfile` | sweep | differs (100 lines) |
| 2 | `README.md` | sweep | NO same-path file |
| 3 | `components.json` | sweep | identical |
| 4 | `docker-compose.yml` | sweep | NO same-path file |
| 5 | `next.config.analyzer.js` | sweep | NO same-path file |
| 6 | `next.config.js` | sweep | differs (27 lines) |
| 7 | `package.json` | sweep | differs (85 lines) |
| 8 | `postcss.config.js` | sweep | identical |
| 9 | `prisma.config.ts` | sweep | NO same-path file |
| 10 | `scripts/backfill-coverage-normalized.ts` | sweep | NO same-path file |
| 11 | `scripts/backfill-subscription-billing.ts` | billing-payments | NO same-path file |
| 12 | `scripts/benchmark-performance.ts` | sweep | identical |
| 13 | `scripts/build-taxonomy-maps.ts` | home-search-taxonomy | differs (50 lines) |
| 14 | `scripts/check-service-status.ts` | sweep | NO same-path file |
| 15 | `scripts/check-strapi-roles.ts` | sweep | NO same-path file |
| 16 | `scripts/check-target-services.ts` | sweep | NO same-path file |
| 17 | `scripts/check-user-roles.ts` | sweep | NO same-path file |
| 18 | `scripts/compare-descriptions.ts` | sweep | NO same-path file |
| 19 | `scripts/debug-coverage-relations.ts` | sweep | NO same-path file |
| 20 | `scripts/debug-description.ts` | sweep | NO same-path file |
| 21 | `scripts/debug-profile-images.ts` | sweep | NO same-path file |
| 22 | `scripts/debug-socials.ts` | sweep | NO same-path file |
| 23 | `scripts/explore-service-components.ts` | sweep | NO same-path file |
| 24 | `scripts/explore-services-structure.ts` | sweep | NO same-path file |
| 25 | `scripts/fix-duplicate-submission-ids.ts` | sweep | NO same-path file |
| 26 | `scripts/inspect-strapi-schema.sql` | sweep | NO same-path file |
| 27 | `scripts/migrate-taxonomy-images.ts` | sweep | NO same-path file |
| 28 | `scripts/migrate-users.ts` | sweep | NO same-path file |
| 29 | `scripts/migration-test.ts` | sweep | NO same-path file |
| 30 | `scripts/profile-migration.ts` | sweep | NO same-path file |
| 31 | `scripts/run-image-debug.ts` | sweep | NO same-path file |
| 32 | `scripts/service-migration.ts` | sweep | NO same-path file |
| 33 | `scripts/test-socials-fix.ts` | sweep | NO same-path file |
| 34 | `scripts/update-migrated-roles.ts` | sweep | NO same-path file |
| 35 | `scripts/user-migration.ts` | sweep | NO same-path file |
| 36 | `src/actions/admin/action-wrappers.ts` | admin | identical |
| 37 | `src/actions/admin/api-keys.ts` | admin | differs (225 lines) |
| 38 | `src/actions/admin/chats.ts` | admin | differs (512 lines) |
| 39 | `src/actions/admin/git-operations.ts` | admin | NO same-path file |
| 40 | `src/actions/admin/helpers.ts` | admin | differs (184 lines) |
| 41 | `src/actions/admin/index.ts` | admin | identical |
| 42 | `src/actions/admin/pro-taxonomies.ts` | admin | differs (51 lines) |
| 43 | `src/actions/admin/profiles.ts` | admin | differs (1088 lines) |
| 44 | `src/actions/admin/profiles/additional-info.ts` | admin | differs (171 lines) |
| 45 | `src/actions/admin/profiles/basic-info.ts` | admin | differs (189 lines) |
| 46 | `src/actions/admin/profiles/billing.ts` | admin | differs (157 lines) |
| 47 | `src/actions/admin/profiles/coverage.ts` | admin | differs (144 lines) |
| 48 | `src/actions/admin/profiles/index.ts` | admin | identical |
| 49 | `src/actions/admin/profiles/portfolio.ts` | admin | differs (151 lines) |
| 50 | `src/actions/admin/profiles/presentation.ts` | admin | differs (169 lines) |
| 51 | `src/actions/admin/revalidate-caches.ts` | admin | identical |
| 52 | `src/actions/admin/revalidate-taxonomies.ts` | admin | identical |
| 53 | `src/actions/admin/reviews.ts` | admin | differs (517 lines) |
| 54 | `src/actions/admin/services.ts` | admin | differs (2009 lines) |
| 55 | `src/actions/admin/skills.ts` | admin | identical |
| 56 | `src/actions/admin/subscriptions.ts` | admin | differs (485 lines) |
| 57 | `src/actions/admin/tags.ts` | admin | identical |
| 58 | `src/actions/admin/taxonomies-shared.ts` | admin | differs (561 lines) |
| 59 | `src/actions/admin/taxonomies.ts` | admin | differs (82 lines) |
| 60 | `src/actions/admin/taxonomy-git.ts` | admin | NO same-path file |
| 61 | `src/actions/admin/taxonomy-helpers.ts` | admin | differs (38 lines) |
| 62 | `src/actions/admin/taxonomy-publish.ts` | admin | NO same-path file |
| 63 | `src/actions/admin/taxonomy-submission.ts` | admin | differs (473 lines) |
| 64 | `src/actions/admin/users.ts` | admin | differs (1830 lines) |
| 65 | `src/actions/admin/verifications.ts` | admin | differs (371 lines) |
| 66 | `src/actions/auth/change-password.ts` | auth-accounts | differs (60 lines) |
| 67 | `src/actions/auth/change-username.ts` | auth-accounts | differs (173 lines) |
| 68 | `src/actions/auth/client.ts` | auth-accounts | differs (2 lines) |
| 69 | `src/actions/auth/complete-onboarding.ts` | auth-accounts | differs (275 lines) |
| 70 | `src/actions/auth/delete-account.ts` | auth-accounts | differs (100 lines) |
| 71 | `src/actions/auth/forgot-password.ts` | auth-accounts | differs (122 lines) |
| 72 | `src/actions/auth/index.ts` | auth-accounts | identical |
| 73 | `src/actions/auth/login.ts` | auth-accounts | differs (157 lines) |
| 74 | `src/actions/auth/maintenance.ts` | auth-accounts | differs (76 lines) |
| 75 | `src/actions/auth/oauth-setup.ts` | auth-accounts | differs (137 lines) |
| 76 | `src/actions/auth/register.ts` | auth-accounts | differs (187 lines) |
| 77 | `src/actions/auth/resend-verification.ts` | auth-accounts | differs (62 lines) |
| 78 | `src/actions/auth/reset-password.ts` | auth-accounts | differs (124 lines) |
| 79 | `src/actions/auth/server.ts` | auth-accounts | differs (864 lines) |
| 80 | `src/actions/auth/store-oauth-intent.ts` | auth-accounts | differs (9 lines) |
| 81 | `src/actions/auth/update-account.ts` | auth-accounts | differs (183 lines) |
| 82 | `src/actions/auth/update-user-type.ts` | auth-accounts | differs (74 lines) |
| 83 | `src/actions/auth/upgrade-to-pro.ts` | auth-accounts | differs (124 lines) |
| 84 | `src/actions/blog/get-article.ts` | blog-support-media-crons | differs (74 lines) |
| 85 | `src/actions/blog/get-articles.ts` | blog-support-media-crons | differs (180 lines) |
| 86 | `src/actions/blog/manage-articles.ts` | blog-support-media-crons | differs (367 lines) |
| 87 | `src/actions/cloudinary/get-media-library-token.ts` | blog-support-media-crons | differs (57 lines) |
| 88 | `src/actions/github/operations.ts` | blog-support-media-crons | NO same-path file |
| 89 | `src/actions/home/get-home-data.ts` | home-search-taxonomy | differs (659 lines) |
| 90 | `src/actions/index.ts` | sweep | NO same-path file |
| 91 | `src/actions/messages/blocking.ts` | messaging | differs (122 lines) |
| 92 | `src/actions/messages/chats.ts` | messaging | differs (292 lines) |
| 93 | `src/actions/messages/contact.ts` | messaging | differs (119 lines) |
| 94 | `src/actions/messages/index.ts` | messaging | identical |
| 95 | `src/actions/messages/messages.ts` | messaging | differs (459 lines) |
| 96 | `src/actions/messages/presence.ts` | messaging | differs (91 lines) |
| 97 | `src/actions/messages/reactions.ts` | messaging | differs (160 lines) |
| 98 | `src/actions/profiles/additional-info.ts` | profiles-dashboard | differs (163 lines) |
| 99 | `src/actions/profiles/basic-info.ts` | profiles-dashboard | differs (178 lines) |
| 100 | `src/actions/profiles/billing.ts` | profiles-dashboard | differs (143 lines) |
| 101 | `src/actions/profiles/coverage.ts` | profiles-dashboard | differs (131 lines) |
| 102 | `src/actions/profiles/get-directory.ts` | profiles-public-archives | differs (305 lines) |
| 103 | `src/actions/profiles/get-profile.ts` | profiles-public-archives | differs (625 lines) |
| 104 | `src/actions/profiles/get-profiles.ts` | profiles-public-archives | differs (1182 lines) |
| 105 | `src/actions/profiles/lookup-afm.ts` | profiles-dashboard | differs (124 lines) |
| 106 | `src/actions/profiles/portfolio.ts` | profiles-dashboard | differs (136 lines) |
| 107 | `src/actions/profiles/presentation.ts` | profiles-dashboard | differs (224 lines) |
| 108 | `src/actions/profiles/report-profile.ts` | profiles-public-archives | differs (123 lines) |
| 109 | `src/actions/profiles/verification.ts` | profiles-dashboard | differs (311 lines) |
| 110 | `src/actions/reviews/create-review.ts` | reviews-saved | differs (309 lines) |
| 111 | `src/actions/reviews/get-review-stats.ts` | reviews-saved | differs (90 lines) |
| 112 | `src/actions/reviews/get-reviews.ts` | reviews-saved | differs (316 lines) |
| 113 | `src/actions/reviews/get-user-reviews.ts` | reviews-saved | differs (600 lines) |
| 114 | `src/actions/reviews/index.ts` | reviews-saved | identical |
| 115 | `src/actions/reviews/moderate-review.ts` | reviews-saved | differs (268 lines) |
| 116 | `src/actions/reviews/toggle-review-visibility.ts` | reviews-saved | differs (107 lines) |
| 117 | `src/actions/reviews/update-rating.ts` | reviews-saved | NO same-path file |
| 118 | `src/actions/saved/get-saved-items.ts` | reviews-saved | differs (235 lines) |
| 119 | `src/actions/saved/get-saved-state.ts` | reviews-saved | differs (55 lines) |
| 120 | `src/actions/saved/index.ts` | reviews-saved | identical |
| 121 | `src/actions/saved/toggle-save.ts` | reviews-saved | differs (97 lines) |
| 122 | `src/actions/search/search-services.ts` | home-search-taxonomy | differs (368 lines) |
| 123 | `src/actions/services/create-service.ts` | services | differs (493 lines) |
| 124 | `src/actions/services/delete-service.ts` | services | differs (225 lines) |
| 125 | `src/actions/services/get-categories.ts` | services | differs (750 lines) |
| 126 | `src/actions/services/get-recent-services.ts` | services | differs (63 lines) |
| 127 | `src/actions/services/get-service.ts` | services | differs (716 lines) |
| 128 | `src/actions/services/get-services.ts` | services | differs (1544 lines) |
| 129 | `src/actions/services/get-user-services.ts` | services | differs (261 lines) |
| 130 | `src/actions/services/index.ts` | services | identical |
| 131 | `src/actions/services/refresh-service.ts` | services | differs (154 lines) |
| 132 | `src/actions/services/report-service.ts` | services | differs (104 lines) |
| 133 | `src/actions/services/update-service.ts` | services | differs (534 lines) |
| 134 | `src/actions/shared/index.ts` | sweep | NO same-path file |
| 135 | `src/actions/subscription/cancel-subscription.ts` | billing-payments | differs (72 lines) |
| 136 | `src/actions/subscription/create-checkout-session.ts` | billing-payments | differs (136 lines) |
| 137 | `src/actions/subscription/get-subscription.ts` | billing-payments | differs (43 lines) |
| 138 | `src/actions/subscription/index.ts` | billing-payments | differs (2 lines) |
| 139 | `src/actions/subscription/restore-subscription.ts` | billing-payments | differs (70 lines) |
| 140 | `src/actions/subscription/sync-billing.ts` | billing-payments | differs (64 lines) |
| 141 | `src/actions/subscription/toggle-featured-service.ts` | billing-payments | differs (88 lines) |
| 142 | `src/actions/subscription/validate-coupon.ts` | billing-payments | differs (42 lines) |
| 143 | `src/actions/support/submit-feedback.ts` | blog-support-media-crons | differs (90 lines) |
| 144 | `src/actions/taxonomy-submission.ts` | home-search-taxonomy | differs (172 lines) |
| 145 | `src/app/(admin)/admin/analytics/page.tsx` | admin | identical |
| 146 | `src/app/(admin)/admin/api-keys/page.tsx` | admin | identical |
| 147 | `src/app/(admin)/admin/articles/[id]/page.tsx` | admin | differs (30 lines) |
| 148 | `src/app/(admin)/admin/articles/create/page.tsx` | admin | differs (34 lines) |
| 149 | `src/app/(admin)/admin/articles/page.tsx` | admin | identical |
| 150 | `src/app/(admin)/admin/chats/[cid]/page.tsx` | admin | identical |
| 151 | `src/app/(admin)/admin/chats/page.tsx` | admin | identical |
| 152 | `src/app/(admin)/admin/data.json` | admin | identical |
| 153 | `src/app/(admin)/admin/git/page.tsx` | admin | NO same-path file |
| 154 | `src/app/(admin)/admin/layout.tsx` | admin | identical |
| 155 | `src/app/(admin)/admin/notifications/page.tsx` | admin | differs (345 lines) |
| 156 | `src/app/(admin)/admin/page.tsx` | admin | differs (4 lines) |
| 157 | `src/app/(admin)/admin/profiles/[id]/page.tsx` | admin | differs (7 lines) |
| 158 | `src/app/(admin)/admin/profiles/page.tsx` | admin | identical |
| 159 | `src/app/(admin)/admin/reviews/[id]/page.tsx` | admin | identical |
| 160 | `src/app/(admin)/admin/reviews/page.tsx` | admin | identical |
| 161 | `src/app/(admin)/admin/services/[id]/page.tsx` | admin | identical |
| 162 | `src/app/(admin)/admin/services/create/page.tsx` | admin | identical |
| 163 | `src/app/(admin)/admin/services/page.tsx` | admin | identical |
| 164 | `src/app/(admin)/admin/subscriptions/[id]/page.tsx` | admin | differs (120 lines) |
| 165 | `src/app/(admin)/admin/subscriptions/create/page.tsx` | admin | identical |
| 166 | `src/app/(admin)/admin/subscriptions/page.tsx` | admin | identical |
| 167 | `src/app/(admin)/admin/taxonomies/git/page.tsx` | admin | NO same-path file |
| 168 | `src/app/(admin)/admin/taxonomies/layout.tsx` | admin | identical |
| 169 | `src/app/(admin)/admin/taxonomies/pro/categories/[id]/page.tsx` | admin | identical |
| 170 | `src/app/(admin)/admin/taxonomies/pro/categories/create/page.tsx` | admin | identical |
| 171 | `src/app/(admin)/admin/taxonomies/pro/categories/page.tsx` | admin | identical |
| 172 | `src/app/(admin)/admin/taxonomies/pro/page.tsx` | admin | differs (8 lines) |
| 173 | `src/app/(admin)/admin/taxonomies/pro/subcategories/[id]/page.tsx` | admin | identical |
| 174 | `src/app/(admin)/admin/taxonomies/pro/subcategories/create/page.tsx` | admin | identical |
| 175 | `src/app/(admin)/admin/taxonomies/pro/subcategories/page.tsx` | admin | identical |
| 176 | `src/app/(admin)/admin/taxonomies/service/[id]/page.tsx` | admin | differs (6 lines) |
| 177 | `src/app/(admin)/admin/taxonomies/service/categories/[id]/page.tsx` | admin | identical |
| 178 | `src/app/(admin)/admin/taxonomies/service/categories/create/page.tsx` | admin | differs (4 lines) |
| 179 | `src/app/(admin)/admin/taxonomies/service/categories/page.tsx` | admin | identical |
| 180 | `src/app/(admin)/admin/taxonomies/service/page.tsx` | admin | identical |
| 181 | `src/app/(admin)/admin/taxonomies/service/subcategories/[id]/page.tsx` | admin | identical |
| 182 | `src/app/(admin)/admin/taxonomies/service/subcategories/create/page.tsx` | admin | identical |
| 183 | `src/app/(admin)/admin/taxonomies/service/subcategories/page.tsx` | admin | identical |
| 184 | `src/app/(admin)/admin/taxonomies/service/subdivisions/[id]/page.tsx` | admin | identical |
| 185 | `src/app/(admin)/admin/taxonomies/service/subdivisions/create/page.tsx` | admin | identical |
| 186 | `src/app/(admin)/admin/taxonomies/service/subdivisions/page.tsx` | admin | identical |
| 187 | `src/app/(admin)/admin/taxonomies/skills/[id]/page.tsx` | admin | differs (6 lines) |
| 188 | `src/app/(admin)/admin/taxonomies/skills/create/page.tsx` | admin | identical |
| 189 | `src/app/(admin)/admin/taxonomies/skills/page.tsx` | admin | identical |
| 190 | `src/app/(admin)/admin/taxonomies/submissions/page.tsx` | admin | identical |
| 191 | `src/app/(admin)/admin/taxonomies/tags/[id]/page.tsx` | admin | identical |
| 192 | `src/app/(admin)/admin/taxonomies/tags/create/page.tsx` | admin | identical |
| 193 | `src/app/(admin)/admin/taxonomies/tags/page.tsx` | admin | identical |
| 194 | `src/app/(admin)/admin/team/page.tsx` | admin | identical |
| 195 | `src/app/(admin)/admin/users/[id]/page.tsx` | admin | differs (4 lines) |
| 196 | `src/app/(admin)/admin/users/page.tsx` | admin | identical |
| 197 | `src/app/(admin)/admin/verifications/[id]/page.tsx` | admin | differs (2 lines) |
| 198 | `src/app/(admin)/admin/verifications/page.tsx` | admin | identical |
| 199 | `src/app/(archives)/(pro)/dir/[category]/[subcategory]/not-found.tsx` | profiles-public-archives | identical |
| 200 | `src/app/(archives)/(pro)/dir/[category]/[subcategory]/page.tsx` | profiles-public-archives | differs (5 lines) |
| 201 | `src/app/(archives)/(pro)/dir/[category]/not-found.tsx` | profiles-public-archives | identical |
| 202 | `src/app/(archives)/(pro)/dir/[category]/page.tsx` | profiles-public-archives | differs (5 lines) |
| 203 | `src/app/(archives)/(pro)/dir/not-found.tsx` | profiles-public-archives | identical |
| 204 | `src/app/(archives)/(pro)/dir/page.tsx` | profiles-public-archives | differs (5 lines) |
| 205 | `src/app/(archives)/(pro)/dir/sitemap.ts` | profiles-public-archives | identical |
| 206 | `src/app/(archives)/(pro)/directory/page.tsx` | profiles-public-archives | differs (5 lines) |
| 207 | `src/app/(archives)/(services)/categories/[category]/not-found.tsx` | home-search-taxonomy | identical |
| 208 | `src/app/(archives)/(services)/categories/[category]/page.tsx` | home-search-taxonomy | differs (2 lines) |
| 209 | `src/app/(archives)/(services)/categories/page.tsx` | home-search-taxonomy | differs (5 lines) |
| 210 | `src/app/(archives)/(services)/categories/sitemap.ts` | home-search-taxonomy | identical |
| 211 | `src/app/(archives)/(services)/ipiresies/[subcategory]/[subdivision]/not-found.tsx` | services | identical |
| 212 | `src/app/(archives)/(services)/ipiresies/[subcategory]/[subdivision]/page.tsx` | services | differs (2 lines) |
| 213 | `src/app/(archives)/(services)/ipiresies/[subcategory]/not-found.tsx` | services | identical |
| 214 | `src/app/(archives)/(services)/ipiresies/[subcategory]/page.tsx` | services | differs (2 lines) |
| 215 | `src/app/(archives)/(services)/ipiresies/page.tsx` | services | differs (2 lines) |
| 216 | `src/app/(archives)/(services)/ipiresies/sitemap.ts` | services | identical |
| 217 | `src/app/(archives)/layout.tsx` | sweep | identical |
| 218 | `src/app/(auth)/forgot-password/page.tsx` | auth-accounts | identical |
| 219 | `src/app/(auth)/layout.tsx` | auth-accounts | identical |
| 220 | `src/app/(auth)/login/page.tsx` | auth-accounts | identical |
| 221 | `src/app/(auth)/oauth-callback/page.tsx` | auth-accounts | differs (4 lines) |
| 222 | `src/app/(auth)/oauth-setup/page.tsx` | auth-accounts | differs (4 lines) |
| 223 | `src/app/(auth)/onboarding/page.tsx` | auth-accounts | differs (7 lines) |
| 224 | `src/app/(auth)/register/failure/page.tsx` | auth-accounts | identical |
| 225 | `src/app/(auth)/register/page.tsx` | auth-accounts | identical |
| 226 | `src/app/(auth)/register/success/page.tsx` | auth-accounts | identical |
| 227 | `src/app/(auth)/reset-password/page.tsx` | auth-accounts | identical |
| 228 | `src/app/(blog)/articles/[slug]/page.tsx` | blog-support-media-crons | differs (2 lines) |
| 229 | `src/app/(blog)/articles/page.tsx` | blog-support-media-crons | differs (2 lines) |
| 230 | `src/app/(blog)/articles/sitemap.ts` | blog-support-media-crons | differs (47 lines) |
| 231 | `src/app/(blog)/layout.tsx` | blog-support-media-crons | identical |
| 232 | `src/app/(dashboard)/dashboard/checkout/checkout-content.tsx` | billing-payments | differs (6 lines) |
| 233 | `src/app/(dashboard)/dashboard/checkout/page.tsx` | billing-payments | differs (28 lines) |
| 234 | `src/app/(dashboard)/dashboard/documents/page.tsx` | profiles-dashboard | identical |
| 235 | `src/app/(dashboard)/dashboard/layout.tsx` | sweep | differs (5 lines) |
| 236 | `src/app/(dashboard)/dashboard/messages/[chatId]/page.tsx` | messaging | differs (173 lines) |
| 237 | `src/app/(dashboard)/dashboard/messages/page.tsx` | messaging | differs (7 lines) |
| 238 | `src/app/(dashboard)/dashboard/page.tsx` | sweep | differs (2 lines) |
| 239 | `src/app/(dashboard)/dashboard/profile/account/page.tsx` | profiles-dashboard | differs (4 lines) |
| 240 | `src/app/(dashboard)/dashboard/profile/additional/page.tsx` | profiles-dashboard | identical |
| 241 | `src/app/(dashboard)/dashboard/profile/basic/page.tsx` | profiles-dashboard | differs (8 lines) |
| 242 | `src/app/(dashboard)/dashboard/profile/contact-details/page.tsx` | profiles-dashboard | identical |
| 243 | `src/app/(dashboard)/dashboard/profile/coverage/page.tsx` | profiles-dashboard | differs (24 lines) |
| 244 | `src/app/(dashboard)/dashboard/profile/layout.tsx` | profiles-dashboard | identical |
| 245 | `src/app/(dashboard)/dashboard/profile/page.tsx` | profiles-dashboard | identical |
| 246 | `src/app/(dashboard)/dashboard/profile/verification/page.tsx` | profiles-dashboard | identical |
| 247 | `src/app/(dashboard)/dashboard/promote/cancel-subscription-button.tsx` | billing-payments | identical |
| 248 | `src/app/(dashboard)/dashboard/promote/page.tsx` | billing-payments | differs (42 lines) |
| 249 | `src/app/(dashboard)/dashboard/promote/subscription-management.tsx` | billing-payments | differs (18 lines) |
| 250 | `src/app/(dashboard)/dashboard/promote/success/page.tsx` | billing-payments | differs (7 lines) |
| 251 | `src/app/(dashboard)/dashboard/promote/success/success-content.tsx` | billing-payments | identical |
| 252 | `src/app/(dashboard)/dashboard/reviews/page.tsx` | reviews-saved | differs (7 lines) |
| 253 | `src/app/(dashboard)/dashboard/saved/page.tsx` | reviews-saved | identical |
| 254 | `src/app/(dashboard)/dashboard/services/(list)/loading.tsx` | services | identical |
| 255 | `src/app/(dashboard)/dashboard/services/(list)/page.tsx` | services | differs (10 lines) |
| 256 | `src/app/(dashboard)/dashboard/services/create/page.tsx` | services | identical |
| 257 | `src/app/(dashboard)/dashboard/services/create/success/page.tsx` | services | differs (2 lines) |
| 258 | `src/app/(dashboard)/dashboard/services/edit/[id]/not-found.tsx` | services | identical |
| 259 | `src/app/(dashboard)/dashboard/services/edit/[id]/page.tsx` | services | differs (26 lines) |
| 260 | `src/app/(home)/layout.tsx` | home-search-taxonomy | identical |
| 261 | `src/app/(home)/page.tsx` | home-search-taxonomy | differs (11 lines) |
| 262 | `src/app/(pages)/about/page.tsx` | sweep | identical |
| 263 | `src/app/(pages)/contact/page.tsx` | sweep | identical |
| 264 | `src/app/(pages)/faq/page.tsx` | sweep | identical |
| 265 | `src/app/(pages)/for-pros/page.tsx` | sweep | identical |
| 266 | `src/app/(pages)/layout.tsx` | sweep | identical |
| 267 | `src/app/(pages)/politiki-akirosis/page.tsx` | sweep | identical |
| 268 | `src/app/(pages)/privacy/page.tsx` | sweep | identical |
| 269 | `src/app/(pages)/terms/page.tsx` | sweep | identical |
| 270 | `src/app/(profile)/layout.tsx` | profiles-public-archives | identical |
| 271 | `src/app/(profile)/profile/[username]/loading.tsx` | profiles-public-archives | identical |
| 272 | `src/app/(profile)/profile/[username]/not-found.tsx` | profiles-public-archives | identical |
| 273 | `src/app/(profile)/profile/[username]/page.tsx` | profiles-public-archives | differs (55 lines) |
| 274 | `src/app/(profile)/profile/sitemap.ts` | profiles-public-archives | differs (53 lines) |
| 275 | `src/app/(service)/layout.tsx` | services | identical |
| 276 | `src/app/(service)/s/[slug]/loading.tsx` | services | identical |
| 277 | `src/app/(service)/s/[slug]/not-found.tsx` | services | identical |
| 278 | `src/app/(service)/s/[slug]/page.tsx` | services | differs (43 lines) |
| 279 | `src/app/(service)/s/sitemap.ts` | services | differs (48 lines) |
| 280 | `src/app/(sitemap)/sitemap_index.xml/route.ts` | sweep | identical |
| 281 | `src/app/actions/shared-file-formatter.ts` | admin | NO same-path file |
| 282 | `src/app/actions/taxonomy-file-manager.ts` | admin | NO same-path file |
| 283 | `src/app/actions/taxonomy-lock.ts` | admin | identical |
| 284 | `src/app/api/auth/[...all]/route.ts` | auth-accounts | differs (54 lines) |
| 285 | `src/app/api/auth/exchange-token/route.ts` | auth-accounts | NO same-path file |
| 286 | `src/app/api/cron/auto-refresh/route.ts` | blog-support-media-crons | differs (82 lines) |
| 287 | `src/app/api/cron/process-email-batches/route.ts` | blog-support-media-crons | differs (156 lines) |
| 288 | `src/app/api/cron/worldline-renewals/route.ts` | billing-payments | differs (347 lines) |
| 289 | `src/app/api/debug/time/route.ts` | blog-support-media-crons | NO same-path file |
| 290 | `src/app/api/payment/worldline/redirect/route.ts` | billing-payments | differs (115 lines) |
| 291 | `src/app/api/sign-cloudinary-params/route.ts` | blog-support-media-crons | differs (71 lines) |
| 292 | `src/app/api/verify-email/route.ts` | auth-accounts | differs (105 lines) |
| 293 | `src/app/api/webhooks/revalidate-cache/route.ts` | blog-support-media-crons | differs (5 lines) |
| 294 | `src/app/api/webhooks/worldline/advice/route.ts` | billing-payments | differs (369 lines) |
| 295 | `src/app/api/webhooks/worldline/route.ts` | billing-payments | differs (589 lines) |
| 296 | `src/app/global-error.tsx` | sweep | identical |
| 297 | `src/app/global-not-found.tsx` | sweep | identical |
| 298 | `src/app/layout.tsx` | sweep | differs (52 lines) |
| 299 | `src/app/payment/callback/callback-redirect.tsx` | billing-payments | differs (17 lines) |
| 300 | `src/app/payment/callback/page.tsx` | billing-payments | identical |
| 301 | `src/app/robots.txt` | sweep | identical |
| 302 | `src/app/sitemap.xml/route.ts` | sweep | identical |
| 303 | `src/app/sitemap_static.xml/route.ts` | sweep | differs (2 lines) |
| 304 | `src/components/admin/admin-articles-data-table.tsx` | admin | differs (41 lines) |
| 305 | `src/components/admin/admin-articles-filters.tsx` | admin | identical |
| 306 | `src/components/admin/admin-articles-table-section.tsx` | admin | identical |
| 307 | `src/components/admin/admin-articles-table-skeleton.tsx` | admin | identical |
| 308 | `src/components/admin/admin-brevo-stats.tsx` | admin | identical |
| 309 | `src/components/admin/admin-categories-data-table.tsx` | admin | identical |
| 310 | `src/components/admin/admin-categories-filters.tsx` | admin | identical |
| 311 | `src/components/admin/admin-categories-table-section.tsx` | admin | identical |
| 312 | `src/components/admin/admin-categories-table-skeleton.tsx` | admin | identical |
| 313 | `src/components/admin/admin-chat-detail-stats.tsx` | admin | differs (32 lines) |
| 314 | `src/components/admin/admin-chat-messages-data-table.tsx` | admin | differs (34 lines) |
| 315 | `src/components/admin/admin-chat-messages-filters.tsx` | admin | identical |
| 316 | `src/components/admin/admin-chat-messages-table-section.tsx` | admin | differs (5 lines) |
| 317 | `src/components/admin/admin-chat-messages-table-skeleton.tsx` | admin | identical |
| 318 | `src/components/admin/admin-chats-data-table.tsx` | admin | differs (9 lines) |
| 319 | `src/components/admin/admin-chats-filters.tsx` | admin | identical |
| 320 | `src/components/admin/admin-chats-stats.tsx` | admin | differs (8 lines) |
| 321 | `src/components/admin/admin-chats-table-section.tsx` | admin | differs (13 lines) |
| 322 | `src/components/admin/admin-chats-table-skeleton.tsx` | admin | identical |
| 323 | `src/components/admin/admin-data-table.tsx` | admin | identical |
| 324 | `src/components/admin/admin-layout-wrapper.tsx` | admin | differs (23 lines) |
| 325 | `src/components/admin/admin-nav-cards.tsx` | admin | differs (2 lines) |
| 326 | `src/components/admin/admin-pro-categories-data-table.tsx` | admin | identical |
| 327 | `src/components/admin/admin-pro-categories-filters.tsx` | admin | identical |
| 328 | `src/components/admin/admin-pro-categories-table-section.tsx` | admin | identical |
| 329 | `src/components/admin/admin-pro-categories-table-skeleton.tsx` | admin | identical |
| 330 | `src/components/admin/admin-pro-subcategories-data-table.tsx` | admin | identical |
| 331 | `src/components/admin/admin-pro-subcategories-filters.tsx` | admin | identical |
| 332 | `src/components/admin/admin-pro-subcategories-table-section.tsx` | admin | identical |
| 333 | `src/components/admin/admin-pro-subcategories-table-skeleton.tsx` | admin | identical |
| 334 | `src/components/admin/admin-pro-taxonomies-filters.tsx` | admin | identical |
| 335 | `src/components/admin/admin-pro-taxonomies-table-section.tsx` | admin | identical |
| 336 | `src/components/admin/admin-pro-taxonomies-table-skeleton.tsx` | admin | identical |
| 337 | `src/components/admin/admin-profiles-data-table.tsx` | admin | differs (29 lines) |
| 338 | `src/components/admin/admin-profiles-filters.tsx` | admin | identical |
| 339 | `src/components/admin/admin-profiles-stats.tsx` | admin | identical |
| 340 | `src/components/admin/admin-profiles-table-section.tsx` | admin | identical |
| 341 | `src/components/admin/admin-profiles-table-skeleton.tsx` | admin | identical |
| 342 | `src/components/admin/admin-review-actions.tsx` | admin | identical |
| 343 | `src/components/admin/admin-reviews-data-table.tsx` | admin | differs (53 lines) |
| 344 | `src/components/admin/admin-reviews-filters.tsx` | admin | identical |
| 345 | `src/components/admin/admin-reviews-stats.tsx` | admin | identical |
| 346 | `src/components/admin/admin-reviews-table-section.tsx` | admin | identical |
| 347 | `src/components/admin/admin-reviews-table-skeleton.tsx` | admin | identical |
| 348 | `src/components/admin/admin-search-input.tsx` | admin | identical |
| 349 | `src/components/admin/admin-service-table-header-sort.tsx` | admin | NO same-path file |
| 350 | `src/components/admin/admin-service-taxonomies-filters.tsx` | admin | identical |
| 351 | `src/components/admin/admin-service-taxonomies-table-section.tsx` | admin | differs (8 lines) |
| 352 | `src/components/admin/admin-service-taxonomies-table-skeleton.tsx` | admin | identical |
| 353 | `src/components/admin/admin-services-data-table.tsx` | admin | differs (22 lines) |
| 354 | `src/components/admin/admin-services-filters.tsx` | admin | identical |
| 355 | `src/components/admin/admin-services-stats.tsx` | admin | differs (12 lines) |
| 356 | `src/components/admin/admin-services-table-section.tsx` | admin | identical |
| 357 | `src/components/admin/admin-services-table-skeleton.tsx` | admin | identical |
| 358 | `src/components/admin/admin-skills-data-table.tsx` | admin | identical |
| 359 | `src/components/admin/admin-skills-filters.tsx` | admin | identical |
| 360 | `src/components/admin/admin-skills-table-section.tsx` | admin | identical |
| 361 | `src/components/admin/admin-skills-table-skeleton.tsx` | admin | identical |
| 362 | `src/components/admin/admin-stats-cards.tsx` | admin | differs (6 lines) |
| 363 | `src/components/admin/admin-stats-skeleton.tsx` | admin | NO same-path file |
| 364 | `src/components/admin/admin-subcategories-data-table.tsx` | admin | identical |
| 365 | `src/components/admin/admin-subcategories-filters.tsx` | admin | identical |
| 366 | `src/components/admin/admin-subcategories-table-section.tsx` | admin | identical |
| 367 | `src/components/admin/admin-subcategories-table-skeleton.tsx` | admin | identical |
| 368 | `src/components/admin/admin-subdivisions-data-table.tsx` | admin | identical |
| 369 | `src/components/admin/admin-subdivisions-filters.tsx` | admin | identical |
| 370 | `src/components/admin/admin-subdivisions-table-section.tsx` | admin | identical |
| 371 | `src/components/admin/admin-subdivisions-table-skeleton.tsx` | admin | identical |
| 372 | `src/components/admin/admin-table-pagination.tsx` | admin | identical |
| 373 | `src/components/admin/admin-tags-data-table.tsx` | admin | identical |
| 374 | `src/components/admin/admin-tags-filters.tsx` | admin | identical |
| 375 | `src/components/admin/admin-tags-table-section.tsx` | admin | identical |
| 376 | `src/components/admin/admin-tags-table-skeleton.tsx` | admin | identical |
| 377 | `src/components/admin/admin-taxonomy-submission-data-table.tsx` | admin | differs (21 lines) |
| 378 | `src/components/admin/admin-taxonomy-submission-filters.tsx` | admin | identical |
| 379 | `src/components/admin/admin-taxonomy-submission-stats.tsx` | admin | identical |
| 380 | `src/components/admin/admin-taxonomy-submission-table-section.tsx` | admin | differs (5 lines) |
| 381 | `src/components/admin/admin-taxonomy-submission-table-skeleton.tsx` | admin | identical |
| 382 | `src/components/admin/admin-users-data-table.tsx` | admin | differs (6 lines) |
| 383 | `src/components/admin/admin-users-filters.tsx` | admin | identical |
| 384 | `src/components/admin/admin-users-stats.tsx` | admin | differs (2 lines) |
| 385 | `src/components/admin/admin-users-table-section.tsx` | admin | identical |
| 386 | `src/components/admin/admin-users-table-skeleton.tsx` | admin | identical |
| 387 | `src/components/admin/admin-verification-actions.tsx` | admin | identical |
| 388 | `src/components/admin/admin-verifications-data-table.tsx` | admin | differs (42 lines) |
| 389 | `src/components/admin/admin-verifications-filters.tsx` | admin | identical |
| 390 | `src/components/admin/admin-verifications-stats.tsx` | admin | identical |
| 391 | `src/components/admin/admin-verifications-table-section.tsx` | admin | identical |
| 392 | `src/components/admin/admin-verifications-table-skeleton.tsx` | admin | identical |
| 393 | `src/components/admin/api-key-management.tsx` | admin | identical |
| 394 | `src/components/admin/app-sidebar-wrapper.tsx` | admin | NO same-path file |
| 395 | `src/components/admin/app-sidebar.tsx` | admin | differs (2 lines) |
| 396 | `src/components/admin/article-form.tsx` | admin | identical |
| 397 | `src/components/admin/chart-area-interactive.tsx` | admin | NO same-path file |
| 398 | `src/components/admin/code-block.tsx` | admin | NO same-path file |
| 399 | `src/components/admin/confirm-discard-dialog.tsx` | admin | NO same-path file |
| 400 | `src/components/admin/confirm-publish-dialog.tsx` | admin | NO same-path file |
| 401 | `src/components/admin/create-service-taxonomy-dialog.tsx` | admin | identical |
| 402 | `src/components/admin/data-table.tsx` | admin | NO same-path file |
| 403 | `src/components/admin/deployment/commit-form.tsx` | admin | NO same-path file |
| 404 | `src/components/admin/deployment/deployment-manager.tsx` | admin | NO same-path file |
| 405 | `src/components/admin/deployment/deployment-skeleton.tsx` | admin | NO same-path file |
| 406 | `src/components/admin/draft-indicator.tsx` | admin | NO same-path file |
| 407 | `src/components/admin/draft-publish-card.tsx` | admin | NO same-path file |
| 408 | `src/components/admin/filters/filter-components.tsx` | admin | identical |
| 409 | `src/components/admin/forms/admin-create-service-form.tsx` | admin | differs (35 lines) |
| 410 | `src/components/admin/forms/create-pro-taxonomy-form.tsx` | admin | differs (39 lines) |
| 411 | `src/components/admin/forms/create-service-taxonomy-form.tsx` | admin | differs (49 lines) |
| 412 | `src/components/admin/forms/create-skill-form.tsx` | admin | differs (24 lines) |
| 413 | `src/components/admin/forms/create-tag-form.tsx` | admin | differs (24 lines) |
| 414 | `src/components/admin/forms/delete-user-form.tsx` | admin | identical |
| 415 | `src/components/admin/forms/edit-pro-taxonomy-form.tsx` | admin | differs (39 lines) |
| 416 | `src/components/admin/forms/edit-profile-settings-form.tsx` | admin | identical |
| 417 | `src/components/admin/forms/edit-service-addons-form.tsx` | admin | identical |
| 418 | `src/components/admin/forms/edit-service-basic-form.test.tsx` | admin | NO same-path file |
| 419 | `src/components/admin/forms/edit-service-basic-form.tsx` | admin | identical |
| 420 | `src/components/admin/forms/edit-service-faq-form.tsx` | admin | identical |
| 421 | `src/components/admin/forms/edit-service-media-form.tsx` | admin | identical |
| 422 | `src/components/admin/forms/edit-service-pricing-form.tsx` | admin | identical |
| 423 | `src/components/admin/forms/edit-service-settings-form.tsx` | admin | identical |
| 424 | `src/components/admin/forms/edit-service-taxonomy-form.tsx` | admin | identical |
| 425 | `src/components/admin/forms/edit-skill-form.tsx` | admin | differs (24 lines) |
| 426 | `src/components/admin/forms/edit-tag-form.tsx` | admin | differs (24 lines) |
| 427 | `src/components/admin/forms/edit-taxonomy-item-form.tsx` | admin | differs (56 lines) |
| 428 | `src/components/admin/forms/edit-user-ban-form.tsx` | admin | identical |
| 429 | `src/components/admin/forms/edit-user-image-form.tsx` | admin | NO same-path file |
| 430 | `src/components/admin/forms/edit-user-status-form.tsx` | admin | identical |
| 431 | `src/components/admin/forms/field-grid.tsx` | admin | identical |
| 432 | `src/components/admin/forms/index.ts` | admin | identical |
| 433 | `src/components/admin/forms/profile-selector.tsx` | admin | identical |
| 434 | `src/components/admin/forms/revoke-sessions-form.tsx` | admin | identical |
| 435 | `src/components/admin/forms/role-select.tsx` | admin | identical |
| 436 | `src/components/admin/forms/slug-regenerate-button.tsx` | admin | identical |
| 437 | `src/components/admin/forms/taxonomy-form-fields.tsx` | admin | identical |
| 438 | `src/components/admin/forms/taxonomy-form-wrapper.tsx` | admin | identical |
| 439 | `src/components/admin/forms/use-slug-handlers.ts` | admin | identical |
| 440 | `src/components/admin/nav-documents.tsx` | admin | NO same-path file |
| 441 | `src/components/admin/nav-main.tsx` | admin | identical |
| 442 | `src/components/admin/nav-secondary.tsx` | admin | NO same-path file |
| 443 | `src/components/admin/nav-user.tsx` | admin | identical |
| 444 | `src/components/admin/pending-change-item.tsx` | admin | NO same-path file |
| 445 | `src/components/admin/pending-changes-list.tsx` | admin | NO same-path file |
| 446 | `src/components/admin/quick-create-dialog.tsx` | admin | identical |
| 447 | `src/components/admin/section-cards.tsx` | admin | NO same-path file |
| 448 | `src/components/admin/service-detail-view.tsx` | admin | NO same-path file |
| 449 | `src/components/admin/service-management.tsx` | admin | NO same-path file |
| 450 | `src/components/admin/site-header.tsx` | admin | identical |
| 451 | `src/components/admin/subscriptions/admin-subscriptions-data-table.tsx` | admin | differs (60 lines) |
| 452 | `src/components/admin/subscriptions/admin-subscriptions-filters.tsx` | admin | identical |
| 453 | `src/components/admin/subscriptions/admin-subscriptions-stats.tsx` | admin | identical |
| 454 | `src/components/admin/subscriptions/admin-subscriptions-table-section.tsx` | admin | identical |
| 455 | `src/components/admin/subscriptions/admin-subscriptions-table-skeleton.tsx` | admin | identical |
| 456 | `src/components/admin/subscriptions/copyable-id.tsx` | admin | identical |
| 457 | `src/components/admin/subscriptions/index.ts` | admin | NO same-path file |
| 458 | `src/components/admin/subscriptions/manual-subscription-form.tsx` | admin | differs (26 lines) |
| 459 | `src/components/admin/table-columns/column-renderers.tsx` | admin | identical |
| 460 | `src/components/admin/taxonomy-create-page.tsx` | admin | identical |
| 461 | `src/components/admin/taxonomy-edit-page.tsx` | admin | identical |
| 462 | `src/components/admin/taxonomy-list-page.tsx` | admin | identical |
| 463 | `src/components/admin/team/assign-role-dialog.tsx` | admin | identical |
| 464 | `src/components/admin/team/edit-role-dialog.tsx` | admin | identical |
| 465 | `src/components/admin/team/team-cards-client.tsx` | admin | differs (5 lines) |
| 466 | `src/components/admin/team/team-management-client.tsx` | admin | identical |
| 467 | `src/components/admin/user-auth-flow.tsx` | admin | NO same-path file |
| 468 | `src/components/admin/utils/table-section-utils.tsx` | admin | differs (7 lines) |
| 469 | `src/components/admin/utils/table-skeleton-utils.tsx` | admin | identical |
| 470 | `src/components/admin/verification-management.tsx` | admin | NO same-path file |
| 471 | `src/components/archives/archive-banner.tsx` | profiles-public-archives | identical |
| 472 | `src/components/archives/archive-filters.tsx` | profiles-public-archives | identical |
| 473 | `src/components/archives/archive-inputs.tsx` | profiles-public-archives | identical |
| 474 | `src/components/archives/archive-layout.tsx` | profiles-public-archives | identical |
| 475 | `src/components/archives/archive-pagination.tsx` | profiles-public-archives | identical |
| 476 | `src/components/archives/archive-profile-card.tsx` | profiles-public-archives | identical |
| 477 | `src/components/archives/archive-service-card.tsx` | profiles-public-archives | identical |
| 478 | `src/components/archives/archive-sidebar-filters.tsx` | profiles-public-archives | differs (49 lines) |
| 479 | `src/components/archives/archive-sidebar.tsx` | profiles-public-archives | differs (41 lines) |
| 480 | `src/components/archives/categories-grid.tsx` | profiles-public-archives | differs (22 lines) |
| 481 | `src/components/archives/coverage-display.tsx` | profiles-public-archives | identical |
| 482 | `src/components/archives/index.ts` | profiles-public-archives | identical |
| 483 | `src/components/archives/infinite-scroll.tsx` | profiles-public-archives | identical |
| 484 | `src/components/archives/subdivisions-carousel.tsx` | profiles-public-archives | differs (8 lines) |
| 485 | `src/components/blog/article-card.tsx` | blog-support-media-crons | differs (2 lines) |
| 486 | `src/components/blog/article-content.tsx` | blog-support-media-crons | identical |
| 487 | `src/components/blog/article-header.tsx` | blog-support-media-crons | identical |
| 488 | `src/components/blog/article-toc.tsx` | blog-support-media-crons | identical |
| 489 | `src/components/blog/author-box.tsx` | blog-support-media-crons | identical |
| 490 | `src/components/blog/blog-pagination.tsx` | blog-support-media-crons | identical |
| 491 | `src/components/blog/blog-section-header.tsx` | blog-support-media-crons | identical |
| 492 | `src/components/blog/category-badge.tsx` | blog-support-media-crons | identical |
| 493 | `src/components/blog/compact-article-row.tsx` | blog-support-media-crons | identical |
| 494 | `src/components/blog/featured-article-hero.tsx` | blog-support-media-crons | identical |
| 495 | `src/components/blog/horizontal-article-card.tsx` | blog-support-media-crons | identical |
| 496 | `src/components/blog/index.ts` | blog-support-media-crons | identical |
| 497 | `src/components/dashboard/button-messages.tsx` | messaging | identical |
| 498 | `src/components/dashboard/dashboard-breadcrumb.tsx` | sweep | identical |
| 499 | `src/components/dashboard/dashboard-content.tsx` | sweep | differs (18 lines) |
| 500 | `src/components/dashboard/dashboard-layout.tsx` | sweep | identical |
| 501 | `src/components/dashboard/dashboard-nav-main.tsx` | sweep | identical |
| 502 | `src/components/dashboard/dashboard-nav-secondary.tsx` | sweep | identical |
| 503 | `src/components/dashboard/dashboard-nav-services.tsx` | sweep | differs (4 lines) |
| 504 | `src/components/dashboard/dashboard-nav-user.tsx` | sweep | identical |
| 505 | `src/components/dashboard/dashboard-sidebar.tsx` | sweep | differs (6 lines) |
| 506 | `src/components/dashboard/index.ts` | sweep | identical |
| 507 | `src/components/dashboard/menu-saved.tsx` | reviews-saved | identical |
| 508 | `src/components/dashboard/no-service-dialog.tsx` | sweep | identical |
| 509 | `src/components/dashboard/reviews/dashboard-review-card-skeleton.tsx` | reviews-saved | identical |
| 510 | `src/components/dashboard/reviews/dashboard-review-card.tsx` | reviews-saved | differs (4 lines) |
| 511 | `src/components/dashboard/reviews/given-recommendations-section.tsx` | reviews-saved | identical |
| 512 | `src/components/dashboard/reviews/given-review-card.tsx` | reviews-saved | identical |
| 513 | `src/components/dashboard/reviews/given-reviews-async.tsx` | reviews-saved | identical |
| 514 | `src/components/dashboard/reviews/given-reviews-section.tsx` | reviews-saved | identical |
| 515 | `src/components/dashboard/reviews/given-reviews-summary-card.tsx` | reviews-saved | identical |
| 516 | `src/components/dashboard/reviews/index.ts` | reviews-saved | identical |
| 517 | `src/components/dashboard/reviews/received-reviews-async.tsx` | reviews-saved | differs (7 lines) |
| 518 | `src/components/dashboard/reviews/received-reviews-section.tsx` | reviews-saved | identical |
| 519 | `src/components/dashboard/reviews/recommendations-section.tsx` | reviews-saved | identical |
| 520 | `src/components/dashboard/reviews/reviews-container.tsx` | reviews-saved | identical |
| 521 | `src/components/dashboard/reviews/reviews-empty-state.tsx` | reviews-saved | identical |
| 522 | `src/components/dashboard/reviews/reviews-pagination.tsx` | reviews-saved | identical |
| 523 | `src/components/dashboard/reviews/reviews-section-skeleton.tsx` | reviews-saved | identical |
| 524 | `src/components/dashboard/reviews/reviews-summary-card.tsx` | reviews-saved | identical |
| 525 | `src/components/dashboard/reviews/share-review-link-async.tsx` | reviews-saved | differs (7 lines) |
| 526 | `src/components/dashboard/reviews/share-review-link.tsx` | reviews-saved | identical |
| 527 | `src/components/dashboard/saved/saved-pagination.tsx` | reviews-saved | identical |
| 528 | `src/components/dashboard/services/create-service-button.tsx` | services | identical |
| 529 | `src/components/dashboard/services/featured-star-button.tsx` | services | differs (15 lines) |
| 530 | `src/components/dashboard/services/service-limit-sheet.tsx` | services | identical |
| 531 | `src/components/dashboard/services/service-pagination.tsx` | services | identical |
| 532 | `src/components/dashboard/services/service-refresh-button.tsx` | services | identical |
| 533 | `src/components/dashboard/services/service-status-badge.tsx` | services | differs (2 lines) |
| 534 | `src/components/dashboard/services/service-table-filters.tsx` | services | differs (31 lines) |
| 535 | `src/components/dashboard/services/service-table-header-sort.tsx` | services | identical |
| 536 | `src/components/dashboard/services/service-table.tsx` | services | differs (2 lines) |
| 537 | `src/components/dashboard/support-feedback-dialog.tsx` | blog-support-media-crons | differs (25 lines) |
| 538 | `src/components/dynamic/dynamic-bottom-to-top.tsx` | sweep | identical |
| 539 | `src/components/dynamic/index.ts` | sweep | differs (17 lines) |
| 540 | `src/components/forms/auth/auth-type-options.tsx` | auth-accounts | identical |
| 541 | `src/components/forms/auth/button-login-goolge.tsx` | auth-accounts | identical |
| 542 | `src/components/forms/auth/button-register-pro.tsx` | auth-accounts | identical |
| 543 | `src/components/forms/auth/form-auth-login.tsx` | auth-accounts | identical |
| 544 | `src/components/forms/auth/form-auth-register.tsx` | auth-accounts | differs (20 lines) |
| 545 | `src/components/forms/auth/form-forgot-password.tsx` | auth-accounts | differs (7 lines) |
| 546 | `src/components/forms/auth/form-oauth-setup.tsx` | auth-accounts | differs (38 lines) |
| 547 | `src/components/forms/auth/form-resend-verification.tsx` | auth-accounts | identical |
| 548 | `src/components/forms/auth/form-reset-password.tsx` | auth-accounts | identical |
| 549 | `src/components/forms/auth/heading-form-register.tsx` | auth-accounts | identical |
| 550 | `src/components/forms/auth/index.ts` | auth-accounts | identical |
| 551 | `src/components/forms/auth/register-auth-state-sync.tsx` | auth-accounts | identical |
| 552 | `src/components/forms/form-contact.tsx` | messaging | identical |
| 553 | `src/components/forms/index.ts` | sweep | identical |
| 554 | `src/components/forms/profile/account-page-actions.tsx` | profiles-dashboard | identical |
| 555 | `src/components/forms/profile/documents-interface.tsx` | profiles-dashboard | identical |
| 556 | `src/components/forms/profile/form-account.tsx` | profiles-dashboard | differs (42 lines) |
| 557 | `src/components/forms/profile/form-additional-info.tsx` | profiles-dashboard | differs (9 lines) |
| 558 | `src/components/forms/profile/form-basic-info.tsx` | profiles-dashboard | differs (15 lines) |
| 559 | `src/components/forms/profile/form-billing.tsx` | profiles-dashboard | differs (4 lines) |
| 560 | `src/components/forms/profile/form-change-password.tsx` | profiles-dashboard | identical |
| 561 | `src/components/forms/profile/form-change-username.tsx` | profiles-dashboard | identical |
| 562 | `src/components/forms/profile/form-coverage.tsx` | profiles-dashboard | differs (36 lines) |
| 563 | `src/components/forms/profile/form-delete-account.tsx` | profiles-dashboard | differs (9 lines) |
| 564 | `src/components/forms/profile/form-onboarding.tsx` | profiles-dashboard | differs (95 lines) |
| 565 | `src/components/forms/profile/form-portfolio.tsx` | profiles-dashboard | differs (2 lines) |
| 566 | `src/components/forms/profile/form-presentation-info.tsx` | profiles-dashboard | differs (15 lines) |
| 567 | `src/components/forms/profile/form-upgrade-to-pro.tsx` | profiles-dashboard | identical |
| 568 | `src/components/forms/profile/form-verification.tsx` | profiles-dashboard | differs (2 lines) |
| 569 | `src/components/forms/profile/index.ts` | profiles-dashboard | identical |
| 570 | `src/components/forms/profile/onboarding-form-skeleton.tsx` | profiles-dashboard | identical |
| 571 | `src/components/forms/profile/profile-sidebar.tsx` | profiles-dashboard | identical |
| 572 | `src/components/forms/profile/verification-status.tsx` | profiles-dashboard | identical |
| 573 | `src/components/forms/service/form-service-create.tsx` | services | differs (2 lines) |
| 574 | `src/components/forms/service/form-service-delete.tsx` | services | identical |
| 575 | `src/components/forms/service/form-service-edit-media.tsx` | services | differs (16 lines) |
| 576 | `src/components/forms/service/form-service-edit.tsx` | services | differs (18 lines) |
| 577 | `src/components/forms/service/index.ts` | services | identical |
| 578 | `src/components/forms/service/service-success.tsx` | services | NO same-path file |
| 579 | `src/components/forms/service/steps/addons-faq-step.tsx` | services | identical |
| 580 | `src/components/forms/service/steps/create-service-steps-help.tsx` | services | identical |
| 581 | `src/components/forms/service/steps/index.ts` | services | identical |
| 582 | `src/components/forms/service/steps/media-step.tsx` | services | identical |
| 583 | `src/components/forms/service/steps/oneoff-subscription-step.tsx` | services | identical |
| 584 | `src/components/forms/service/steps/onsite-onbase-step.tsx` | services | identical |
| 585 | `src/components/forms/service/steps/presence-online-step.tsx` | services | identical |
| 586 | `src/components/forms/service/steps/service-details-step.tsx` | services | identical |
| 587 | `src/components/guards/admin-guard.tsx` | admin | identical |
| 588 | `src/components/guards/index.ts` | sweep | identical |
| 589 | `src/components/guards/oauth-setup-guard.tsx` | auth-accounts | differs (2 lines) |
| 590 | `src/components/guards/onboarding-guard.tsx` | auth-accounts | identical |
| 591 | `src/components/home/category-tabs.tsx` | home-search-taxonomy | identical |
| 592 | `src/components/home/home-categories.tsx` | home-search-taxonomy | differs (6 lines) |
| 593 | `src/components/home/home-features.tsx` | home-search-taxonomy | identical |
| 594 | `src/components/home/home-hero.tsx` | home-search-taxonomy | identical |
| 595 | `src/components/home/home-profiles.tsx` | home-search-taxonomy | identical |
| 596 | `src/components/home/home-search.tsx` | home-search-taxonomy | identical |
| 597 | `src/components/home/home-services.tsx` | home-search-taxonomy | identical |
| 598 | `src/components/home/home-taxonomies-tabs.tsx` | home-search-taxonomy | identical |
| 599 | `src/components/home/home-taxonomies.tsx` | home-search-taxonomy | identical |
| 600 | `src/components/home/home-testimonials.tsx` | home-search-taxonomy | identical |
| 601 | `src/components/home/index.ts` | home-search-taxonomy | NO same-path file |
| 602 | `src/components/home/profiles-home-lazy.tsx` | home-search-taxonomy | identical |
| 603 | `src/components/home/profiles-home-skeleton.tsx` | home-search-taxonomy | identical |
| 604 | `src/components/home/profiles-home-wrapper.tsx` | home-search-taxonomy | identical |
| 605 | `src/components/home/services-carousel-wrapper.tsx` | home-search-taxonomy | identical |
| 606 | `src/components/home/services-carousel.tsx` | home-search-taxonomy | identical |
| 607 | `src/components/home/services-home-lazy.tsx` | home-search-taxonomy | identical |
| 608 | `src/components/home/services-home-skeleton.tsx` | home-search-taxonomy | identical |
| 609 | `src/components/home/services-home-wrapper.tsx` | home-search-taxonomy | identical |
| 610 | `src/components/icon/brands/Icon.tsx` | sweep | identical |
| 611 | `src/components/icon/brands/icons-data.ts` | sweep | identical |
| 612 | `src/components/icon/brands/index.ts` | sweep | identical |
| 613 | `src/components/icon/brands/types.ts` | sweep | identical |
| 614 | `src/components/icon/fa/icon-angle-left.jsx` | sweep | identical |
| 615 | `src/components/icon/fa/icon-angle-right.jsx` | sweep | identical |
| 616 | `src/components/icon/fa/icon-angle-up.jsx` | sweep | identical |
| 617 | `src/components/icon/fa/icon-arrow-down-long.jsx` | sweep | identical |
| 618 | `src/components/icon/fa/icon-arrow-left-long.jsx` | sweep | identical |
| 619 | `src/components/icon/fa/icon-arrow-right-long.jsx` | sweep | identical |
| 620 | `src/components/icon/fa/icon-bars.jsx` | sweep | identical |
| 621 | `src/components/icon/fa/icon-behance.jsx` | sweep | identical |
| 622 | `src/components/icon/fa/icon-check-circle.jsx` | sweep | identical |
| 623 | `src/components/icon/fa/icon-check.jsx` | sweep | identical |
| 624 | `src/components/icon/fa/icon-clock.jsx` | sweep | identical |
| 625 | `src/components/icon/fa/icon-dribbble.jsx` | sweep | identical |
| 626 | `src/components/icon/fa/icon-envelope.jsx` | sweep | identical |
| 627 | `src/components/icon/fa/icon-exclamation-circle.jsx` | sweep | identical |
| 628 | `src/components/icon/fa/icon-exclamation-triangle.jsx` | sweep | identical |
| 629 | `src/components/icon/fa/icon-eye-slash.jsx` | sweep | identical |
| 630 | `src/components/icon/fa/icon-eye.jsx` | sweep | identical |
| 631 | `src/components/icon/fa/icon-facebook-f.jsx` | sweep | identical |
| 632 | `src/components/icon/fa/icon-flag.jsx` | sweep | identical |
| 633 | `src/components/icon/fa/icon-floppy-disk.jsx` | sweep | identical |
| 634 | `src/components/icon/fa/icon-github.jsx` | sweep | identical |
| 635 | `src/components/icon/fa/icon-globe.jsx` | sweep | identical |
| 636 | `src/components/icon/fa/icon-google.jsx` | sweep | identical |
| 637 | `src/components/icon/fa/icon-heart.jsx` | sweep | identical |
| 638 | `src/components/icon/fa/icon-info-circle.jsx` | sweep | identical |
| 639 | `src/components/icon/fa/icon-instagram.jsx` | sweep | identical |
| 640 | `src/components/icon/fa/icon-key.jsx` | sweep | identical |
| 641 | `src/components/icon/fa/icon-link.jsx` | sweep | identical |
| 642 | `src/components/icon/fa/icon-linkedin-in.jsx` | sweep | identical |
| 643 | `src/components/icon/fa/icon-magnifying-glass.jsx` | sweep | identical |
| 644 | `src/components/icon/fa/icon-minus.jsx` | sweep | identical |
| 645 | `src/components/icon/fa/icon-music.jsx` | sweep | identical |
| 646 | `src/components/icon/fa/icon-paper-plane.jsx` | sweep | identical |
| 647 | `src/components/icon/fa/icon-phone.jsx` | sweep | identical |
| 648 | `src/components/icon/fa/icon-play.jsx` | sweep | identical |
| 649 | `src/components/icon/fa/icon-quote-left.jsx` | sweep | identical |
| 650 | `src/components/icon/fa/icon-star.jsx` | sweep | identical |
| 651 | `src/components/icon/fa/icon-thumbs-down.jsx` | sweep | identical |
| 652 | `src/components/icon/fa/icon-thumbs-up.jsx` | sweep | identical |
| 653 | `src/components/icon/fa/icon-times-circle.jsx` | sweep | identical |
| 654 | `src/components/icon/fa/icon-times.jsx` | sweep | identical |
| 655 | `src/components/icon/fa/icon-trash-can.jsx` | sweep | identical |
| 656 | `src/components/icon/fa/icon-trash.jsx` | sweep | identical |
| 657 | `src/components/icon/fa/icon-twitter.jsx` | sweep | identical |
| 658 | `src/components/icon/fa/icon-users.jsx` | sweep | identical |
| 659 | `src/components/icon/fa/icon-viber.jsx` | sweep | identical |
| 660 | `src/components/icon/fa/icon-video.jsx` | sweep | identical |
| 661 | `src/components/icon/fa/icon-whatsapp.jsx` | sweep | identical |
| 662 | `src/components/icon/fa/icon-x.jsx` | sweep | identical |
| 663 | `src/components/icon/fa/icon-xmark.jsx` | sweep | identical |
| 664 | `src/components/icon/fa/icon-youtube.jsx` | sweep | identical |
| 665 | `src/components/icon/fa/index.js` | sweep | identical |
| 666 | `src/components/icon/fa/optimized-components.js` | sweep | identical |
| 667 | `src/components/icon/fa/optimized-icons.js` | sweep | identical |
| 668 | `src/components/icon/flaticon/flaticon` | sweep | identical |
| 669 | `src/components/icon/flaticon/flaticon-category.tsx` | sweep | identical |
| 670 | `src/components/icon/flaticon/flaticon-content.tsx` | sweep | identical |
| 671 | `src/components/icon/flaticon/flaticon-customer-service.tsx` | sweep | identical |
| 672 | `src/components/icon/flaticon/flaticon-cv.tsx` | sweep | identical |
| 673 | `src/components/icon/flaticon/flaticon-developer.tsx` | sweep | identical |
| 674 | `src/components/icon/flaticon/flaticon-digital-marketing.tsx` | sweep | identical |
| 675 | `src/components/icon/flaticon/flaticon-like.tsx` | sweep | identical |
| 676 | `src/components/icon/flaticon/flaticon-menu.tsx` | sweep | identical |
| 677 | `src/components/icon/flaticon/flaticon-place.tsx` | sweep | identical |
| 678 | `src/components/icon/flaticon/flaticon-refresh.tsx` | sweep | identical |
| 679 | `src/components/icon/flaticon/flaticon-ruler.tsx` | sweep | identical |
| 680 | `src/components/icon/flaticon/flaticon-secure.tsx` | sweep | identical |
| 681 | `src/components/icon/flaticon/flaticon-star.tsx` | sweep | identical |
| 682 | `src/components/icon/flaticon/flaticon-web-design.tsx` | sweep | identical |
| 683 | `src/components/icon/flaticon/flaticon_freelancer969a.txt` | sweep | NO same-path file |
| 684 | `src/components/icon/flaticon/index.ts` | sweep | identical |
| 685 | `src/components/icon/icon-mobile-menu.tsx` | sweep | identical |
| 686 | `src/components/icon/icon-pulsating-dot.tsx` | sweep | identical |
| 687 | `src/components/icon/index.ts` | sweep | identical |
| 688 | `src/components/icon/socials.tsx` | sweep | identical |
| 689 | `src/components/icon/x-custom.tsx` | sweep | NO same-path file |
| 690 | `src/components/index.ts` | sweep | identical |
| 691 | `src/components/link.ts` | sweep | NO same-path file |
| 692 | `src/components/media/cloudinary-media-picker.tsx` | blog-support-media-crons | identical |
| 693 | `src/components/media/index.ts` | blog-support-media-crons | identical |
| 694 | `src/components/media/upload/cloudinary-next.txt` | blog-support-media-crons | NO same-path file |
| 695 | `src/components/media/upload/cloudinary-upload-widget.tsx` | blog-support-media-crons | identical |
| 696 | `src/components/media/upload/gallery-upload.tsx` | blog-support-media-crons | identical |
| 697 | `src/components/media/upload/index.ts` | blog-support-media-crons | identical |
| 698 | `src/components/media/upload/media-upload-simple.tsx` | blog-support-media-crons | NO same-path file |
| 699 | `src/components/media/upload/media-upload.tsx` | blog-support-media-crons | identical |
| 700 | `src/components/media/upload/profile-image-upload.tsx` | blog-support-media-crons | identical |
| 701 | `src/components/media/upload/resource-preview.tsx` | blog-support-media-crons | identical |
| 702 | `src/components/messages/chat-header.tsx` | messaging | identical |
| 703 | `src/components/messages/chat-header.tsx.backup` | messaging | NO same-path file |
| 704 | `src/components/messages/chat-list-container.tsx` | messaging | differs (4 lines) |
| 705 | `src/components/messages/chat-list-item.tsx` | messaging | differs (22 lines) |
| 706 | `src/components/messages/chat-list.tsx` | messaging | identical |
| 707 | `src/components/messages/chat-list.tsx.backup` | messaging | NO same-path file |
| 708 | `src/components/messages/chat-messages.tsx` | messaging | differs (13 lines) |
| 709 | `src/components/messages/chat-messages.tsx.backup` | messaging | NO same-path file |
| 710 | `src/components/messages/chat-sidebar.tsx` | messaging | differs (7 lines) |
| 711 | `src/components/messages/header-actions.tsx` | messaging | NO same-path file |
| 712 | `src/components/messages/header-presence.tsx` | messaging | identical |
| 713 | `src/components/messages/message-actions.tsx` | messaging | identical |
| 714 | `src/components/messages/message-edit.tsx` | messaging | NO same-path file |
| 715 | `src/components/messages/message-input.tsx` | messaging | identical |
| 716 | `src/components/messages/message-reactions.tsx` | messaging | NO same-path file |
| 717 | `src/components/messages/message-reply-preview.tsx` | messaging | identical |
| 718 | `src/components/messages/message-reply-quote.tsx` | messaging | identical |
| 719 | `src/components/messages/messages-container-with-sidebar.tsx` | messaging | identical |
| 720 | `src/components/messages/messages-container.tsx` | messaging | differs (27 lines) |
| 721 | `src/components/messages/mobile-chat-list-button.tsx` | messaging | identical |
| 722 | `src/components/messages/mobile-chat-sidebar.tsx` | messaging | identical |
| 723 | `src/components/messages/reaction-picker.tsx` | messaging | identical |
| 724 | `src/components/messages/start-chat-dialog.tsx` | messaging | identical |
| 725 | `src/components/profile/contact-reveal.tsx` | profiles-public-archives | differs (13 lines) |
| 726 | `src/components/profile/index.ts` | profiles-public-archives | differs (2 lines) |
| 727 | `src/components/profile/menu-user-link.tsx` | profiles-public-archives | identical |
| 728 | `src/components/profile/menu-user.tsx` | profiles-public-archives | differs (11 lines) |
| 729 | `src/components/profile/profile-bio.tsx` | profiles-public-archives | identical |
| 730 | `src/components/profile/profile-breadcrumb.tsx` | profiles-public-archives | identical |
| 731 | `src/components/profile/profile-features.tsx` | profiles-public-archives | identical |
| 732 | `src/components/profile/profile-info.tsx` | profiles-public-archives | identical |
| 733 | `src/components/profile/profile-meta.tsx` | profiles-public-archives | identical |
| 734 | `src/components/profile/profile-metrics.tsx` | profiles-public-archives | identical |
| 735 | `src/components/profile/profile-portfolio.tsx` | profiles-public-archives | differs (2 lines) |
| 736 | `src/components/profile/profile-rating.tsx` | profiles-public-archives | NO same-path file |
| 737 | `src/components/profile/profile-services.tsx` | profiles-public-archives | identical |
| 738 | `src/components/profile/profile-skills.tsx` | profiles-public-archives | identical |
| 739 | `src/components/profile/profile-subdivisions-wrapper.tsx` | profiles-public-archives | identical |
| 740 | `src/components/profile/profile-terms.tsx` | profiles-public-archives | identical |
| 741 | `src/components/profile/report-profile-dialog.tsx` | profiles-public-archives | identical |
| 742 | `src/components/profile/skeletons/index.ts` | profiles-public-archives | identical |
| 743 | `src/components/profile/skeletons/profile-bio-skeleton.tsx` | profiles-public-archives | identical |
| 744 | `src/components/profile/skeletons/profile-features-skeleton.tsx` | profiles-public-archives | identical |
| 745 | `src/components/profile/skeletons/profile-info-skeleton.tsx` | profiles-public-archives | identical |
| 746 | `src/components/profile/skeletons/profile-meta-skeleton.tsx` | profiles-public-archives | identical |
| 747 | `src/components/profile/skeletons/profile-metrics-skeleton.tsx` | profiles-public-archives | identical |
| 748 | `src/components/profile/skeletons/profile-portfolio-skeleton.tsx` | profiles-public-archives | identical |
| 749 | `src/components/profile/skeletons/profile-services-skeleton.tsx` | profiles-public-archives | identical |
| 750 | `src/components/profile/skeletons/profile-skills-skeleton.tsx` | profiles-public-archives | identical |
| 751 | `src/components/profile/skeletons/profile-terms-skeleton.tsx` | profiles-public-archives | identical |
| 752 | `src/components/profile/user-image.tsx` | profiles-public-archives | NO same-path file |
| 753 | `src/components/providers/auth-provider.tsx` | sweep | NO same-path file |
| 754 | `src/components/providers/dashboard-provider.tsx` | sweep | NO same-path file |
| 755 | `src/components/providers/index.ts` | sweep | NO same-path file |
| 756 | `src/components/review/index.ts` | reviews-saved | identical |
| 757 | `src/components/review/rating-stars.tsx` | reviews-saved | identical |
| 758 | `src/components/review/review-card.tsx` | reviews-saved | identical |
| 759 | `src/components/review/review-form.tsx` | reviews-saved | identical |
| 760 | `src/components/review/review-stars.tsx` | reviews-saved | identical |
| 761 | `src/components/review/review-stats-enhanced.tsx` | reviews-saved | identical |
| 762 | `src/components/review/review-stats.tsx` | reviews-saved | NO same-path file |
| 763 | `src/components/review/review-success.tsx` | reviews-saved | identical |
| 764 | `src/components/review/reviews-container.tsx` | reviews-saved | identical |
| 765 | `src/components/review/simple-rating-display.tsx` | reviews-saved | identical |
| 766 | `src/components/service/index.ts` | services | identical |
| 767 | `src/components/service/report-service-dialog.tsx` | services | identical |
| 768 | `src/components/service/service-about.tsx` | services | identical |
| 769 | `src/components/service/service-additional.tsx` | services | identical |
| 770 | `src/components/service/service-addons.tsx` | services | differs (4 lines) |
| 771 | `src/components/service/service-buy.tsx` | services | identical |
| 772 | `src/components/service/service-calculated-price.tsx` | services | identical |
| 773 | `src/components/service/service-contact.tsx` | services | identical |
| 774 | `src/components/service/service-faq.tsx` | services | differs (2 lines) |
| 775 | `src/components/service/service-info.tsx` | services | differs (6 lines) |
| 776 | `src/components/service/service-media.tsx` | services | differs (2 lines) |
| 777 | `src/components/service/service-meta.tsx` | services | identical |
| 778 | `src/components/service/service-order-fixed.tsx` | services | differs (2 lines) |
| 779 | `src/components/service/service-related.tsx` | services | identical |
| 780 | `src/components/service/skeletons/index.ts` | services | identical |
| 781 | `src/components/service/skeletons/service-about-skeleton.tsx` | services | identical |
| 782 | `src/components/service/skeletons/service-contact-skeleton.tsx` | services | identical |
| 783 | `src/components/service/skeletons/service-faq-skeleton.tsx` | services | identical |
| 784 | `src/components/service/skeletons/service-info-skeleton.tsx` | services | identical |
| 785 | `src/components/service/skeletons/service-media-skeleton.tsx` | services | identical |
| 786 | `src/components/service/skeletons/service-meta-skeleton.tsx` | services | identical |
| 787 | `src/components/service/skeletons/service-order-skeleton.tsx` | services | identical |
| 788 | `src/components/service/skeletons/service-related-skeleton.tsx` | services | identical |
| 789 | `src/components/services/service-delete-dialog.tsx` | services | identical |
| 790 | `src/components/shared/404.tsx` | sweep | NO same-path file |
| 791 | `src/components/shared/addon-fields.tsx` | sweep | identical |
| 792 | `src/components/shared/audio-gallery.tsx` | sweep | differs (2 lines) |
| 793 | `src/components/shared/auth-required-dialog.tsx` | sweep | identical |
| 794 | `src/components/shared/breadcrumb-buttons.tsx` | sweep | identical |
| 795 | `src/components/shared/button-form.tsx` | sweep | identical |
| 796 | `src/components/shared/button-scroll-to-top.tsx` | sweep | identical |
| 797 | `src/components/shared/category-icon.tsx` | sweep | identical |
| 798 | `src/components/shared/content-hero.tsx` | sweep | identical |
| 799 | `src/components/shared/coverage-display.tsx` | sweep | identical |
| 800 | `src/components/shared/cta-banner.tsx` | sweep | identical |
| 801 | `src/components/shared/dynamic-breadcrumb-skeleton.tsx` | sweep | identical |
| 802 | `src/components/shared/dynamic-breadcrumb.tsx` | sweep | differs (2 lines) |
| 803 | `src/components/shared/error-page.tsx` | sweep | identical |
| 804 | `src/components/shared/faq-fields.tsx` | sweep | identical |
| 805 | `src/components/shared/faq-section.tsx` | sweep | identical |
| 806 | `src/components/shared/features-grid.tsx` | sweep | identical |
| 807 | `src/components/shared/features-row.tsx` | sweep | identical |
| 808 | `src/components/shared/hash-scroll.tsx` | sweep | identical |
| 809 | `src/components/shared/hero-banner.tsx` | sweep | identical |
| 810 | `src/components/shared/icon-box.tsx` | sweep | identical |
| 811 | `src/components/shared/icon-wrapper.tsx` | sweep | identical |
| 812 | `src/components/shared/layout/footer/footer-global.tsx` | sweep | differs (11 lines) |
| 813 | `src/components/shared/layout/footer/footer-wrapper.tsx` | sweep | identical |
| 814 | `src/components/shared/layout/footer/index.ts` | sweep | identical |
| 815 | `src/components/shared/layout/header/header-fixed.tsx` | sweep | identical |
| 816 | `src/components/shared/layout/header/header-logo.tsx` | sweep | identical |
| 817 | `src/components/shared/layout/header/header-relative.tsx` | sweep | identical |
| 818 | `src/components/shared/layout/header/header-search.tsx` | home-search-taxonomy | identical |
| 819 | `src/components/shared/layout/header/header.tsx` | sweep | identical |
| 820 | `src/components/shared/layout/header/index.ts` | sweep | identical |
| 821 | `src/components/shared/layout/header/navigation-menu.tsx` | home-search-taxonomy | identical |
| 822 | `src/components/shared/layout/index.ts` | sweep | identical |
| 823 | `src/components/shared/layout/wrapper/body-wrapper.tsx` | sweep | identical |
| 824 | `src/components/shared/layout/wrapper/index.ts` | sweep | identical |
| 825 | `src/components/shared/layout/wrapper/notifications-wrapper.tsx` | sweep | identical |
| 826 | `src/components/shared/layout/wrapper/path-checker-wrapper.tsx` | sweep | identical |
| 827 | `src/components/shared/link.tsx` | sweep | NO same-path file |
| 828 | `src/components/shared/media-carousel.tsx` | sweep | identical |
| 829 | `src/components/shared/media-gallery.tsx` | sweep | differs (2 lines) |
| 830 | `src/components/shared/media-type-indicators.tsx` | sweep | identical |
| 831 | `src/components/shared/navigation-button.tsx` | sweep | identical |
| 832 | `src/components/shared/navigation-skeleton-overlay.tsx` | sweep | identical |
| 833 | `src/components/shared/next-link.tsx` | sweep | differs (4 lines) |
| 834 | `src/components/shared/not-found-page.tsx` | sweep | identical |
| 835 | `src/components/shared/process-steps.tsx` | sweep | identical |
| 836 | `src/components/shared/profile-badges.tsx` | profiles-public-archives | identical |
| 837 | `src/components/shared/profile-card.tsx` | profiles-public-archives | NO same-path file |
| 838 | `src/components/shared/rating-display.tsx` | sweep | identical |
| 839 | `src/components/shared/save-button.tsx` | reviews-saved | identical |
| 840 | `src/components/shared/service-card.tsx` | services | differs (28 lines) |
| 841 | `src/components/shared/service-media-card.tsx` | services | differs (8 lines) |
| 842 | `src/components/shared/social-links.tsx` | sweep | differs (2 lines) |
| 843 | `src/components/shared/statistics-counter.tsx` | sweep | identical |
| 844 | `src/components/shared/stats-grid.tsx` | sweep | identical |
| 845 | `src/components/shared/tabbed-cta.tsx` | sweep | identical |
| 846 | `src/components/shared/table-media.tsx` | sweep | identical |
| 847 | `src/components/shared/taxonomies-display.tsx` | sweep | identical |
| 848 | `src/components/shared/taxonomy-selector.tsx` | sweep | NO same-path file |
| 849 | `src/components/shared/taxonomy-tabs.tsx` | sweep | identical |
| 850 | `src/components/shared/testimonials-section.tsx` | sweep | identical |
| 851 | `src/components/shared/user-avatar.tsx` | sweep | differs (44 lines) |
| 852 | `src/components/shared/user-badges.tsx` | sweep | identical |
| 853 | `src/components/shared/verified-badge.tsx` | sweep | NO same-path file |
| 854 | `src/components/subscription/history-pagination.tsx` | billing-payments | identical |
| 855 | `src/components/subscription/index.ts` | billing-payments | identical |
| 856 | `src/components/subscription/payment-attempts-list.tsx` | billing-payments | differs (43 lines) |
| 857 | `src/components/subscription/plan-comparison.tsx` | billing-payments | identical |
| 858 | `src/components/subscription/pricing-selection.tsx` | billing-payments | differs (2 lines) |
| 859 | `src/components/subscription/subscription-sheet.tsx` | billing-payments | differs (97 lines) |
| 860 | `src/components/ui/accordion.tsx` | sweep | identical |
| 861 | `src/components/ui/alert-dialog.tsx` | sweep | identical |
| 862 | `src/components/ui/alert.tsx` | sweep | identical |
| 863 | `src/components/ui/aspect-ratio.tsx` | sweep | NO same-path file |
| 864 | `src/components/ui/avatar.tsx` | sweep | identical |
| 865 | `src/components/ui/badge.tsx` | sweep | identical |
| 866 | `src/components/ui/breadcrumb.tsx` | sweep | identical |
| 867 | `src/components/ui/button.tsx` | sweep | identical |
| 868 | `src/components/ui/calendar.tsx` | sweep | identical |
| 869 | `src/components/ui/card.tsx` | sweep | identical |
| 870 | `src/components/ui/carousel-pagination.tsx` | sweep | identical |
| 871 | `src/components/ui/carousel.tsx` | sweep | identical |
| 872 | `src/components/ui/chart.tsx` | sweep | NO same-path file |
| 873 | `src/components/ui/checkbox.tsx` | sweep | identical |
| 874 | `src/components/ui/collapsible.tsx` | sweep | identical |
| 875 | `src/components/ui/combobox.tsx` | sweep | identical |
| 876 | `src/components/ui/command.tsx` | sweep | identical |
| 877 | `src/components/ui/context-menu.tsx` | sweep | NO same-path file |
| 878 | `src/components/ui/currency.tsx` | sweep | identical |
| 879 | `src/components/ui/date-picker.tsx` | sweep | identical |
| 880 | `src/components/ui/dialog.tsx` | sweep | identical |
| 881 | `src/components/ui/drawer.tsx` | sweep | identical |
| 882 | `src/components/ui/dropdown-menu.tsx` | sweep | identical |
| 883 | `src/components/ui/emoji-picker.tsx` | sweep | identical |
| 884 | `src/components/ui/form.tsx` | sweep | identical |
| 885 | `src/components/ui/hover-card.tsx` | sweep | NO same-path file |
| 886 | `src/components/ui/input-otp.tsx` | sweep | NO same-path file |
| 887 | `src/components/ui/input-with-suffix.tsx` | sweep | identical |
| 888 | `src/components/ui/input.tsx` | sweep | identical |
| 889 | `src/components/ui/label.tsx` | sweep | identical |
| 890 | `src/components/ui/lazy-combobox.tsx` | sweep | identical |
| 891 | `src/components/ui/loading-spinner.tsx` | sweep | NO same-path file |
| 892 | `src/components/ui/media-display.tsx` | sweep | NO same-path file |
| 893 | `src/components/ui/menubar.tsx` | sweep | NO same-path file |
| 894 | `src/components/ui/multi-select.tsx` | sweep | identical |
| 895 | `src/components/ui/navigation-menu.tsx` | sweep | identical |
| 896 | `src/components/ui/pagination.tsx` | sweep | identical |
| 897 | `src/components/ui/popover.tsx` | sweep | identical |
| 898 | `src/components/ui/progress.tsx` | sweep | NO same-path file |
| 899 | `src/components/ui/pulsating-dot.tsx` | sweep | identical |
| 900 | `src/components/ui/radio-group.tsx` | sweep | identical |
| 901 | `src/components/ui/resizable.tsx` | sweep | NO same-path file |
| 902 | `src/components/ui/rich-text-editor.tsx` | sweep | identical |
| 903 | `src/components/ui/scroll-area.tsx` | sweep | identical |
| 904 | `src/components/ui/search-dropdown.tsx` | sweep | identical |
| 905 | `src/components/ui/section-header.tsx` | sweep | identical |
| 906 | `src/components/ui/select.tsx` | sweep | identical |
| 907 | `src/components/ui/selectbox.tsx` | sweep | identical |
| 908 | `src/components/ui/separator.tsx` | sweep | identical |
| 909 | `src/components/ui/server-search-combobox.tsx` | sweep | identical |
| 910 | `src/components/ui/sheet.tsx` | sweep | differs (22 lines) |
| 911 | `src/components/ui/sidebar.tsx` | sweep | identical |
| 912 | `src/components/ui/skeleton.tsx` | sweep | identical |
| 913 | `src/components/ui/slider.tsx` | sweep | NO same-path file |
| 914 | `src/components/ui/sonner.tsx` | sweep | identical |
| 915 | `src/components/ui/switch.tsx` | sweep | identical |
| 916 | `src/components/ui/table.tsx` | sweep | identical |
| 917 | `src/components/ui/tabs.tsx` | sweep | identical |
| 918 | `src/components/ui/textarea.tsx` | sweep | identical |
| 919 | `src/components/ui/toggle-group.tsx` | sweep | NO same-path file |
| 920 | `src/components/ui/toggle.tsx` | sweep | identical |
| 921 | `src/components/ui/tooltip.tsx` | sweep | identical |
| 922 | `src/components/ui/year-picker.tsx` | sweep | NO same-path file |
| 923 | `src/components/ui/year-select.tsx` | sweep | identical |
| 924 | `src/constants/datasets/about.ts` | sweep | identical |
| 925 | `src/constants/datasets/blog-categories.ts` | sweep | differs (15 lines) |
| 926 | `src/constants/datasets/budgets.ts` | sweep | NO same-path file |
| 927 | `src/constants/datasets/category-icons.ts` | home-search-taxonomy | identical |
| 928 | `src/constants/datasets/collections.ts` | sweep | NO same-path file |
| 929 | `src/constants/datasets/company-sizes.ts` | sweep | NO same-path file |
| 930 | `src/constants/datasets/contact.ts` | sweep | identical |
| 931 | `src/constants/datasets/counter-stats.ts` | sweep | identical |
| 932 | `src/constants/datasets/dashboard.ts` | sweep | differs (276 lines) |
| 933 | `src/constants/datasets/data.ts` | sweep | identical |
| 934 | `src/constants/datasets/faq.ts` | sweep | identical |
| 935 | `src/constants/datasets/footer.ts` | sweep | differs (34 lines) |
| 936 | `src/constants/datasets/for-pros.ts` | sweep | identical |
| 937 | `src/constants/datasets/locations.ts` | home-search-taxonomy | identical |
| 938 | `src/constants/datasets/options.ts` | sweep | identical |
| 939 | `src/constants/datasets/pro-taxonomies.ts` | home-search-taxonomy | identical |
| 940 | `src/constants/datasets/service-taxonomies.ts` | home-search-taxonomy | identical |
| 941 | `src/constants/datasets/skills.ts` | home-search-taxonomy | identical |
| 942 | `src/constants/datasets/subscription-types.ts` | sweep | NO same-path file |
| 943 | `src/constants/datasets/tabs.ts` | sweep | NO same-path file |
| 944 | `src/constants/datasets/tags.ts` | home-search-taxonomy | identical |
| 945 | `src/constants/email/email-config.ts` | sweep | NO same-path file |
| 946 | `src/constants/email/templates/contact.ts` | sweep | NO same-path file |
| 947 | `src/constants/email/templates/index.ts` | sweep | NO same-path file |
| 948 | `src/constants/email/templates/new-profile.ts` | sweep | NO same-path file |
| 949 | `src/constants/email/templates/new-review.ts` | sweep | NO same-path file |
| 950 | `src/constants/email/templates/new-verification.ts` | sweep | NO same-path file |
| 951 | `src/constants/email/templates/password-reset.ts` | sweep | NO same-path file |
| 952 | `src/constants/email/templates/profile-report.ts` | sweep | NO same-path file |
| 953 | `src/constants/email/templates/review-approved.ts` | sweep | NO same-path file |
| 954 | `src/constants/email/templates/service-created.ts` | sweep | NO same-path file |
| 955 | `src/constants/email/templates/service-published.ts` | sweep | NO same-path file |
| 956 | `src/constants/email/templates/service-report.ts` | sweep | NO same-path file |
| 957 | `src/constants/email/templates/subscription-payment.ts` | sweep | NO same-path file |
| 958 | `src/constants/email/templates/support-feedback.ts` | sweep | NO same-path file |
| 959 | `src/constants/email/templates/unread-messages.ts` | sweep | NO same-path file |
| 960 | `src/constants/email/templates/verification.ts` | sweep | NO same-path file |
| 961 | `src/constants/email/templates/welcome.ts` | sweep | NO same-path file |
| 962 | `src/instrumentation.ts` | sweep | NO same-path file |
| 963 | `src/lib/auth/client.ts` | auth-accounts | differs (282 lines) |
| 964 | `src/lib/auth/config.ts` | auth-accounts | NO same-path file |
| 965 | `src/lib/auth/index.ts` | auth-accounts | differs (10 lines) |
| 966 | `src/lib/auth/permissions.ts` | auth-accounts | NO same-path file |
| 967 | `src/lib/auth/roles.ts` | auth-accounts | identical |
| 968 | `src/lib/cache/__tests__/caching.test.ts` | sweep | NO same-path file |
| 969 | `src/lib/cache/config.ts` | sweep | NO same-path file |
| 970 | `src/lib/cache/index.ts` | sweep | identical |
| 971 | `src/lib/cache/keys.ts` | sweep | NO same-path file |
| 972 | `src/lib/cache/revalidation.ts` | sweep | differs (338 lines) |
| 973 | `src/lib/config/index.ts` | sweep | NO same-path file |
| 974 | `src/lib/database/selects/chat.ts` | messaging | NO same-path file |
| 975 | `src/lib/database/selects/index.ts` | sweep | NO same-path file |
| 976 | `src/lib/database/selects/profile.ts` | profiles-public-archives | NO same-path file |
| 977 | `src/lib/database/selects/saved.ts` | reviews-saved | NO same-path file |
| 978 | `src/lib/database/selects/service.ts` | services | NO same-path file |
| 979 | `src/lib/email/auth-integration.ts` | sweep | NO same-path file |
| 980 | `src/lib/email/constants.ts` | sweep | NO same-path file |
| 981 | `src/lib/email/index.ts` | sweep | NO same-path file |
| 982 | `src/lib/email/providers/brevo/client.ts` | sweep | NO same-path file |
| 983 | `src/lib/email/providers/brevo/index.ts` | sweep | NO same-path file |
| 984 | `src/lib/email/providers/brevo/list-management.ts` | sweep | NO same-path file |
| 985 | `src/lib/email/providers/brevo/types.ts` | sweep | NO same-path file |
| 986 | `src/lib/email/providers/brevo/workflows.ts` | sweep | NO same-path file |
| 987 | `src/lib/email/services/admin-emails.ts` | sweep | NO same-path file |
| 988 | `src/lib/email/services/contact-emails.ts` | sweep | NO same-path file |
| 989 | `src/lib/email/services/index.ts` | sweep | NO same-path file |
| 990 | `src/lib/email/services/message-emails.ts` | sweep | NO same-path file |
| 991 | `src/lib/email/services/review-emails.ts` | sweep | NO same-path file |
| 992 | `src/lib/email/services/service-emails.ts` | sweep | NO same-path file |
| 993 | `src/lib/email/workflow-config.ts` | sweep | NO same-path file |
| 994 | `src/lib/errors.ts` | sweep | differs (275 lines) |
| 995 | `src/lib/fonts.ts` | sweep | identical |
| 996 | `src/lib/github/client.ts` | blog-support-media-crons | NO same-path file |
| 997 | `src/lib/hooks/admin/use-admin-filters.ts` | admin | identical |
| 998 | `src/lib/hooks/archives/use-archive-filters.ts` | profiles-public-archives | identical |
| 999 | `src/lib/hooks/archives/use-archive-pagination.ts` | profiles-public-archives | identical |
| 1000 | `src/lib/hooks/archives/use-debounced-value.ts` | profiles-public-archives | identical |
| 1001 | `src/lib/hooks/chat/use-chat-list-subscription.ts` | messaging | differs (61 lines) |
| 1002 | `src/lib/hooks/chat/use-chat-subscription.ts` | messaging | differs (276 lines) |
| 1003 | `src/lib/hooks/chat/use-infinite-scroll.ts` | messaging | NO same-path file |
| 1004 | `src/lib/hooks/chat/use-message-optimistic.ts` | messaging | differs (101 lines) |
| 1005 | `src/lib/hooks/chat/use-presence.ts` | messaging | differs (127 lines) |
| 1006 | `src/lib/hooks/index.ts` | sweep | identical |
| 1007 | `src/lib/hooks/ui/index.ts` | sweep | identical |
| 1008 | `src/lib/hooks/ui/use-mobile.tsx` | sweep | identical |
| 1009 | `src/lib/hooks/ui/use-toast.ts` | sweep | identical |
| 1010 | `src/lib/hooks/use-hash-scroll.ts` | sweep | identical |
| 1011 | `src/lib/hooks/use-resettable-action-state.ts` | sweep | identical |
| 1012 | `src/lib/hooks/use-subscription-gate.ts` | billing-payments | identical |
| 1013 | `src/lib/hooks/use-unread-count.ts` | messaging | identical |
| 1014 | `src/lib/payment/coupons.ts` | billing-payments | differs (2 lines) |
| 1015 | `src/lib/payment/factory.ts` | billing-payments | NO same-path file |
| 1016 | `src/lib/payment/index.ts` | billing-payments | NO same-path file |
| 1017 | `src/lib/payment/pricing.ts` | billing-payments | identical |
| 1018 | `src/lib/payment/providers/worldline/adapter.ts` | billing-payments | NO same-path file |
| 1019 | `src/lib/payment/providers/worldline/digest.ts` | billing-payments | NO same-path file |
| 1020 | `src/lib/payment/providers/worldline/index.ts` | billing-payments | NO same-path file |
| 1021 | `src/lib/payment/providers/worldline/types.ts` | billing-payments | NO same-path file |
| 1022 | `src/lib/payment/providers/worldline/xml.ts` | billing-payments | NO same-path file |
| 1023 | `src/lib/payment/record-attempt.ts` | billing-payments | NO same-path file |
| 1024 | `src/lib/payment/service.ts` | billing-payments | NO same-path file |
| 1025 | `src/lib/payment/test-mode.ts` | billing-payments | differs (8 lines) |
| 1026 | `src/lib/payment/types.ts` | billing-payments | NO same-path file |
| 1027 | `src/lib/payment/worldline-config.ts` | billing-payments | NO same-path file |
| 1028 | `src/lib/prisma/client.ts` | sweep | NO same-path file |
| 1029 | `src/lib/prisma/json-types.ts` | sweep | differs (17 lines) |
| 1030 | `src/lib/prisma/schema/admin.prisma` | sweep | NO same-path file |
| 1031 | `src/lib/prisma/schema/auth.prisma` | sweep | NO same-path file |
| 1032 | `src/lib/prisma/schema/blog.prisma` | sweep | NO same-path file |
| 1033 | `src/lib/prisma/schema/chat.prisma` | sweep | NO same-path file |
| 1034 | `src/lib/prisma/schema/email.prisma` | sweep | NO same-path file |
| 1035 | `src/lib/prisma/schema/media.prisma` | sweep | NO same-path file |
| 1036 | `src/lib/prisma/schema/migrations/20250710191328_add_better_auth_models/migration.sql` | sweep | NO same-path file |
| 1037 | `src/lib/prisma/schema/migrations/20250710212357_better_auth_1/migration.sql` | sweep | NO same-path file |
| 1038 | `src/lib/prisma/schema/migrations/migration_lock.toml` | sweep | NO same-path file |
| 1039 | `src/lib/prisma/schema/review.prisma` | sweep | NO same-path file |
| 1040 | `src/lib/prisma/schema/saved.prisma` | sweep | NO same-path file |
| 1041 | `src/lib/prisma/schema/schema.prisma` | sweep | NO same-path file |
| 1042 | `src/lib/prisma/schema/service.prisma` | sweep | NO same-path file |
| 1043 | `src/lib/prisma/schema/subscription.prisma` | sweep | NO same-path file |
| 1044 | `src/lib/prisma/schema/taxonomy-submission.prisma` | sweep | NO same-path file |
| 1045 | `src/lib/prisma/schema/user.prisma` | sweep | NO same-path file |
| 1046 | `src/lib/providers/saved-state-provider.tsx` | reviews-saved | identical |
| 1047 | `src/lib/rate-limit/memory.ts` | auth-accounts | NO same-path file |
| 1048 | `src/lib/seo/fetch-entity.ts` | sweep | differs (326 lines) |
| 1049 | `src/lib/seo/format-template.ts` | sweep | identical |
| 1050 | `src/lib/seo/get-entity-values.ts` | sweep | identical |
| 1051 | `src/lib/seo/meta.ts` | sweep | identical |
| 1052 | `src/lib/seo/metadata.ts` | sweep | identical |
| 1053 | `src/lib/seo/pages.ts` | sweep | differs (43 lines) |
| 1054 | `src/lib/seo/schema/article-schema.tsx` | sweep | differs (2 lines) |
| 1055 | `src/lib/seo/schema/categories-schema.tsx` | sweep | differs (2 lines) |
| 1056 | `src/lib/seo/schema/directory-schema.tsx` | sweep | differs (2 lines) |
| 1057 | `src/lib/seo/schema/home-schema.tsx` | sweep | identical |
| 1058 | `src/lib/seo/schema/index.ts` | sweep | identical |
| 1059 | `src/lib/seo/schema/json-ld.tsx` | sweep | identical |
| 1060 | `src/lib/seo/schema/profile-schema.tsx` | sweep | differs (2 lines) |
| 1061 | `src/lib/seo/schema/profiles-schema.tsx` | sweep | differs (2 lines) |
| 1062 | `src/lib/seo/schema/service-schema.tsx` | sweep | differs (2 lines) |
| 1063 | `src/lib/seo/schema/services-schema.tsx` | sweep | differs (2 lines) |
| 1064 | `src/lib/stores/authStore.ts` | auth-accounts | differs (70 lines) |
| 1065 | `src/lib/stores/use-home-featured-services-store.ts` | home-search-taxonomy | identical |
| 1066 | `src/lib/stores/use-navigation-skeleton-store.ts` | sweep | identical |
| 1067 | `src/lib/stores/use-service-order-store.ts` | services | differs (2 lines) |
| 1068 | `src/lib/stores/use-subscription-sheet-store.ts` | billing-payments | identical |
| 1069 | `src/lib/subscription/feature-gate.ts` | billing-payments | differs (99 lines) |
| 1070 | `src/lib/subscription/index.ts` | billing-payments | NO same-path file |
| 1071 | `src/lib/supabase/client-jwt.ts` | messaging | NO same-path file |
| 1072 | `src/lib/supabase/client-rls.ts` | messaging | NO same-path file |
| 1073 | `src/lib/supabase/client.ts` | messaging | NO same-path file |
| 1074 | `src/lib/supabase/realtime.ts` | messaging | NO same-path file |
| 1075 | `src/lib/supabase/server-rls.ts` | messaging | NO same-path file |
| 1076 | `src/lib/taxonomies/index.ts` | home-search-taxonomy | differs (92 lines) |
| 1077 | `src/lib/taxonomies/maps.generated.json` | home-search-taxonomy | differs (995 lines) |
| 1078 | `src/lib/taxonomies/maps.generated.json.gz` | home-search-taxonomy | identical |
| 1079 | `src/lib/taxonomy-drafts.ts` | admin | NO same-path file |
| 1080 | `src/lib/taxonomy-tree-preview.ts` | admin | NO same-path file |
| 1081 | `src/lib/types/api.ts` | sweep | identical |
| 1082 | `src/lib/types/auth.ts` | auth-accounts | differs (64 lines) |
| 1083 | `src/lib/types/blog.ts` | blog-support-media-crons | differs (120 lines) |
| 1084 | `src/lib/types/cloudinary.ts` | blog-support-media-crons | differs (8 lines) |
| 1085 | `src/lib/types/common.ts` | sweep | differs (2 lines) |
| 1086 | `src/lib/types/components.ts` | sweep | differs (147 lines) |
| 1087 | `src/lib/types/datasets.ts` | sweep | identical |
| 1088 | `src/lib/types/email.ts` | sweep | NO same-path file |
| 1089 | `src/lib/types/github.ts` | blog-support-media-crons | NO same-path file |
| 1090 | `src/lib/types/index.ts` | sweep | differs (1 lines) |
| 1091 | `src/lib/types/messages.ts` | messaging | differs (95 lines) |
| 1092 | `src/lib/types/reviews.ts` | reviews-saved | differs (4 lines) |
| 1093 | `src/lib/types/saved.ts` | reviews-saved | identical |
| 1094 | `src/lib/types/search.ts` | home-search-taxonomy | identical |
| 1095 | `src/lib/types/server-actions.ts` | sweep | identical |
| 1096 | `src/lib/types/services.ts` | services | differs (69 lines) |
| 1097 | `src/lib/types/taxonomy-operations.ts` | admin | identical |
| 1098 | `src/lib/utils.ts` | sweep | identical |
| 1099 | `src/lib/utils/api.ts` | sweep | identical |
| 1100 | `src/lib/utils/auth-error-handler.ts` | auth-accounts | identical |
| 1101 | `src/lib/utils/better-auth-error.ts` | auth-accounts | NO same-path file |
| 1102 | `src/lib/utils/blog.ts` | blog-support-media-crons | identical |
| 1103 | `src/lib/utils/cloudinary.ts` | blog-support-media-crons | differs (1 lines) |
| 1104 | `src/lib/utils/cn.ts` | sweep | identical |
| 1105 | `src/lib/utils/cooldown.ts` | sweep | identical |
| 1106 | `src/lib/utils/datasets.ts` | sweep | differs (98 lines) |
| 1107 | `src/lib/utils/date.ts` | sweep | differs (12 lines) |
| 1108 | `src/lib/utils/form.ts` | sweep | differs (14 lines) |
| 1109 | `src/lib/utils/format-rating.ts` | reviews-saved | NO same-path file |
| 1110 | `src/lib/utils/format.ts` | sweep | identical |
| 1111 | `src/lib/utils/formatting/date.ts` | sweep | identical |
| 1112 | `src/lib/utils/formatting/index.ts` | sweep | identical |
| 1113 | `src/lib/utils/formatting/rich-text.tsx` | sweep | identical |
| 1114 | `src/lib/utils/formatting/text.tsx` | sweep | identical |
| 1115 | `src/lib/utils/formatting/time.ts` | sweep | identical |
| 1116 | `src/lib/utils/index.ts` | sweep | differs (2 lines) |
| 1117 | `src/lib/utils/media.ts` | sweep | differs (51 lines) |
| 1118 | `src/lib/utils/messages.ts` | messaging | differs (47 lines) |
| 1119 | `src/lib/utils/misc/errors.js` | sweep | NO same-path file |
| 1120 | `src/lib/utils/misc/experience.ts` | sweep | identical |
| 1121 | `src/lib/utils/misc/index.ts` | sweep | differs (5 lines) |
| 1122 | `src/lib/utils/misc/shuffle.ts` | sweep | NO same-path file |
| 1123 | `src/lib/utils/navigation/active.js` | sweep | NO same-path file |
| 1124 | `src/lib/utils/navigation/index.ts` | sweep | NO same-path file |
| 1125 | `src/lib/utils/navigation/paths.js` | sweep | NO same-path file |
| 1126 | `src/lib/utils/navigation/sitemap.js` | sweep | NO same-path file |
| 1127 | `src/lib/utils/rating.ts` | reviews-saved | identical |
| 1128 | `src/lib/utils/search/build-search-conditions.ts` | home-search-taxonomy | NO same-path file |
| 1129 | `src/lib/utils/search/build-search-filter.ts` | home-search-taxonomy | NO same-path file |
| 1130 | `src/lib/utils/search/index.ts` | home-search-taxonomy | NO same-path file |
| 1131 | `src/lib/utils/service.ts` | services | differs (2 lines) |
| 1132 | `src/lib/utils/taxonomy-routes.ts` | sweep | NO same-path file |
| 1133 | `src/lib/utils/taxonomy-submission.ts` | home-search-taxonomy | NO same-path file |
| 1134 | `src/lib/utils/text/greek-latin.ts` | sweep | identical |
| 1135 | `src/lib/utils/text/html.ts` | sweep | identical |
| 1136 | `src/lib/utils/text/index.ts` | sweep | NO same-path file |
| 1137 | `src/lib/utils/text/normalize.ts` | sweep | identical |
| 1138 | `src/lib/utils/text/sanitize.ts` | sweep | identical |
| 1139 | `src/lib/utils/text/slug.ts` | sweep | identical |
| 1140 | `src/lib/utils/text/truncate.ts` | sweep | NO same-path file |
| 1141 | `src/lib/utils/validation/formats.ts` | sweep | identical |
| 1142 | `src/lib/utils/validation/index.ts` | sweep | identical |
| 1143 | `src/lib/utils/zod.ts` | sweep | identical |
| 1144 | `src/lib/validations/admin.ts` | admin | differs (2 lines) |
| 1145 | `src/lib/validations/auth.ts` | auth-accounts | identical |
| 1146 | `src/lib/validations/blog.ts` | blog-support-media-crons | identical |
| 1147 | `src/lib/validations/chat.ts` | messaging | NO same-path file |
| 1148 | `src/lib/validations/contact.ts` | messaging | identical |
| 1149 | `src/lib/validations/index.ts` | sweep | differs (3 lines) |
| 1150 | `src/lib/validations/media.ts` | blog-support-media-crons | NO same-path file |
| 1151 | `src/lib/validations/profile.ts` | profiles-dashboard | differs (6 lines) |
| 1152 | `src/lib/validations/review.ts` | reviews-saved | NO same-path file |
| 1153 | `src/lib/validations/service.ts` | services | differs (14 lines) |
| 1154 | `src/lib/validations/shared.ts` | sweep | identical |
| 1155 | `src/lib/validations/subscription.ts` | billing-payments | NO same-path file |
| 1156 | `src/lib/validations/support.ts` | blog-support-media-crons | identical |
| 1157 | `src/lib/validations/taxonomy-drafts.ts` | admin | NO same-path file |
| 1158 | `src/lib/validations/taxonomy-submission.ts` | home-search-taxonomy | NO same-path file |
| 1159 | `src/lib/validations/user.ts` | auth-accounts | identical |
| 1160 | `src/middleware.ts` | sweep | differs (6 lines) |
| 1161 | `src/middlewares/index.ts` | sweep | differs (1 lines) |
| 1162 | `src/middlewares/stackHandler.ts` | sweep | identical |
| 1163 | `src/middlewares/withAdminAuth.ts` | auth-accounts | NO same-path file |
| 1164 | `src/middlewares/withHeaders.ts` | sweep | identical |
| 1165 | `src/middlewares/withLowercaseRedirect.ts` | sweep | identical |
| 1166 | `src/middlewares/withSimpleAuth.ts` | auth-accounts | differs (95 lines) |
| 1167 | `src/styles/critical.css` | sweep | identical |
| 1168 | `src/styles/globals.css` | sweep | identical |
| 1169 | `src/types/global.d.ts` | sweep | differs (18 lines) |
| 1170 | `tailwind.config.js` | sweep | identical |
| 1171 | `tsconfig.json` | sweep | differs (2 lines) |
| 1172 | `vercel.json` | sweep | identical |

## 2. Mapping (old → new)

| OLD | NEW frontend | NEW backend |
|---|---|---|
| `instrumentation.ts` (TZ=Europe/Athens for all server code) | **none** | `TIME_ZONE=Europe/Athens` (Django only) |
| `lib/errors.ts` EN→GR translation map (`AppError.translate`) | `lib/errors.ts` (map kept, Strapi/GraphQL/Prisma parts dropped) — but Django errors bypass it | `common/exceptions.py json_exception_handler`, `LANGUAGE_CODE="en-us"` |
| Prisma direct DB calls (no HTTP client) | `lib/api/client.ts` (`apiRequest`, 401→refresh→retry→anonymous retry, `ApiError`) | DRF + SimpleJWT, `common/authentication.py` |
| `lib/rate-limit/memory.ts` (only forgot-password, per email) | — | `common/throttling.py` + `DEFAULT_THROTTLE_RATES` (global anon/user + 9 scopes, per IP) |
| `lib/email/**` + `constants/email/**` (16 HTML+text templates, Brevo transactional API, From/Reply-To per email) | — | `apps/messaging/emails.py` (13 builders, generic `_layout`), `apps/messaging/tasks.py` (Celery) |
| `lib/email/providers/brevo/list-management.ts` + `workflows.ts handleUserStateChange` | — | `apps/messaging/brevo.py`, tasks `brevo_state_change / brevo_first_service / brevo_delete_contact` |
| `app/layout.tsx` GTM loader (always, after interaction/5s; CookieFirst inside GTM) | `app/layout.tsx` + `components/consent/*` + `lib/analytics/consent.ts` (own banner, GTM only after opt-in) | — |
| `sitemap.xml`, `sitemap_index.xml`, `sitemap_static.xml` routes | identical routes (static adds 2 paths) | also served at API host by `apps/core/views/public/sitemaps.py` (different lists) |
| `s/`, `profile/`, `articles/` `sitemap.ts` (Prisma) | same files, fetch `GET /api/seo/sitemap-entries?kind=…` | `SitemapEntriesView` (same filters as Prisma) |
| `dir/`, `categories/`, `ipiresies/` `sitemap.ts` | byte-identical (taxonomy datasets) | — |
| `robots.txt` | byte-identical | — |
| `lib/seo/*` (meta/metadata/templates) | identical; `fetch-entity.ts` + `pages.ts` now call Django; schema base URL env chain changed | `GET /api/services/{id}/page`, `GET /api/profiles/{username}`, blog article |
| `lib/utils/text/{slug,greek-latin,normalize}.ts` | identical | `common/utils/{slug,greek_latin,normalize}.py` (verified equivalent) |
| `middleware.ts` (lowercase → simple auth → headers) | + `withTokenRefresh` (auth domain) ; matcher identical | — |
| `vercel.json` crons (UTC) | `vercel.json` identical but unused on Dokploy | `CELERY_BEAT_SCHEDULE` (Europe/Athens) |
| `constants/datasets/blog-categories.ts` | 5 slugs renamed | `apps/blog/constants.py` (old slugs) |
| `lib/utils/datasets.ts` breadcrumbs `baseHref` | option removed | profiles breadcrumbs built in `profile_aggregations.py:456-466` |
| `scripts/*` one-off Strapi migrations/backfills | `scripts/build-taxonomy-maps.ts` (now pulls from Django first), `benchmark-performance.ts` | management commands `backfill_payment_columns, backfill_taxonomy_fks, canonicalize_taxonomies, parity_taxonomy_fks, seed_*` |

## 3. DIFFERENCES

### D1. Server timezone no longer forced to Europe/Athens — every server-rendered date/time is UTC — HIGH
- OLD: `src/instrumentation.ts:24-34` sets `process.env.TZ = 'Europe/Athens'` at module load and in `register()` for the Node runtime, so all SSR `date-fns format`, `toLocaleDateString('el-GR')`, `new Date().getDate()` etc. ran in Athens time (the app's own comment: "every server-side date display/day-boundary calculation should run in Europe/Athens").
- NEW: no `instrumentation.ts`; `frontend/Dockerfile` (node:22-bookworm-slim) sets no `TZ`; nothing in `frontend/src` sets it (grep: 0 hits for `Europe/Athens`/`process.env.TZ`). Only Django has `TIME_ZONE=Europe/Athens`. Server components that format dates in process-local TZ: `components/review/review-card.tsx:13` (`formatDate(review.createdAt,'dd/MM/yy')`), `components/blog/{article-header,article-card,featured-article-hero,horizontal-article-card,compact-article-row}.tsx` (`toLocaleDateString('el-GR')` without `timeZone`), `components/subscription/payment-attempts-list.tsx:131-175` (`formatDate`/`formatTime` — times shown 2–3 h early ALWAYS), `components/dashboard/services/service-table.tsx`, admin detail pages `admin/{subscriptions,users,profiles,verifications,reviews}/[id]/page.tsx`. Also `lib/utils/date.ts` `isToday/isYesterday` and any SSR day-boundary math.
- Impact: payment-attempt times, admin detail timestamps are off by 2 h (winter) / 3 h (summer); dates of reviews/articles/services created between 00:00 and 02:00/03:00 Athens show the previous day; client components re-render in browser TZ → possible hydration text mismatches.
- Fix hint: restore `src/instrumentation.ts` (it is platform-agnostic) or set `ENV TZ=Europe/Athens` in `frontend/Dockerfile` runtime stage + Dokploy env.
- Possibly intentional?: no.

### D2. Blog category slugs renamed on the frontend but NOT in Django validation — admin cannot save articles in 5 categories — HIGH
- OLD: `constants/datasets/blog-categories.ts:20-27` slugs `dimiourgia-periechomenou`, `eyexia-frontida`, `marketingk`, `technika`, `ypostirixi` (used for validation in `actions/blog/manage-articles.ts:27-29,105-107` and for labels).
- NEW: `frontend/src/constants/datasets/blog-categories.ts:20-32` renamed them to `dimiourgia-periexomenou`, `eveksia-frontida`, `marketing`, `texnika`, `ypostiriksi` (comment claims a SQL migration rewrote `blog_articles.categorySlug`). Backend `apps/blog/constants.py:11-25` still lists the OLD slugs and `apps/blog/services/articles.py:259-261, 311-312` rejects anything else with `ApiError("Invalid category: …")`.
- Impact: in the admin article form (options come from the frontend list) choosing any of these 5 categories → create/update fails with English "Invalid category: marketing". Conversely, if the DB still holds the old slugs, `resolveCategoryLabel`/`getBlogCategoryBySlug` on `/articles` and `/articles/[slug]` can't resolve them → missing category badge/label and related-articles lookup by category breaks. Either way the two sides disagree.
- Possibly intentional?: the rename is intentional (comment), the backend not following it is a bug. Verify DB values (§5).

### D3. Backend error texts reach users in English (no translation layer any more) — MEDIUM
- OLD: actions produced Greek messages themselves and `lib/errors.ts:7-149` translated common English errors to Greek (`'Too many requests' → 'Πάρα πολλές προσπάθειες…'`, `'Record not found' → 'Η εγγραφή δεν βρέθηκε'`, `'Network error' → 'Σφάλμα δικτύου'`, …).
- NEW: ~79 action files return `err instanceof ApiError ? err.message : 'Σφάλμα δικτύου'` verbatim (e.g. `actions/auth/change-password.ts:20`, `actions/saved/toggle-save.ts:15`, `actions/admin/users.ts:25-190`). Django runs `LANGUAGE_CODE = "en-us"` (`config/settings/base.py:54`) and `common/exceptions.py` emits English: `"One or more fields are invalid."` (every ValidationError, :129-135 / FieldErrors :76-81), `"Too many requests. Please try again later."` (:53-57), DRF `"Authentication credentials were not provided."`, `"You do not have permission to perform this action."`, `"Not found."`, `"Request was throttled. Expected available in N seconds."`; plus ~80 hard-coded English `ApiError` texts in apps (`"Service not found"` ×6, `"Message not found"` ×5, `"Chat not found"`, `"Article not found"`, `"Slug already used"`, `"Review not found"`, `"No subscription found"`, `"Not a member of this chat"`, `"Invalid category: …"`, …; only 43/122 literal messages are Greek). DRF field-level `details` (`"This field is required."`, `"Ensure this field has no more than N characters."`) are passed as `fieldErrors` and rendered under inputs. `lib/api/client.ts:408` also turns any non-JSON error (502/504 from proxy) into `"HTTP 502"`, and `withActionResult` (`client.ts:493-497`, currently unused) defaults to English `'Network error'`.
- Impact: Greek UI shows English error strings for validation, auth expiry, not-found, throttling and proxy errors.
- Fix hint: `LANGUAGE_CODE="el"` gives Greek DRF built-ins for free; translate the envelope messages in `common/exceptions.py`; map `HTTP nnn`/unknown to `'Σφάλμα δικτύου'`. Domain agents may list individual occurrences.
- Possibly intentional?: no.

### D4. Transactional emails: From display name and Reply-To lost — MEDIUM
- OLD: `constants/email/email-config.ts:80-246` sets per-email `from` (`'Doulitsa <noreply@doulitsa.gr>'` for user mails, `'Admin Doulitsa <noreply@doulitsa.gr>'` for admin mails) and `replyTo`: CONTACT_ADMIN → the visitor's email (:105), CONTACT_CONFIRMATION → `contact@doulitsa.gr` (:115), SERVICE_REPORT/PROFILE_REPORT → reporter's email (:139,149), SUPPORT_FEEDBACK → reporter (:172). `lib/email/providers/brevo/workflows.ts:44-63` honours both.
- NEW: `apps/messaging/emails.py:84-104 send_email` builds `EmailMultiAlternatives(subject, body, to)` with no `from_email` (→ `DEFAULT_FROM_EMAIL = env BREVO_SENDER_EMAIL`, a bare address unless the env var itself contains a name) and **no `reply_to`** for any email.
- Impact: admin pressing "Reply" on a contact-form / report / support-feedback notification replies to noreply instead of the user; users replying to the contact confirmation don't reach contact@; inbox sender name changes.
- Possibly intentional?: no.

### D5. Transactional email subjects / bodies / links differ from the old templates — MEDIUM
All 16 old templates (`constants/email/templates/*.ts`, branded 602px table layout, black footer "® Doulitsa, 2026", plain-text twins) were replaced by a generic `_layout()` (`emails.py:62-71`). Subject differences (OLD `email-config.ts` → NEW `emails.py`):
| Email | OLD subject | NEW subject |
|---|---|---|
| Verification | `Επαληθεύστε το email σας - Doulitsa` | `Επαλήθευση του email σου — Doulitsa` (:119) |
| Password reset | `Επαναφορά κωδικού πρόσβασης - Doulitsa` | `Επαναφορά κωδικού — Doulitsa` (:134) |
| Welcome | `Καλώς ήρθες στο Doulitsa, {displayName\|username\|'φίλε'}!` | `Καλώς ήρθες στη Doulitsa` (:146) |
| Contact → admin | `Νέα Φόρμα Επικοινωνίας - {email}` | `[Doulitsa] Επικοινωνία: {subject}` (:157) |
| Contact → user | `Λάβαμε το μήνυμα σου!` | `Λάβαμε το μήνυμά σου — Doulitsa` (:167) |
| New verification → admin | `Νέο Αίτημα Πιστοποίησης - {displayName} ({userEmail})` | `[Doulitsa] Νέο αίτημα επαλήθευσης` (:177) |
| New profile → admin | `Νέο Επαγγελματικό Προφίλ - {profileName} ({userEmail})` | `Νέο προφίλ - {name} - από {email}` (:283) |
| Unread messages | `Έχεις 1 αδιάβαστο μήνυμα - Doulitsa` / `Έχεις N αδιάβαστα μηνύματα - Doulitsa` | `Νέο Μήνυμα — Doulitsa` / `Νέα Μηνύματα — Doulitsa` (:391) |
| Subscription payment → admin | `{paymentTypeLabel} - {profileName} ({userEmail}) - {amount}` | `{type_label}: {name} — {amount}` (:469-474) |
| Service report / profile report / support feedback → admin | `Αναφορά Υπηρεσίας - {title}` / `Αναφορά Προφίλ - {name}` / `{issueTypeLabel} από {reporterName}` | no dedicated builder — the views reuse `send_contact_admin_email` (`apps/services/views/public/service.py:123+`, `apps/support/views/public/support.py:100-103`) → `[Doulitsa] Επικοινωνία: …` with the generic contact body; the old admin links (service/reporter admin URLs, page URL) are gone (owners: services / profiles-public-archives / blog-support — please confirm) |
Body differences worth fixing: verification-request admin email (`emails.py:171-178`) shows only raw profile id + ΑΦΜ — old (`templates/new-verification.ts:40-46`) showed name/email and 3 buttons (`/admin/verifications/{id}`, `/admin/profiles/{id}`, `/admin/verifications`); verification email text changed from "Καλώς ήρθες στην πλατφόρμα επαγγελματιών Doulitsa! … Επιβεβαίωση Λογαριασμού" to "Επαλήθευση email"; password-reset old green button + raw link in monospace; contact confirmation lost "Συνήθως απαντάμε μέσα σε 24-48 ώρες"; subscription-payment "Ημερομηνία" was `toLocaleString('el-GR')` (`templates/subscription-payment.ts:74`), new prints the raw ISO UTC string (`emails.py:461,467`); contact-admin lost `ID Μηνύματος`. Old templates had plain-text twins; new derives text by stripping tags. (HTML values are interpolated unescaped in both — parity.)
- Possibly intentional?: partly (simplified layout) — but subjects/links/reply-to are user-visible behavior; report.

### D6. Brevo list env-var names changed and default list id dropped — MEDIUM
- OLD: `lib/email/providers/brevo/types.ts:203-206` reads `BREVO_LIST_USERS`, `BREVO_LIST_EMPTYPROFILE`, `BREVO_LIST_NOSERVICES`, `BREVO_LIST_PROS` (each defaulting to `6`).
- NEW: `config/settings/base.py:386-391` reads `BREVO_LIST_USERS`, `BREVO_LIST_EMPTY_PROFILE`, `BREVO_LIST_NO_SERVICES`, `BREVO_LIST_ACTIVE_PROS`, default `""`; `apps/messaging/brevo.py:52-61` drops blank ids and `sync_user_to_correct_list` just logs `brevo.missing_list_id` and returns (:277-280).
- Impact: copying the Vercel env vars verbatim leaves 3 of 4 lists unset → pros are silently never added/moved between EMPTYPROFILE/NOSERVICES/PROS (marketing automations stop).
- Possibly intentional?: no (rename without alias).

### D7. Brevo list re-sync missing after service deletion / unpublish and admin profile deletion — MEDIUM
- OLD `brevoWorkflowService.handleUserStateChange` call sites with no NEW equivalent: `actions/services/delete-service.ts:104,197` (user deletes service → may move PROS→NOSERVICES), `actions/admin/services.ts:1346-1348` (admin moves a published service to rejected/inactive/draft), `actions/admin/services.ts:1421` (admin deletes service), `actions/admin/profiles.ts:629-631` (admin deletes profile → EMPTYPROFILE).
- NEW: `brevo_state_change` is only enqueued from registration/verification/onboarding/upgrade (`accounts/views/public/{auth,onboarding}.py`, `accounts/services/{registration,account}.py`) and admin user ops (`accounts/services/admin_users.py:62-75`); `brevo_first_service` covers the forward move. No call in `apps/services/services/service_writes.py` delete path or `admin_services.py` status/delete paths, nor in profile delete.
- Impact: pros who lose their last published service stay in the "active pros" list.
- Possibly intentional?: no. (services/admin owners may double-report.)

### D8. Cookie consent / GTM loading model changed — MEDIUM (possibly intentional)
- OLD: `app/layout.tsx:66-103` injects GTM `GTM-KR7N94L4` for EVERY visitor after first interaction or 5 s; CookieFirst banner + Consent Mode are configured inside the GTM container ("CookieFirst loads via Google Tag Manager").
- NEW: `app/layout.tsx:50-75` renders `ConsentDefaultsScript` (all-denied Consent Mode v2 defaults) + `CookieConsentRoot` (vanilla-cookieconsent headless + React replica of the CookieFirst UI); `lib/analytics/consent.ts:156-161` loads GTM ONLY if Απόδοση or Marketing was accepted; GTM id from build arg `NEXT_PUBLIC_GTM_ID` (empty ⇒ never loads). New `/cookies` page, footer link "Πολιτική Cookies" (`constants/datasets/footer.ts:12`) and a "cookie settings" button in the footer (`footer-global.tsx:151-152`). `PRESELECT_ALL_CATEGORIES = true` (pre-ticked, as CookieFirst did).
- Impact: visitors who decline/ignore the banner send no GTM hits at all (old: Consent-Mode cookieless pings/any non-consent-gated tags still fired); if the live GTM container still contains the CookieFirst tag, consenting visitors will get a SECOND (CookieFirst) banner after GTM loads.
- Possibly intentional?: yes very likely (CookieFirst replacement, documented in `docs/COOKIE-CONSENT.md`), but not in the intentional list → confirm and remove CookieFirst from the GTM container.

### D9. Archive breadcrumb base links changed (`baseHref` support removed) — MEDIUM
- OLD: `lib/utils/datasets.ts:1551-1562` and `:1719-1730` accept `options.baseHref`; `actions/services/get-services.ts:1107-1118` passes `baseHref: '/categories'` → on `/ipiresies/*` the "Υπηρεσίες" crumb links to **/categories**; `actions/profiles/get-profiles.ts:742-766` passes `baseHref: '/directory'` for archiveType directory → on `/dir/{cat}[/{sub}]` the "Επαγγελματικός Κατάλογος" crumb links to **/directory**; on the `/dir` root the crumbs are `[Αρχική, {label}]` with the label **unlinked**.
- NEW: `baseHref` removed from both helpers (new `datasets.ts:1558,1724`); `frontend/src/actions/services/get-services.ts:281-286` → "Υπηρεσίες" links to `/ipiresies`; profiles breadcrumbs now come from `apps/profiles/selectors/profile_aggregations.py:456` → base crumb always `{"href": "/dir"}` (also on the `/dir` root page where it is the current page).
- Impact: different breadcrumb targets on every service and directory archive page (SEO BreadcrumbList too).
- Possibly intentional?: no (recent QA commit fixed category hrefs but not the base crumb).

### D10. Shared service card shows the profile's coverage modes instead of the service's own type — MEDIUM
- OLD: `components/shared/service-card.tsx:121-123` `online={service.type?.online} onbase={service.type?.onbase} onsite={service.type?.onsite}`.
- NEW: same file `:121-123` uses `service.profile?.coverage?.{online,onbase,onsite}`.
- Impact: a service that is online-only renders onsite/onbase badges whenever the pro's profile coverage has them (and vice-versa) on every card using this component (home, related, archives that use it).
- Possibly intentional?: unlikely — looks like a workaround for `type` missing from the card payload; services owner please verify payload.

### D11. Forgot-password rate limit: per-email 1/10 min → per-IP 3/10 min — MEDIUM
- OLD: `actions/auth/forgot-password.ts:9-10,28-39` `checkMemoryRateLimit('forgot:'+email, 1, 10 min)` → message `Μπορείς να ζητήσεις επαναφορά κωδικού 1 φορά κάθε 10 λεπτά. Δοκίμασε ξανά σε N λεπτά.`; client variant (:81-90) silently returns success.
- NEW: `apps/accounts/views/public/auth.py:134` `PasswordResetThrottle` = `"3/10min"` keyed by IP (`common/throttling.py`); no per-email limit; frontend message `Έχεις ήδη ζητήσει επαναφορά πρόσφατα. Δοκίμασε ξανά αργότερα.` (no minutes).
- Impact: one victim mailbox can receive 3 reset mails per 10 min per attacker IP (unbounded across IPs); a legit user on a shared IP (office NAT) is blocked by others; copy differs.
- Possibly intentional?: no. (auth owner may double-report.)

### D12. New global API throttles can turn public pages into 500s — MEDIUM
- OLD: no global rate limiting (only D11).
- NEW: `DEFAULT_THROTTLE_CLASSES` anon `100/5s`, user `200/5s` (`base.py:240-251`). The ident is the real visitor IP only if `INTERNAL_PROXY_SECRET` matches on both sides AND the call is not a cached (`revalidate`) fetch — `lib/api/client.ts:337,348` skips IP forwarding for cacheable calls; sitemap/ws/check-access routes use raw `fetch` without it. All those requests share the frontend container's IP bucket. `docs/CATEGORIES-FEATURED-TAXONOMY.md:225-227` already records "hammering `/categories/*` … returns `Request was throttled` (surfaces as a 500 on the page)". Real IP is taken from the FIRST `X-Forwarded-For` entry (`client.ts:358-360`), which is client-controlled unless Traefik strips it.
- Impact: bursts (crawler, cache expiry wave) can 500 public pages; per-IP auth throttles may be bypassable via spoofed XFF.
- Possibly intentional?: throttling yes; page-breaking side effect no.

### D13. Cron schedule timezone shifted (UTC → Athens) — LOW
- OLD: `vercel.json` `auto-refresh 0 0 * * *` runs at 00:00 **UTC** (02:00/03:00 Athens) — Vercel crons are always UTC (`instrumentation.ts:18-19` notes this).
- NEW: `config/settings/base.py:315-330` `crontab(minute=0, hour=0)` with `CELERY_TIMEZONE = Europe/Athens` → 00:00 Athens (21:00/22:00 UTC); the comment claiming "same as Vercel" is wrong. Email batches `*/15` unaffected; new hourly `accounts-cleanup-pending-registrations` has no old counterpart. `CELERY_BEAT_SCHEDULER = DatabaseScheduler` (settings schedule only seeds the DB).
- Impact: promoted-service auto-refresh happens 2–3 h earlier than before (ordering of "refreshed today" around midnight).
- Possibly intentional?: maybe; confirm.

### D14. JSON-LD base URL env chain differs from canonical/sitemap — LOW
- OLD: all `lib/seo/schema/*-schema.tsx` use `BETTER_AUTH_URL || LIVE_URL || 'https://doulitsa.gr'`.
- NEW: `LIVE_URL || NEXT_PUBLIC_APP_URL || 'https://doulitsa.gr'` (7 schema files, line 13-33); canonical (`lib/seo/metadata.ts:32`) and sitemaps use `LIVE_URL || 'https://doulitsa.gr'`.
- Impact: when `LIVE_URL` is unset (test/Dokploy) JSON-LD URLs point at `NEXT_PUBLIC_APP_URL` (test host) while canonicals point at doulitsa.gr. Set `LIVE_URL` in prod.

### D15. Static sitemap / footer additions — LOW (additive)
- NEW `sitemap_static.xml/route.ts:17-18` adds `/cookies` and `/politiki-akirosis` (old listed neither; `politiki-akirosis` page existed in old). New `/cookies` page + footer items (D8).
- Possibly intentional?: yes.

### D16. Backend also serves divergent sitemaps + public API docs — LOW (info)
- `apps/core/urls/sitemaps.py` serves `/sitemap.xml`, `/sitemap_index.xml`, `/sitemap_static.xml` at the API host: index lists only `s/profile/articles` (no `categories/ipiresies/dir`), static lacks `/cookies`,`/politiki-akirosis`, top-level points at `sitemap_index.xml` (frontend version is self-referential like old). Harmless only if search engines never see the API host. Also `/api/docs/`, `/api/redoc/` (drf-spectacular, AllowAny by default) and `/django-admin/` are exposed — not present in old.

### D17. SEO `fetchEntity`/article metadata now depend on public endpoints — LOW
- OLD `lib/seo/fetch-entity.ts` service: `prisma.service.findUnique({id})` (any status); profile: `findFirst({username, published:true})`; `lib/seo/pages.ts` article: `findUnique({slug})` (any status).
- NEW: `servicesApi.getServicePage(id)` / `profilesApi.getProfileByUsername` / `blogApi.getArticle` — whatever visibility those public endpoints enforce; any error → `entity: null` (generic title). Also `getServicePage` is a second full page-bundle request per render.
- Impact: metadata of non-published service/article previews (admin/owner preview) falls back to generic titles.

### D18. Smaller behavior changes in shared components / datasets — LOW
- `components/shared/user-avatar.tsx:186-215`: fallback initials now rendered after 150 ms delay instead of skeleton while loading; `referrerPolicy='no-referrer'` added (fixes Google avatars). Possibly intentional (fix).
- `lib/utils/datasets.ts:828-1386`: coverage resolvers now also match by NAME (old matched ids only → returned null/omitted for name-valued coverage); `formatCoverage…(null)` guarded. Possibly intentional (data-shape fix) — but it changes what is displayed for legacy name-valued coverage.
- `components/shared/next-link.tsx:84` returns `'#'` for undefined href (old would throw); `dynamic-breadcrumb.tsx:45` tolerates undefined segments.
- `components/dashboard/dashboard-content.tsx:217-241`: recent-chat rows show avatar image + `displayName ?? 'Άγνωστος χρήστης'` (old: initial letter + `chat.name`).
- `components/dashboard/dashboard-sidebar.tsx:177-178`: "Συνδρομή" menu item now hidden unless `/api/payments/check-access` allows (old: always for professionals). Billing owner to confirm with PAYMENTS_TEST_MODE semantics.
- `app/(dashboard)/dashboard/page.tsx:8` `revalidate 3600 → 60` (layout is force-dynamic anyway — no effect).
- `components/ui/sheet.tsx` `instantOpen` prop = the intentional archive-drawer fix.

### D19. API client robustness — LOW
- `lib/api/client.ts:387` `fetch` has no timeout/AbortController — a hung Django blocks SSR until the platform timeout (old Prisma had pool/connect timeouts). Retries: one refresh+retry on 401 then an anonymous retry (safe: DRF rejects before the view runs); no retry on 5xx/network (old: none either). `credentials:'include'` only in browser. OK otherwise.

## 4. Confirmed same (verified)
- Byte-identical: `global-error.tsx`, `global-not-found.tsx`, `components/shared/{not-found-page,error-page}.tsx` (404/500 texts), `robots.txt`, `sitemap.xml/route.ts`, `(sitemap)/sitemap_index.xml/route.ts`, `dir/categories/ipiresies sitemap.ts`, every route-group layout, all 7 static pages under `(pages)` and their datasets (`about, faq, for-pros, contact, counter-stats, data, options`), header (`header*.tsx`, `navigation-menu.tsx`), footer wrapper, `body/notifications/path-checker` wrappers, `navigation-skeleton-overlay`, `lib/seo/{meta,metadata,format-template,get-entity-values}.ts`, `lib/seo/schema/{home-schema,json-ld,index}`, `lib/utils/{format,cooldown,cn,api,zod,rating,blog}.ts`, `lib/utils/formatting/*`, `lib/utils/text/{slug,greek-latin,normalize,sanitize,html}.ts`, `lib/utils/validation/*`, `lib/fonts.ts`, `styles/*`, `tailwind/postcss/components.json`, `vercel.json`, `middlewares/{withHeaders,withLowercaseRedirect,stackHandler}` and the middleware matcher, 47/53 ui primitives (the 13 missing ones — aspect-ratio, chart, context-menu, hover-card, input-otp, loading-spinner, media-display, menubar, progress, resizable, slider, toggle-group, year-picker — are unused or admin-only), all icon components except unused `x-custom.tsx`.
- `next.config.js`: redirects (`/s`, `/profile`, `/auth/sign-in`, `/pros*`, `/companies*`), headers, images config, compiler options identical; only perf knobs (`serverExternalPackages`, `modularizeImports`, standalone output) removed — no behavior impact (Dockerfile copies full app).
- Backend `common/utils/slug.py`, `greek_latin.py`, `normalize.py` reproduce `createSlug`/`generateServiceSlug`/`findNextSlugVariant`/`normalizeTerm` exactly (same map, longest-first ordering, same regexes).
- `SitemapEntriesView` filters equal the old Prisma sitemap filters (services published+slug; profiles published+active+username+user not blocked+confirmed; articles published), ordering `-updated_at`.
- Brevo list rules (`brevo.sync_user_to_correct_list`) equal `syncUserToCorrectList` + `handleUserStateChange` (blocked/banned → remove all; user → USERS; pro incomplete or step≠DASHBOARD → EMPTYPROFILE; 0 published → NOSERVICES; else PROS), GDPR delete on account deletion, contact attributes.
- Dead old code with no counterpart needed (0 importers): `components/{link.ts,providers/*,shared/{404,link,profile-card,taxonomy-selector,verified-badge}.tsx,media/upload/media-upload-simple.tsx}`, `lib/{config/index.ts,hooks/chat/use-infinite-scroll.ts,utils/{navigation/*,taxonomy-routes.ts,format-rating.ts,misc/errors.js,text/truncate.ts}}`, `constants/datasets/{budgets,collections,company-sizes,subscription-types,tabs}.ts`, `middlewares/withAdminAuth.ts`, `actions/shared/index.ts`, `actions/index.ts` (barrel). `lib/utils/misc/shuffle.ts shuffleFeatured` is ported to Django (`profile_aggregations.py:236-241`, `service_reads.py:590-595`).
- Platform-swap files (no counterpart by design): `lib/prisma/**`, `lib/database/selects/*`, `lib/supabase/*`, `lib/cache/{config,keys}.ts` + test (caching arch), `lib/email/providers/brevo/client.ts` (→ anymail), `scripts/*` Strapi/Prisma one-off migrations & debug scripts (data already migrated; `backfill-subscription-billing` → `backfill_payment_columns`).

## 5. Open questions / couldn't verify
1. Dokploy runtime env of the frontend: is `TZ` set anywhere outside the repo (D1)? Is `LIVE_URL` set (D14)? Is `INTERNAL_PROXY_SECRET` set identically on both services (D12)?
2. Backend env: actual `BREVO_LIST_*` names in Dokploy (D6); does `BREVO_SENDER_EMAIL` contain a display name (D4)?
3. DB: are `blog_articles."categorySlug"` values the old or the renamed slugs (D2)? The frontend comment says a SQL migration ran; no migration file exists in `backend/apps/blog/migrations`.
4. Does the live GTM container still include the CookieFirst tag (D8)?
5. Traefik `forwardedHeaders` config — whether a client-supplied `X-Forwarded-For` reaches Next (D12).
6. Cookie-banner copy vs the old CookieFirst banner could not be compared: CookieFirst text lived in the third-party service, not in the old repo.
