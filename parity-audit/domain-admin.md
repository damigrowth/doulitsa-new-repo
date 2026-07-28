# Domain: Admin + Github

> AUDIT-ONLY migration parity check (Doulitsa). OLD = Next.js + Supabase/Prisma server actions; NEW = Django/DRF backend + Next.js frontend client.
> NOTE: Plan mode prevented writing to the requested `/tmp/parity-audit/domain-admin.md`; this plan file is the deliverable artifact. Copy verbatim to that path when out of plan mode.

## Architecture map (how NEW admin is wired)

- The `admin_api` Django app is thin (only api-keys, navigation, notifications). Admin functionality is **distributed across each app's `views/admin/` + `urls/admin.py`**, mounted under `/api/admin/...` in `backend/config/urls.py:49-84`.
- RBAC is a faithful port: `backend/apps/accounts/permissions/admin.py:45-94` `ROLE_PERMISSIONS` is a 1:1 mirror of OLD `app_before_migrations/src/lib/auth/roles.ts:98-152`. `HasResourcePermission(resource, level)` mirrors `hasAccess/canEdit/hasFullAccess`. `_satisfies` implements full>edit>view ranking.
- **Two big architectural findings (cross-cutting):**
  1. **Git ops + per-item taxonomy CRUD are NOT migrated.** The NEW frontend `frontend/src/actions/admin/git-operations.ts` and `frontend/src/actions/github/operations.ts` are **byte-identical** to OLD and still call GitHub directly via Octokit from Next.js (`@octokit/rest` still in `frontend/package.json:65`, `frontend/src/lib/github/client.ts` present). The Django git endpoints (`backend/apps/taxonomy/views/admin/git.py`) and per-item taxonomy CRUD endpoints (`backend/apps/taxonomy/views/admin/dataset.py`, exposed as `adminTaxonomy.createSkill` etc. in `frontend/src/lib/api/admin.ts:161-179`) **exist, are wired, but are never called by the frontend** — dead/parallel surface area.
  2. **Frontend cache revalidation is unmigrated.** `revalidate-caches.ts` and `revalidate-taxonomies.ts` are byte-identical to OLD (local Next.js `revalidateTag`/`revalidatePath`); `adminCache.revalidateAll` (`admin.ts:226`) is defined but unused. Every Django admin mutation lacks cache invalidation, so public pages serve stale content.
  3. **Brevo/CRM side-effects are stubbed.** All NEW user/service/profile mutations that OLD synced to Brevo lists now call no-op `_sync_brevo`/`_delete_brevo_contact` stubs (`backend/apps/accounts/services/admin_users.py:62-76`). Brevo list stats (`get_brevo_stats`) are DB approximations with `noServices` hardcoded 0.

## Parity matrix (grouped by resource)

Legend: ✅ matched · ⚠️ partial · ❌ missing/broken · ❓ needs verification

### Users
| Capability | Cat | OLD (file:line) | NEW (file:line) | Status | Notes |
|---|---|---|---|---|---|
| list (filters/sort/pag) | list | users.ts:99 | accounts/views/admin/users.py:51 + selectors/admin_users.py:25 | ⚠️ | sortBy whitelisted (silent fallback); stats `active` omits email_verified |
| get detail | detail | users.ts:50 | users.py:92 + selectors:93 | ⚠️ | NEW drops profile + service/review counts; shape `{user,accounts,sessions}` vs OLD flat |
| create | create | users.ts:230 | users.py:75 + services/admin_users.py:111 | ⚠️ | NEW adds role-assign gate + dup checks; Brevo stub |
| setRole | update | users.ts:270 | users.py:127 | ✅ | canAssignRole enforced |
| ban/unban | toggle | users.ts:314/341 | users.py:141/157 | ✅ | |
| delete | delete | users.ts:368 | users.py:116 (full) | ✅ | |
| impersonate | action | users.ts:418 | users.py:193 + service:371 | ⚠️ | NEW adds `actor.role==admin` hard-check → support loses impersonation (OLD allowed via users:edit) |
| stop-impersonate | action | users.ts:445 | users.py:202 | ✅ | |
| list/revoke/revoke-all sessions | action | users.ts:467/495/524 | users.py:166/183/174 | ✅ | token-based |
| setPassword | update | users.ts:609 | users.py:210 | ✅ | |
| basic-info/status/ban-status/image/journey-step/account | update | users.ts:644/712/780/824/930/1306 | users.py:227/245/265/282/324/351 | ⚠️ | `account` skips Profile sync+cache (users.py:352-357 deferred) |
| toggleBlocked/toggleConfirmed | toggle | users.ts:855/894 | users.py:296/310 | ✅ | |
| stats | stats | users.ts:987 | users.py:341 | ✅ | minor active-count drift |

### Team
| Capability | Cat | OLD | NEW | Status | Notes |
|---|---|---|---|---|---|
| list | list | users.ts:1450 | accounts/views/admin/team.py:21 | ⚠️ | serializer drops firstName/lastName/confirmed/blocked/testUser/updatedAt |
| assignRole | update | users.ts:1507 | team.py:31 + service:402 | ✅ | canAssignRole + self-demotion guard |
| removeRole | update | users.ts:1601 | team.py:48 + service:425 | ⚠️ | revert role divergence: pro-no-profile → FREELANCER (NEW) vs user (OLD) |
| search | list | users.ts:1693 | team.py:56 | ⚠️ | order differs (email vs -createdAt); serializer field gap |

### API keys / navigation / notifications
| Capability | Cat | OLD | NEW | Status | Notes |
|---|---|---|---|---|---|
| validate key | action | api-keys.ts:20 | admin_api/views/admin/api_keys.py:39 | ⚠️ | source enum differs (env/db vs environment/database); no permission verify |
| create key | create | api-keys.ts:75 | api_keys.py:60 + services/api_keys.py:32 | ❌ | **`expiresIn` UNIT BUG**: OLD=days×86400→seconds (api-keys.ts:90); NEW treats raw seconds (service:38). Permissions set dropped |
| list keys | list | api-keys.ts:126 | service:55 | ⚠️ | OLD filters admin-purpose keys; NEW returns ALL keys (leak) |
| update/delete key | upd/del | api-keys.ts:156/189 | api_keys.py:79/89 | ✅ | delete gated settings:view (matches OLD) |
| myAccess | action | api-keys.ts:217 | api_keys.py:96 | ⚠️ | OLD blocks non-settings; NEW returns hasAccess:false 200 |
| navigation (role-filtered) | list | helpers.ts:110 | api_keys.py:114 + service:101 | ✅ | uses ROLE_PERMISSIONS; support/editor exclusions correct |
| notifications feed | list | (page, no action) | admin_api/views/admin/notifications.py:147 | ⚠️ | NEW-built; all items hardcoded unread, no read-state |

### Profiles
| Capability | Cat | OLD | NEW | Status | Notes |
|---|---|---|---|---|---|
| list | list | profiles.ts:33 | profiles/views/admin/profiles.py:31 + services/admin_profiles.py:22 | ⚠️ | sortBy reviewCount/services dropped; `published=all` mis-coerced; no taxonomyLabels |
| get detail | detail | profiles.ts:184 | profiles.py:79 | ⚠️ | no embedded services[]/reviews[] lists |
| update (generic) | update | profiles.ts:252 | profiles.py:85 + serializer:7 | ⚠️ | serializer accepts ~8 fields vs OLD ~30; no normalized fields |
| toggle published/featured/verified | toggle | profiles.ts:317/369/448 | profiles.py:102/110/118 | ⚠️ | featured drops cache revalidation; verified syncs verification ✅ |
| update verification-status (via profile) | update | profiles.ts:517 | urls/admin.py:33 alias → verifications.py:50 | ❌ | **Alias route broken**: binds `profile_id` to view expecting `verification_id` → 500/404. No upsert-when-missing |
| delete | delete | profiles.ts:594 | profiles.py:94 (full) | ⚠️ | drops Brevo sync; cascadeInfo no counts |
| search / search-for-services | list | profiles.ts:656/736 | profiles.py:126/136 | ⚠️ | no min-2 guard; shape differs; search-for-services gated SERVICES.edit (stronger) ✅ |
| stats | stats | profiles.ts:814 | profiles.py:146 | ⚠️ | professional/company use user.role vs OLD profile.type |
| brevo-stats | stats | profiles.ts:860 | profiles.py:153 + service:241 | ❌ | DB approximation; noServices hardcoded 0; total≠sum buckets |
| update settings | update | profiles.ts:941 | profiles.py:160 | ⚠️ | cache revalidation dropped |
| update basic-info | update | profiles/basic-info.ts:20 | profiles.py:196 | ❌ | drops image/skills/coverage (mapping omits); no normalization |
| update additional-info | update | profiles/additional-info.ts:19 | (none) → routes to generic PATCH | ❌ | NO endpoint; serializer drops all fields → silent no-op; no experience derivation |
| update presentation | update | profiles/presentation.ts:20 | profiles.py:210 | ⚠️ | socials DbNull + cache dropped |
| update portfolio | update | profiles/portfolio.ts:19 | profiles.py:224 | ⚠️ | Cloudinary sanitization bypassed; cache dropped |
| update coverage | update | profiles/coverage.ts:18 | profiles.py:235 | ❌ | coverageNormalized not regenerated → stale geo-search |
| update billing | update | profiles/billing.ts:17 | profiles.py:246 | ✅ | (cache dropped) |

### Verifications
| Capability | Cat | OLD | NEW | Status | Notes |
|---|---|---|---|---|---|
| list | list | verifications.ts:21 | profiles/views/admin/verifications.py:20 | ⚠️ | sortBy=status unsupported |
| get | detail | verifications.ts:105 | verifications.py:34 | ⚠️ | row omits user name/role |
| updateStatus | update | verifications.ts:153 | verifications.py:50 | ✅ | APPROVED flips profile.verified |
| delete | delete | verifications.ts:222 | verifications.py:43 (full) | ✅ | unverifies profile |
| stats | stats | verifications.ts:276 | verifications.py:68 | ✅ | |

### Services
| Capability | Cat | OLD | NEW | Status | Notes |
|---|---|---|---|---|---|
| list | list | services.ts:137 | services/views/admin/service.py:24 + services/admin_services.py:17 | ⚠️ | search narrowed (no normalized/name/ID); `type` filter broken (JSON vs scalar); default sort changed; reviewCount/sortDate dropped |
| get detail | detail | services.ts:334 | service.py:33 | ⚠️ | no profile.user/email/role, no taxonomyLabels, review shape differs |
| update (generic) | update | services.ts:400 | service.py:51 + admin_services.py:112 | ⚠️ | no slug regen / normalize / sanitize / cache / email |
| patch taxonomy/basic/pricing/settings/addons/faq/media | update | services.ts:581-909 | service.py:80-88 | ⚠️ | whitelists match; basic drops slug/normalize; media sanitizes ✅ but no cache |
| toggle published/featured | toggle | services.ts:1002/1137 | service.py:103/113 | ⚠️ | logic ok; no email/Brevo/cache |
| status (approve/reject) | update | services.ts:1207 | service.py:123 + admin_services.py:135 | ⚠️ | rejectionReason discarded; no email/Brevo/cache |
| delete | delete | services.ts:1376 | service.py:44 (full) | ⚠️ | no cache; no Brevo demotion sync |
| stats | stats | services.ts:1447 | service.py:135 | ⚠️ | missing approved/inactive; serviceTypes {}; topTag null; raw slugs |
| createForProfile | create | services.ts:1668 | service.py:144 + admin_services.py:165 | ⚠️ | no freelancer/company role gate; no email/cache |

### Reviews
| Capability | Cat | OLD | NEW | Status | Notes |
|---|---|---|---|---|---|
| list | list | reviews.ts:22 | reviews/views/admin/reviews.py:29 | ⚠️ | search narrower (no author name/email) |
| get | detail | reviews.ts:135 | reviews.py:68 | ✅ | 404 shape differs |
| updateStatus | update | reviews.ts:195 | reviews.py:86 + services/review_ops.py:90 | ⚠️ | NEW drops `pending` status; approval email TODO; rating recalc ✅ |
| delete | delete | reviews.ts:316 | reviews.py:79 (full) | ✅ | rating recalc ✅ |
| stats | stats | reviews.ts:378 | reviews.py:103 | ✅ | |
| toggleVisibility | toggle | reviews.ts:413 | reviews.py:117 | ⚠️ | drops `message` field |
| pending queue | list | (n/a) | reviews.py:127 | ✅ | NEW-only addition |

### Subscriptions (billing)
| Capability | Cat | OLD | NEW | Status | Notes |
|---|---|---|---|---|---|
| list | list | subscriptions.ts:27 | billing/views/admin/billing.py:29 + services/subscription_ops.py:208 | ⚠️ | search differs; sort whitelist shrank; default sort changed |
| get | detail | subscriptions.ts:125 | billing.py:36 | ✅ | |
| status | update | subscriptions.ts:173 | billing.py:52 | ✅ | featured side-effect parity |
| delete | delete | subscriptions.ts:242 | billing.py:45 (full) | ⚠️ | unconditionally clears featured (OLD: promoted-plan only) |
| stats | stats | subscriptions.ts:296 | billing.py:62 | ✅ | |
| manual create | create | subscriptions.ts:386 | billing.py:69 + subscription_ops.py:290 | ❌ | drops pro-type guard + active-sub guard; no current_period_start; no cancel reset |

### Chats (read-only monitoring)
| Capability | Cat | OLD | NEW | Status | Notes |
|---|---|---|---|---|---|
| stats | stats | chats.ts:43 | messaging/views/admin/chats.py:16 | ⚠️ | counts deleted msgs (OLD excludes) |
| list | list | chats.ts:106 | chats.py:33 | ⚠️ | member-name search lost; default limit 50→20; counts deleted |
| get | detail | chats.ts:230 | chats.py:86 | ⚠️ | counts deleted; shape reworked |
| chatStats | stats | chats.ts:308 | chats.py:115 | ⚠️ | counts deleted |
| messages | list | chats.ts:424 | chats.py:141 | ⚠️ | **no cid→id resolution** (cid returns empty); default limit 12→50 |
| (auth) | authz | chats.ts (NONE) | chats.py:13 CHATS/view | ✅ | NEW adds gating OLD lacked — security improvement |

### Blog
| Capability | Cat | OLD | NEW | Status | Notes |
|---|---|---|---|---|---|
| list | list | actions/blog/manage-articles.ts:234 | blog/views/admin/article.py:23 | ⚠️ | search title|slug (OLD title|titleNormalized); authors omitted in list |
| create | create | manage-articles.ts:18 | article.py:32 + services/articles.py:146 | ⚠️ | drops category-dataset + author-existence validation + publish refinement; FK error→500 |
| get | detail | manage-articles.ts:313 | article.py:42 | ✅ | |
| update | update | manage-articles.ts:95 | article.py:51 | ⚠️ | publishedAt + replace-authors ✅; same validation drops; adds slug-uniq 409 (improvement) |
| delete | delete | manage-articles.ts:195 | article.py:60 (full) | ✅ | cache purge present |

### Taxonomy (per-item CRUD, commit, revalidate)
| Capability | Cat | OLD | NEW backend | NEW frontend | Status | Notes |
|---|---|---|---|---|---|---|
| skills CRUD | crud | skills.ts:35/46/58 | dataset.py:26/36/45 | skills.ts (local, unchanged) | ⚠️ | Backend exists & works but frontend never calls it (still local file+localStorage drafts) |
| tags CRUD | crud | tags.ts:33/43/54 | dataset.py:52/62/71 | tags.ts (local) | ⚠️ | Same hybrid split |
| service-tax create/update | crud | taxonomies.ts:22/74 | dataset.py:78/88 | taxonomies.ts (local) | ❌ | `level` IntegerField(1-3) vs OLD string-enum → 400 if called; OLD path was deprecated-stub anyway |
| pro-tax create/update | crud | pro-taxonomies.ts:21/59 | dataset.py:98/108 | pro-taxonomies.ts (local) | ❌ | Same level mismatch |
| commit (changes[]+overallMessage) | action | taxonomy-publish.ts:427 | dataset.py:118 + dataset_ops.py:248 | taxonomy-publish.ts:35 → admin.ts:177 | ⚠️ | Migrated; drops mergeDrafts/sanitize, move/newParentId handling, dup-ID guard, **syncServicesAfterMove** (orphans service refs) |
| taxonomy revalidate | action | revalidate-taxonomies.ts:23 | dataset.py:133 | (local, never calls backend) | ⚠️ | Backend wildcard purge won't match Redis keys; frontend unchanged |

### Taxonomy submissions moderation
| Capability | Cat | OLD | NEW | Status | Notes |
|---|---|---|---|---|---|
| list | list | taxonomy-submission.ts:24 | taxonomy/views/admin/submissions.py:30 | ⚠️ | shape: `items`→`submissions`; drops categoryLabel + submitterProfile |
| stats | stats | taxonomy-submission.ts:113 | submissions.py:37 | ✅ | exact match |
| approve | action | taxonomy-submission.ts:242 | submissions.py:44 + admin_submissions.py:64 | ⚠️ | creates dataset entry ✅ but drops replaceSubmissionId in profiles/services + cache; different workflow (direct commit vs draft) |
| reject | action | taxonomy-submission.ts:366 | submissions.py:51 | ⚠️ | requires reason (OLD optional); drops removeSubmissionId + cache |
| bulk-approve/reject | action | taxonomy-submission.ts:427/445 | submissions.py:64/73 | ⚠️ | response shape changed; bulk-reject requires reason |

### Cache / media
| Capability | Cat | OLD | NEW | Status | Notes |
|---|---|---|---|---|---|
| revalidate-all | action | revalidate-caches.ts:16 | core/views/admin/cache.py:34 | ⚠️ | frontend unchanged (local Next.js); backend purges only 2 keys; endpoint unused by UI |
| revalidate webhook | action | (Vercel hook) | cache.py:44 (CRON_SECRET) | ✅ | new shared-secret webhook |
| media-library-token | action | cloudinary/get-media-library-token.ts:24 | media/views/public/sign.py:30 @ /admin/media/... (IsAdmin) | ✅ | admin-gated; media/views/admin dir empty |

### Github / git operations
| Capability | Cat | OLD (file:line) | NEW backend (file:line) | NEW frontend | Status | Notes |
|---|---|---|---|---|---|---|
| git status | read | git-operations.ts:51 (GIT view) | taxonomy/views/admin/git.py:24 (view) | git-operations.ts:51 (IDENTICAL, Octokit) | ✅* | *Frontend bypasses backend; backend exists & gate matches |
| commit dataset changes | write | git-operations.ts:192 (view) | dataset.py:118 commit | git-operations.ts:192 (local Octokit) | ✅* | Frontend uses Octokit createCommit directly |
| push to remote | write | git-operations.ts:258 (view) | git.py:33 GitPushView (view, no-op) | identical | ✅* | NEW push is compat no-op (commits land direct) |
| recent commits | read | git-operations.ts:301 (view) | git.py:47 GitCommitsView (view) | identical | ✅* | |
| discard staged | write | git-operations.ts:380 (edit) | (no backend equivalent) | identical | ⚠️ | DB-staging-table op; no Django endpoint |
| revert commits | write | git-operations.ts:410 (full) | git.py:66 GitRevertView (full) | identical | ✅* | gate matches; PyGithub simulates revert |
| undo last | write | git-operations.ts:537 (view) | git.py:78 GitUndoLastView (view) | identical | ✅* | force-reset HEAD by N |
| merge to main | write | git-operations.ts:625 (view) | git.py:101 GitMergeToMainView (view) | identical | ✅* | |
| sync from main | write | git-operations.ts:726 (edit) | git.py:113 GitSyncFromMainView (edit) | identical | ✅* | gate matches |
| reset to main | write | git-operations.ts:825 (view) | git.py:125 GitResetToMainView (view) | identical | ✅* | destructive |
| octokit primitives (getBranch/getContent/compare/createCommit/listCommits) | lib | github/operations.ts:1-322 | github_client.py:68-289 (PyGithub port) | github/operations.ts (IDENTICAL) | ✅* | Backend is faithful PyGithub port but unused by frontend |

`✅*` = behavior preserved because frontend code is unchanged (still Octokit); Django backend git layer is a correct parallel implementation that the UI does not call. Migration "to Django" for git is therefore **incomplete by design** but not a runtime regression.

## Detailed gaps (per ❌/⚠️)

### ❌ A1. API key `expiresIn` unit bug (HIGH)
OLD `createAdminApiKeySchema.expiresIn` is **days** (default 365), converted to seconds via `*24*60*60` (api-keys.ts:90). NEW `create_api_key` treats `expires_in` as raw **seconds** (services/api_keys.py:38); frontend forwards raw (admin.ts:197). A UI sending 365 creates a key expiring in 365 seconds. **Fix:** convert `timedelta(days=expires_in)` with default 365/max 365, or document seconds and update frontend. Also restore the richer permission set `{admin,users,sessions}` (OLD api-keys.ts:91-104).

### ❌ A2. `listAdminApiKeys` returns ALL keys (MED — data exposure)
OLD filters `permissions.admin && metadata.purpose==='admin-access'` (api-keys.ts:135). NEW returns every `ApiKey` row (service:55). **Fix:** filter by admin-purpose and/or current user.

### ❌ A3. Profile verification-status alias route broken (HIGH)
`profiles/urls/admin.py:33` maps `profiles/<profile_id>/verification-status` → `AdminVerificationStatusView` whose handler signature is `patch(request, verification_id)` (verifications.py:57). Django passes `profile_id` kwarg → TypeError/500 (or wrong lookup). Frontend works around it by fetching the profile first, so the route is dead-but-erroring. OLD also upserted a verification if missing (profiles.ts:528). **Fix:** give the profile-scoped path its own handler that resolves verification by profile and `update_or_create`.

### ❌ A4. Admin profile section-update endpoints bypass owner-path business logic (HIGH)
- basic-info (profiles.py:196): drops `image`, `skills`, `coverage`, no `*_normalized` — though frontend sends them.
- additional-info: **no endpoint at all**; frontend routes to generic PATCH which drops every field → silent no-op; `experience` never derived.
- coverage (profiles.py:235): `coverage_normalized` never regenerated → stale geo-search.
- portfolio (profiles.py:224): Cloudinary `sanitize_resource` bypassed.
Root cause: admin paths call the generic `update_profile` instead of the owner-path services (`update_basic_info`/`update_additional_info`/`update_coverage`/`update_portfolio` in profile_updates.py) that contain normalization/derivation/sanitization. **Fix:** route admin section updates through those owner services + add the missing `additional-info` endpoint.

### ❌ A5. Brevo list stats wrong (MED)
OLD computes 4 precise buckets via step==DASHBOARD + published-services join (profiles.ts:860). NEW (admin_profiles.py:241) returns DB approximations; `noServices` hardcoded 0; total=User.count() (not sum of buckets). **Fix:** reimplement bucket logic joining services + step.

### ❌ A6. Manual subscription creation drops business rules (HIGH)
NEW `admin_create_manual` (subscription_ops.py:290) drops: (a) `profile.user.type == pro` guard, (b) reject-if-active-sub guard, (c) `current_period_start` set, (d) clearing `cancel_at_period_end`/`canceled_at` on re-activation. OLD enforced all (subscriptions.ts:386-473). **Fix:** add the two guards (400/409) and set all period fields.

### ❌ A7. Taxonomy `level` field type mismatch (HIGH if backend used)
`serializers/taxonomy.py:28,40` declares `level=IntegerField(1-3)`; OLD/frontend send string enum `category|subcategory|subdivision`. Direct backend call would 400. Masked because frontend taxonomy CRUD never calls backend. **Fix:** accept the string enum (or map).

### ⚠️ B-series (selected behavioral regressions)
- **Cache revalidation absent across all Django admin mutations** (cross-cutting). Public home/directory/profile/service pages serve stale content. Fix: wire an on-demand revalidation webhook (the `adminCache.revalidateAll` endpoint exists) into mutation endpoints.
- **Brevo CRM sync stubbed** across users/services/profiles mutations (admin_users.py:62-76 stubs; services/reviews TODOs). Email-list automation broken.
- **Impersonation gate tightened** (NEW requires admin; OLD allowed support via users:edit) — product decision (security tightening vs regression).
- **removeAdminRole revert role** divergence (FREELANCER vs user) for pro-without-profile.
- **Services list:** `type` JSON filter broken; search breadth + Greek-accent normalization lost; default sort changed; stats incomplete (no approved/inactive, empty serviceTypes, null topTag, raw slugs).
- **Service update side-effects** (slug regen, title/description normalization, rich-text sanitize) dropped → stale slug + unsearchable + XSS exposure.
- **createForProfile** missing freelancer/company role gate → orphaned services.
- **Chats messages** doesn't resolve cid→id → empty result when navigated by cid; all chat counts include deleted messages (OLD excluded).
- **Blog create/update** drops category-dataset validation + author-existence checks (bad author id → 500) + publish-time refinements.
- **Taxonomy commit** drops `syncServicesAfterMove` → moving a category orphans `services.category/subcategory` references; submissions approve/reject drop pending-ID rewrite in profiles/services.
- **Submissions list** drops `categoryLabel`/`submitterProfile`; key `items`→`submissions`.
- **Team/serializer field gaps** (firstName/lastName/confirmed/blocked/testUser).
- **Detail response thinning** on users/profiles/services (no embedded relations, fewer user fields).

## Authorization (RBAC) parity notes

- **Matrix port is faithful and correct.** `accounts/permissions/admin.py:45-94` mirrors OLD `roles.ts:98-152` exactly: admin=full everywhere; support=full on services/verifications/profiles/users/chats/reviews/blog and null on team/taxonomies/subscriptions/analytics/git/settings; editor=full on services only (dashboard view), null elsewhere. `_satisfies` enforces full>edit>view ranking (admin.py:97-102). `canAssignRole`/`getAllowedRolesToAssign` ported into services (admin can assign all; support only non-admin; editor none).
- **Per-endpoint gates verified and matching OLD** for: users (view/edit/full split per op), team (view/edit), profiles (view/edit/full), verifications (view/edit/full), reviews (view/edit/full), billing/subscriptions (admin-only via subscriptions=null for support/editor; delete=full), blog (view/edit/full), git (view for status/push/commits/undo/merge/reset, edit for sync, full for revert — matches OLD git-operations.ts gates exactly), taxonomy CRUD/commit (edit), submissions (view list/stats, edit approve/reject), cache revalidate-all + media token (IsAdmin).
- **Improvements over OLD:** Chats now gated (CHATS/view) — OLD had no auth check at all (chats.ts:422). search-for-services now gated SERVICES/edit.
- **Divergences:** impersonation requires admin in NEW (A-series above). The broken profile verification-status alias would also shift the gate-resource from PROFILES.edit (OLD) to VERIFICATIONS.edit (NEW) — immaterial for admin/support but divergent for a hypothetical split role.
- **Notifications** gated DASHBOARD/view → editor can read (editor has dashboard:view). Matches intent.

## Counts

- **matched (✅): ~38**
- **partial (⚠️): ~52**
- **missing/broken (❌): 10** (A1 api-key expiresIn, A2 api-key list-all, A3 verification alias route, A4 profile basic-info/additional-info/coverage [3], A5 brevo-stats, A6 manual subscription, A7 taxonomy level [service+pro, counted as 2])
- **needs_verification (❓): ~3** (admin notifications parity vs OLD page; media sanitize_resource pending-marker coverage; Brevo stub timing)

(Counts are approximate — per-field detail was sampled on the largest resources [services, profiles, users] per the breadth-over-depth instruction.)
