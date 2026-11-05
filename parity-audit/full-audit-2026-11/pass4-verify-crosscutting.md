# Pass 4: adversarial verification of the CROSS-CUTTING cluster (2026-11-05)

**Role:** verifier. I re-derived every finding below from code, old (`oldnext/`) and new (`frontend/`, `backend/`), and treated each reporter as possibly wrong.

**Ground rules:** zero code changes, no git commands. The only write is this file.

**Live probes:** read-only, anonymous GETs or a POST with a bad secret, against `test.doulitsa.gr` / `api-test.doulitsa.gr`, plus public GETs on `doulitsa.gr`. One probe of the old-prod cron endpoint was refused by the sandbox, so that item is code-only.

**DRF semantics:** checked against an on-disk DRF **3.15.2** copy (`/Users/sereth/Desktop/advanza/api/venv/.../rest_framework`, `__version__ = '3.15.2'`). The backend pins `djangorestframework>=3.15,<3.16`. I also checked the simplejwt source from the same venv.

**Verdicts:**
- **CONFIRMED**: re-derived, with both sides cited.
- **ADJUSTED**: real, but the scope, severity or mechanism differs from the report.
- **REFUTED**: proven wrong, or out of scope under the Addendum.
- **UNVERIFIABLE-FROM-REPO**: the live check that would settle it is named.

---

## 0. Load-bearing re-verifications

### 0.1 Throttle no-op (pass3-profiles-dashboard C1): **CONFIRMED independently**
DRF 3.15.2 `rest_framework/throttling.py`:
- `ScopedRateThrottle.__init__` is `pass`.
- `allow_request` does `self.scope = getattr(view, self.scope_attr, None)`, where `scope_attr = 'throttle_scope'`, and then `if not self.scope: return True`.

The class attribute `scope = "login"` etc. is overwritten before use.

`backend/common/throttling.py:68-105`: all 9 subclasses only set `scope`. None override `allow_request`, `__init__` or `scope_attr`.

`grep -rn "throttle_scope|scope_attr" apps common config` gives 0 hits.

Views that set `throttle_classes = [XThrottle]` also **replace** the defaults (`APIView.get_throttles` uses `self.throttle_classes`), so the anon/user global throttles are gone on them too:
- `accounts/views/public/auth.py:42` (login), `:66` (register), `:134` (forgot), `:158` (resend)
- `support/views/public/support.py:58` (contact)
- `taxonomy/views/public/submissions.py:20`
- `profiles/views/public/profile.py:199` (AFM), `:213` (report)
- `services/views/public/service.py:49` (draft), `:116` (report)

**Result:** login, register, forgot-password, resend-verification, contact, both report endpoints, draft, AFM and taxonomy submission have **no rate limit at all**. The `"common.throttling.ScopedRateThrottle"` entry in `DEFAULT_THROTTLE_CLASSES` (`base.py:240-247`) is inert. The global anon/user throttles (lib D12) still apply to every other view.

The `parse_rate` override itself is fine: `10min`→600, `5s`→5, `30sec`→30.

Context I could not verify: old better-auth's built-in rate limiter (on by default in production, with stricter sign-in rules). `oldnext` has no `node_modules`.

### 0.2 Cron/webhook auth (pass3-blog N1): **CONFIRMED, and wider than reported**
`DEFAULT_AUTHENTICATION_CLASSES` (`base.py:221-229`) is `CookieJWTAuthentication` → `JWTAuthentication` → `ApiKeyAuthentication` → `SessionAuthentication`, with `AUTH_HEADER_TYPES=("Bearer",)` (`:285`). No view sets `authentication_classes` (grep: 0 hits).

How the request dies:
1. DRF `APIView.initial()` calls `perform_authentication` before `check_permissions` and the handler (DRF `views.py:414-416`).
2. simplejwt `authenticate` → `get_raw_token` (Bearer matches) → `get_validated_token` raises `InvalidToken` for any non-JWT string.
3. The request gets a 401 before the view's `CRON_SECRET` comparison runs.

**Live proof (this pass, directly against Django):**
- `GET api-test…/api/cron/process-email-batches` with `Authorization: Bearer notasecret` → `{"error":{"code":"token_not_valid",…}}`.
- `POST api-test…/api/webhooks/revalidate-cache` with `Bearer notasecret` → `token_not_valid`.
- The same POST with no header → `{"error":{"code":"unauthorized","message":"Invalid webhook secret"}}`. This one comes from the view itself.

**Scope:** 4 views, not 3:
- `ProcessEmailBatchesCronView`
- `AutoRefreshCronView`
- `WorldlineRenewalsCronView` (`billing.py:400-424`)
- **`RevalidateWebhookView`** (`core/views/admin/cache.py:44-60`, mounted at `/api/webhooks/revalidate-cache`; missed by N1)

`common/permissions.py:54-68 IsCronOrAdmin` would be dead in the same way if anything used it.

### 0.3 Pre-commit signal race (pass2-caching D4): **CONFIRMED (mechanism); severity LOW-MEDIUM**
- All four receivers purge synchronously in `post_save`/`post_delete`: `profiles/signals.py:18-21`, `services/signals.py:20-36`, `reviews/signals.py:18-28`, `taxonomy/signals.py:14-25`.
- `grep on_commit apps common` gives 0 hits.
- Atomic blocks around saves exist:
  - `service_writes.py:180,248,363,487`: service save, then profile save
  - `review_ops.py:183-193`: review save, then two recalc saves
  - `admin_profiles.py:501,527,547`, `profile_updates.py:431`, `dataset_ops.py:273`, `seed_taxonomy.py:54`
- `canonicalize_taxonomies` runs whole-command atomic.
- `ATOMIC_REQUESTS=False` (`base.py:157`), so only these explicit blocks matter.

**Window size:**
- Request paths: milliseconds (the remaining statements inside the block). A poisoned re-cache needs a concurrent public read of the same key inside that gap.
- Long atomic management commands: certain.

**The taxonomy variant (D3) is the worst case.** The pre-commit `bump_version()` lets a poll build old data under the new ETag, and that state self-perpetuates (0.4/D3). Keep D4 as MEDIUM only for the taxonomy and bulk-command cases. Treat it as LOW for ordinary request paths.

---

## 1. Canonical root-cause groups

| Canonical id | Members | Verdict |
|---|---|---|
| **XC-THROTTLE** (scoped throttles inert) | pass3-profiles-dashboard C1, pass3-lib correction to lib D11, lib D11, pass2-authz D6's "DRF LoginView has a 10/min limit" | CONFIRMED (0.1). Lib D11 **ADJUSTED**: forgot-password has *no* limit (not per-IP 3/10min). Authz D6's comparison is **REFUTED**: the DRF login is unthrottled too |
| **XC-CRONAUTH** (Bearer swallowed by SimpleJWT) | pass3-blog N1, C2, C3; pass2-authz §4 "crons … fail closed", "Django revalidate webhook uses compare_digest" | CONFIRMED, extended to `RevalidateWebhookView` (0.2) |
| **XC-EN** (English backend errors) | lib D3 (root), reviews D3 (backend fallback), reviews D11 (401 text), pass3-reviews N1 (error card), validation D5/D6/D8/D9 ("This field may not be blank." and similar), blog D1 / lib D2 ("Invalid category: …"), blog N5 (generic 500) | CONFIRMED. `LANGUAGE_CODE="en-us"` (`base.py:54`); hard-coded `"One or more fields are invalid."` (`common/exceptions.py:80,133`), `"Too many requests…"` (:57). The "~79 files / 43 of 122 Greek" counts were not re-counted |
| **XC-MAIL-MECH** (email mechanics) | lib D4, blog D6, blog D3 (support), pass3-blog N3 (tags), N6 (text part), C1 (attributes), S-D2 (link base), copy-sweep D1 (bodies) + corrections | Settled one by one in §3 |
| **XC-DEADREVAL** (dead/unused revalidation helpers) | caching D6, blog D10, `RevalidateWebhookView` (XC-CRONAUTH) | CONFIRMED (D6); blog D10 ADJUSTED |
| **XC-TTL** (TTL stacking) | caching D7 | **REFUTED as a defect** under the Addendum (layers/TTLs are intentional design). Keep it only as context for sizing the staleness of real purge gaps |
| **XC-BLOGSLUG** | blog D1, lib D2, pass3-blog C4 | CONFIRMED; fix direction ADJUSTED (§2) |
| **XC-CARDCOV** (service-card coverage source) | reviews D4 (second half), lib D10 | CONFIRMED (same root) |
| **XC-CRONTZ** | blog D8 (time part), lib D13 | CONFIRMED |

---

## 2. Verdict table

### reviews-saved.md

| # | Verdict | Evidence (old ↔ new) |
|---|---|---|
| D1 author name from Profile | CONFIRMED | OLD `review.prisma:19` author→**User**; `get-reviews.ts:29-36`, `get-user-reviews.ts:250-257` select User `name/displayName/username`. NEW `review_reads.py:272-278` takes displayName/username from `author.profile` |
| D2 visibility toasts | CONFIRMED | NEW `actions/reviews/toggle-review-visibility.ts:15` returns a fixed `'Η ορατότητα άλλαξε'`; `:17` returns no `message`; the consumer `recommendations-section.tsx:45` reads `result.message` |
| D3 rating copy | CONFIRMED (XC-EN) | OLD `validations/review.ts:8-14`; NEW `actions/reviews/create-review.ts:13-15` |
| D4 saved card badge + coverage | CONFIRMED (XC-CARDCOV) | NEW `saved_reads.py:83-90` adds `taxonomyLabels.subcategory`; `service-card.tsx:34` prefers subcategory; `:121-123` uses `profile.coverage`; OLD `:121-123` uses `service.type` |
| D5 `/api/saved` PII | CONFIRMED | `saved_reads.py:55-60` → `serialize_profile_summary` (`profile_reads.py:~100-125`: phone, viber, whatsapp, firstName) |
| D6 rounding | CONFIRMED | `node`: `(4.25).toFixed(1)=4.3`, `(1.125).toFixed(2)=1.13`; `python3`: `round(4.25,1)=4.2`, `round(1.125,2)=1.12` (`review_reads.py:29,40`, `recalculate_ratings.py:30,51`) |
| D7 no-services copy | CONFIRMED | `review_ops.py:46-47` vs OLD `create-review.ts:97-98` |
| D8 orphan ids / FKs | **ADJUSTED** | With the Prisma FKs present (pass2-schema C1), `toggle.py:23-27,36-39` swallow `IntegrityError` and return `True`. Result: a false "saved" for a non-existent id, no orphans, and counts stay correct |
| D9 legacy `''` comments | CONFIRMED | OLD `create-review.ts:158` stores the trimmed `''`; NEW `review_reads.py:154,172 .exclude(comment="")` |
| D10 unused-path drift | CONFIRMED | `review_ops.py:142-144` with `service_id=None` gives IS NULL; OLD `create-review.ts:270-276` drops the sid filter |
| D11 minor envelope | CONFIRMED | `views/public/reviews.py:14-19` `int()` gives a 500 on a bad value; `saved.py:14-17` default 20 |

### pass3-reviews-saved.md

| # | Verdict | Evidence |
|---|---|---|
| N1 saved page 400 on bad params | CONFIRMED | `saved/page.tsx:27-30` `parseInt` → `buildUrl` `String(NaN)` (`client.ts:433-436`) → `SavedListQuerySerializer` `min_value=1`, `max_value=100` (`saved.py:14-17`) |
| N2 notifications `"PENDING"` | CONFIRMED | `notifications.py:126` vs `ReviewStatus.PENDING="pending"` (`review.py:27`); swallowed by the `except` at :140 |
| N3 Django-admin bypass | **ADJUSTED** | Plain `ModelAdmin` confirmed (`reviews/admin.py`), so the rating recalc and approval email are skipped. **Refuted sub-claim:** bulk delete *does* fire per-row `post_delete`. Django's Collector disables fast-delete when receivers exist, so the cache purge still runs |
| Correction (D1 scope: public cards + Google name) | CONFIRMED | OLD `lib/auth/config.ts:177 name: profile.name`; same fix |
| Correction (atomic recalc) | CONFIRMED | `review_ops.py:183-193` |

### blog-support-media-crons.md

| # | Verdict | Evidence |
|---|---|---|
| D1 blog slugs | CONFIRMED; **fix ADJUSTED** | FE `blog-categories.ts:20-32` new slugs; BE `blog/constants.py:11-25` old slugs; `articles.py:261,312`. Live test DB holds `marketingk` (re-probed: `tips 7, symvoules 5, anakoinoseis 1, marketingk 1, nea 1`), and `/articles/marketingk` → 404. The DB and the old app agree with the **backend**. The frontend rename is the bug, so revert the FE slugs; don't change the backend |
| D2 digest oldest-15 + subject | CONFIRMED | OLD route `orderBy desc` (`process-email-batches/route.ts:~78`) + template `slice(0,15).reverse()` (`unread-messages.ts:61`); NEW `tasks.py:87-94` `reversed(...)` then `emails.py` `previews[:15]`; subject `emails.py` `"{title} — Doulitsa"` vs OLD `email-config.ts:241-245` |
| D3 support feedback email | CONFIRMED | `support.py:93-106` → generic contact builder, subject `Feedback: {raw enum}`, no reply-to; OLD `email-config.ts:178-186` |
| D4 feedback DB write / validation | CONFIRMED | `support.py:28-35` (6 choices, 20000, URLField); Contact row created before `.delay()` |
| D5 article `updatedAt` | CONFIRMED | `_public_card` (`articles.py:~100-113`) has no `updatedAt`; the page passes it at `[slug]/page.tsx:244` |
| D6 email sender/subject drift | **ADJUSTED** | See §3 E1/E2. The Verification "old subject" is wrong |
| D7 auto-refresh never ran in old | CONFIRMED (code) | OLD `cron/auto-refresh/route.ts:14` exports only `POST`; `vercel.json` cron (Vercel issues GET). Live 405 probe not run (sandbox refused). The same is true of OLD `worldline-renewals/route.ts:42` (billing should note it) |
| D8 schedule TZ / no purge / shape | CONFIRMED (XC-CRONTZ) | `base.py:52,312,327-330`; `services/tasks.py` `.update()` |
| D9 old slug not purged | CONFIRMED | `update_article` assigns the slug (`articles.py:~325`), then `_purge_cache(article.slug…)` (`:361`) and `:375-383` purge only the new slug |
| D10 revalidate webhook | **ADJUSTED** | FE POST fails closed (`route.ts:40-44`). FE GET (`:101-123`) is **identical to OLD** (`old route.ts:101-106`), so it's parity, not a regression. The Django twin is unreachable (XC-CRONAUTH) |
| D11 blog list page≤0 500 | CONFIRMED | `views/public/article.py:17-18` |
| Open Q1 DB slugs | Resolved for TEST | See D1 (prod still UNVERIFIABLE: same query on prod) |
| Open Q2 widget signing | Moot | Every call site passes `signed={false}` (7 FE sites, grep); `media.ts:794` |
| Open Q3 beat DB row | UNVERIFIABLE | Django admin → Periodic tasks: check `billing-process-worldline-renewals` |

### pass3-blog-support-media-crons.md

| # | Verdict | Evidence |
|---|---|---|
| N1 cron Bearer swallowed | CONFIRMED + extended | §0.2 |
| N2 coverImage null dropped | CONFIRMED | `UpdateArticleSerializer.to_internal_value` (`blog/serializers/article.py:98-100`) drops `None`; `update_article` only acts on keys present |
| N3 Brevo tags | CONFIRMED | OLD `brevo/workflows.ts:36-42` `tag = workflow.toString()` (enum values `types.ts:159-183`, e.g. `user_registration`, `contact_admin`); NEW `emails.py:23-38` |
| N4 digest rewrites users row | CONFIRMED | `tasks.py:111-112` → `User.save` hook (`user.py:187-212`) + `updated_at auto_now` (`:92`) |
| N5 dup slug 500 | CONFIRMED; sub-claim ADJUSTED | No `IntegrityError` handling in `articles.py:255-287,305-362` or `common/exceptions.py`. The ">255 slug" half is moot on the restored DB (Prisma columns are TEXT, pass2-schema C3) |
| N6 text part garbled | CONFIRMED | `emails.py` `send_email` body `_TAG_RE.sub("", html)` |
| C1 no Brevo attributes ever sent | CONFIRMED | `workflows.ts:31-64`: the subject/message branch never forwards `data.attributes` |
| C2 / C3 | CONFIRMED | §0.2 |
| C4 test DB slugs | CONFIRMED (re-probed live) | |
| C5 signing endpoint unreachable | CONFIRMED | grep of `signed=` |
| Q3 anymail `sendinblue` alias | UNVERIFIABLE | No local install (`backend/.venv` empty, no lockfile). Live: `python -c "import anymail.backends.sendinblue"` inside the backend container, plus a test send. **If the alias is gone, every email fails silently** (`send_email` catches and logs) |

### lib-shared-sweep.md

| # | Verdict | Evidence |
|---|---|---|
| D1 TZ | CONFIRMED | No `frontend/src/instrumentation.ts`; `frontend/Dockerfile` has no `TZ` (grep 0); `frontend/src` has 0 hits for `Europe/Athens`/`process.env.TZ`. OLD `src/instrumentation.ts:24-34`. Live env: `date` in the frontend container / Dokploy env `TZ` |
| D2 blog slugs | CONFIRMED (XC-BLOGSLUG) | |
| D3 English errors | CONFIRMED (XC-EN) | |
| D4 From/Reply-To | CONFIRMED (§3 E1) | |
| D5 subjects/bodies | **ADJUSTED** (§3 E2/E3) | |
| D6 Brevo env names | CONFIRMED | OLD `types.ts:203-206` (`BREVO_LIST_EMPTYPROFILE/NOSERVICES/PROS`, default 6); NEW `base.py:386-391` (`…EMPTY_PROFILE/NO_SERVICES/ACTIVE_PROS`, default ""); `brevo.py:52-61,277-280` |
| D7 Brevo re-sync gaps | **ADJUSTED** (narrower) | Admin status change from published (`admin_services.py:249-254`) and admin service delete (`:283-297`) **do** re-sync now. Remaining gaps: owner `delete_service`/`archive_service` (`service_writes.py:441-451`, OLD `delete-service.ts:104,197`) and admin profile delete (`admin_profiles.py:309-312`, OLD `admin/profiles.ts:630`) |
| D8 consent/GTM | CONFIRMED (possibly intentional) | `lib/analytics/consent.ts:155-160`. GTM container contents UNVERIFIABLE |
| D9 breadcrumb baseHref | CONFIRMED | OLD `datasets.ts:1552-1562,1720-1730` + callers `get-services.ts:1115`, `get-profiles.ts:742-763`; NEW: 0 `baseHref`; `profile_aggregations.py:456`. Live `/ipiresies/sxediasmos`: old crumb `href="/categories"`, new `href="/ipiresies"` |
| D10 card coverage | CONFIRMED (XC-CARDCOV) | |
| D11 forgot-password limit | **ADJUSTED** (XC-THROTTLE) | No limit at all: `PasswordResetThrottle` is inert, `initiate_password_reset` (`password.py:59-74`) has no cooldown. OLD per-email 1/10min (`forgot-password.ts:28-39`). Severity MEDIUM (mail-bombing). Copy point stands |
| D12 global throttles | CONFIRMED (mechanism) | `base.py:240-252`. The page-500 effect is UNVERIFIABLE without load (doc note cited) |
| D13 cron TZ | CONFIRMED (XC-CRONTZ) | |
| D14 JSON-LD base env | CONFIRMED | NEW `schema/article-schema.tsx:33` `LIVE_URL‖NEXT_PUBLIC_APP_URL`; OLD `BETTER_AUTH_URL‖LIVE_URL` |
| D15 static sitemap additions | CONFIRMED | `sitemap_static.xml/route.ts` lists cookies, politiki-akirosis |
| D16 API-host sitemaps / docs / admin | CONFIRMED (live) | `api-test…/sitemap_index.xml` lists only s/profile/articles; `/api/docs/`, `/api/schema/`, `/django-admin/login/` all return 200 |
| D17 SEO via public endpoints | CONFIRMED | `fetch-entity.ts:70,103`, `pages.ts:580` |
| D18 small diffs | CONFIRMED | sidebar diff (`usePaymentsAccess` gate), `next-link.tsx:84`, `dashboard/page.tsx:8` 60 vs 3600, avatar `referrerPolicy` |
| D19 no fetch timeout | CONFIRMED | `client.ts`: no `signal`/`AbortController` (grep 0) |

### pass3-lib-shared-sweep.md

| # | Verdict | Evidence |
|---|---|---|
| S-D1 refresh 429/5xx clears cookies | CONFIRMED | `client.ts:241-251` (`!res.ok → clearTokens()`), `:390-399`; vs `withTokenRefresh.ts:72-77` (400/401 only); matcher excludes `next-action` (`middleware.ts:20-27`); 60 s poll (`use-unread-count.ts:30`) |
| S-D2 FRONTEND_BASE_URL default | CONFIRMED | `base.py:416`; 0 `LIVE_URL` reads in backend. Env UNVERIFIABLE |
| S-D3 private DJANGO_INTERNAL_URL trap | CONFIRMED | `prod.py` `SECURE_SSL_REDIRECT=True` + `SECURE_PROXY_SSL_HEADER`, `ALLOWED_HOSTS` from env |
| S-D4 RHF/React drift | CONFIRMED (INFO) | `package.json`: old 7.60.0 exact / new `^7.60.0` (installed 7.79.0); react 19.0.1 → 19.2.7 |
| Correction "Dockerfile only adds TZ" (§4) | **REFUTED** | The frontend Dockerfile has no `TZ` line. D1 stands unmitigated |
| Correction SUMMARY `LIVE_URL` | CONFIRMED | |
| Correction D11 (C1) | CONFIRMED | §0.1 |

### pass2-caching-matrix.md (Addendum: only purge gaps count)

| # | Verdict | Evidence |
|---|---|---|
| D1 other service pages not purged | CONFIRMED (purge gap) | OLD service page tagged `collections.services` (`get-service.ts:503`), purged by `revalidateService` (`old revalidation.ts:~64`); NEW `services/signals.py:23-31` own id only; FE `revalidation.ts` `revalidatePublicService(id)` → `service:id` only |
| D2 owner profile (Next) / categories / suggest | CONFIRMED (purge gap) | FE service actions call only `revalidatePublicService` (grep `actions/services/*`); `services:suggest:*` has only a writer (`service_reads.py:880`) |
| D3 maps ETag stuck | CONFIRMED | `maps.py:50-69` reads the version before building, then `cache.set`; `invalidate_maps_cache` deletes + bumps. A stale body under the new ETag → permanent 304s |
| D4 pre-commit signals | CONFIRMED; severity split | §0.3 |
| D5 lru pins fallback | CONFIRMED | `core/taxonomy.py:25-41` (exception → JSON, cached by `lru_cache`); `locations.py:25+` |
| D6 dead tags / unused endpoints | CONFIRMED (XC-DEADREVAL) | `revalidate-taxonomies.ts:37-57` vs the tags actually set (`lib/api/{core,services,profiles,blog}.ts`); no callers of `adminApi.revalidateAll`/`adminTaxonomy.revalidate` |
| D7 TTL stacking | **REFUTED** (XC-TTL, design) | Addendum: layers/TTLs are intentional. Use it only to size D1/D2/known TTL-only gaps |
| D8 count cache-key omissions | CONFIRMED (latent) | `service_reads.py:604-610` (key cat|sub, filters status+subdivision); `profile_aggregations.py:264-287` (`published` not in key) |
| C1 / C2 / C3 | CONFIRMED | tasks don't import `apps.core.taxonomy`; `profile_aggregations.py:549` `-sort_date`; `service_reads.py:261,308` promoted gate |

### pass2-copy-sweep.md

| # | Verdict | Evidence |
|---|---|---|
| D1 email bodies | CONFIRMED with one **refuted** sub-claim | Sign-off (`templates/{verification,welcome,review-approved,service-published}.ts`), reset "1 ώρα" (`password-reset.ts:41,81`) vs `RESET_TOKEN_TTL=1h` (`password.py:21`), new-profile/service-created dates (`new-profile.ts:55`, `service-created.ts:58`), raw category (`tasks.py:231`). **REFUTED:** "empty subject → `[Doulitsa] Επικοινωνία: `". `ContactView` passes `subject or "Επικοινωνία"` (`support.py:77`). The real diff is the fallback word: `Επικοινωνία` vs old `Φόρμα Επικοινωνίας` |
| D2 Cardlink interstitial | CONFIRMED | `billing.py:260-272` vs OLD `worldline/redirect/route.ts:55-78` |
| D3 admin notifications live | CONFIRMED (INFO, improvement) | |
| D4 taxonomy toasts | CONFIRMED (INFO, intentional) | |
| Correction (reset raw link exists) | CONFIRMED | `emails.py _button` |
| Correction (welcome had no text twin) | CONFIRMED, **extended** | Verification and reset had none either: `auth-integration.ts:41-52,93-104,144-156` pass no `text` |

### pass2-routes-urls.md

| # | Verdict | Evidence |
|---|---|---|
| D1 unknown archive slug → 200 | CONFIRMED (live re-probed) | `get-services.ts:177-182` stub; `/ipiresies/zz-nope`, `/categories/zz-nope`: new 200, old 404 |
| D2 old reset links → JSON 404 + manifest | CONFIRMED (live) | `test.doulitsa.gr/api/auth/reset-password/abc123` → 404 JSON with `supported` map |
| D3 Stripe URLs `/dashboard/billing` | CONFIRMED (latent) | `providers.py:180-181`; no `dashboard/billing` route |

### pass2-validation-matrix.md

| # | Verdict | Evidence |
|---|---|---|
| D1 password trim | CONFIRMED | DRF `CharField` `trim_whitespace=True` default; `serializers/auth.py:16,21,47-49,67`, `admin_users.py:87,115`. OLD `getFormString` (`form.ts:14-16`) + `passwordSchema` (`shared.ts:19-21`) don't trim. The NEW FE action doesn't trim either (`actions/auth/login.ts:26`) |
| D2 addons>3 / faq>5 block edits | CONFIRMED (needs DB count) | `services/serializers/service.py:~170-180` max 3/5; edit form re-sends (`form-service-edit.tsx:289`); OLD schemas uncapped (`validations/service.ts:1079-1150`) |
| D3 EmailField looser | CONFIRMED | Django `EmailValidator` (allowlist `localhost`) |
| D4 admin presentation phone | CONFIRMED | `views/admin/profiles.py:252-253` uses `UpdatePresentationSerializer`; OLD `admin/profiles/presentation.ts:72` `presentationSchema` (`profile.ts:329-341`) |
| D5 empty-title draft | CONFIRMED; slug sub-note ADJUSTED | `article.py:42-45,76-79` (no `allow_blank`). The slug >255 "DB error" is moot on TEXT columns (pass2-schema C3) |
| D6 password max 100 | ADJUSTED | NEW cap confirmed. OLD max 128 UNVERIFIABLE (no vendored better-auth) |
| D7 prefix-only URLs | CONFIRMED | `profile_updates.py:237,250` |
| D8 Greek category msg unreachable | CONFIRMED | `profile_updates.py:32-33` (no `blank` message) |
| D9 report blank name | CONFIRMED | `profile_updates.py:261-262` |
| D10 truthiness | CONFIRMED | `profile_updates.py:159-161`, `service.py:204,260` |
| D11 / D12 | CONFIRMED (INFO) | |

### pass2-authz-security.md (items in this cluster)

| # | Verdict | Evidence |
|---|---|---|
| D5 OpenAPI/Swagger/Redoc public | CONFIRMED (live on test) | `config/urls.py:32-36,99`; `SPECTACULAR_SETTINGS` (`base.py:266-277`) has no `SERVE_PERMISSIONS` → AllowAny; `api-test…/api/docs/` and `/api/schema/` return 200. Prod UNVERIFIABLE (same GETs on the prod API host) |
| D6 `/django-admin/` | CONFIRMED (live on test); sub-claim **REFUTED** | `config/urls.py:104`; `user.py:155-168` (`is_staff` admin-like, `has_perm` admin only); no axes/ratelimit. `/django-admin/login/` returns 200. **REFUTED:** "the DRF LoginView has a 10/min limit". It is unthrottled too (XC-THROTTLE), so the main login endpoint has no brute-force limit either |
| §4 "crons … fail closed", "Django revalidate webhook compare_digest" | **ADJUSTED** | True in code, but no Bearer value can ever reach these checks (XC-CRONAUTH, live-proven) |
| Worldline webhooks | Out of this cluster | Cardlink sends no `Authorization: Bearer`, so XC-CRONAUTH doesn't break them. Signature checks are billing's verifier's job |

---

## 3. Email-findings chain: settled

- **E1 From / Reply-To (lib D4, blog D6): CONFIRMED, with a precision.**
  - OLD `EMAIL_CONFIG` mails used `Doulitsa`/`Admin Doulitsa <noreply@doulitsa.gr>`, honoured by `workflows.ts:44-63`. Reply-To was set for CONTACT_ADMIN, CONTACT_CONFIRMATION (`contact@doulitsa.gr`), SERVICE_REPORT, PROFILE_REPORT and SUPPORT_FEEDBACK (`email-config.ts:109,119,139,149,179`).
  - The three **auth** emails went through `auth-integration.ts` with no `from`, so they used `getDefaultSender()`: `BREVO_SENDER_NAME‖'Doulitsa' <BREVO_SENDER_EMAIL‖noreply@doulitsa.gr>` (`brevo/client.ts:20-23`).
  - NEW `emails.py` `send_email` sets neither `from_email` nor `reply_to`, so `DEFAULT_FROM_EMAIL = env BREVO_SENDER_EMAIL` with the default `noreply@example.com` (`base.py:378`).
  - Display name lost unless the env value embeds one: UNVERIFIABLE (check the Dokploy env).
- **E2 Subjects (lib D5 table, blog D6): ADJUSTED.**
  - All rows match the code except **Verification**. The old live subject was **`Επιβεβαίωση λογαριασμού στη Doulitsa`** (`constants/email/templates/index.ts:36`, used by `auth-integration.ts:31-34`). `EMAIL_CONFIG.VERIFICATION` (`email-config.ts:191`, "Επαληθεύστε το email σας - Doulitsa") is dead config with no caller.
  - Welcome and reset subjects are identical in both old configs, so those rows stand.
  - Service/profile report subjects confirmed: `[Doulitsa] Επικοινωνία: Αναφορά υπηρεσίας: {title}` (`services/views/public/service.py:130-136`), `[Doulitsa] Επικοινωνία: Καταγγελία προφίλ: {username}` (`profiles/services/verification.py:95-100`).
- **E3 Bodies (copy-sweep D1, lib D5 body): CONFIRMED,** with the two corrections:
  - The reset link is still present.
  - The contact-subject fallback exists but its wording changed.
  - Also: `\n` in report/feedback messages is interpolated into `<p>`, so line breaks collapse in HTML. This is part of the generic-contact defect.
- **E4 Text part (pass3-blog N6, lib D5 "twins"): CONFIRMED.**
  - Old had twins for every `EMAIL_CONFIG` mail and none for verification/welcome/reset.
  - The new tag-strip is a regression for the former and neutral-to-worse for the latter.
- **E5 Tags (pass3-blog N3): CONFIRMED** (§2).
- **E6 Attributes (messaging D3 / copy-sweep §5 open question): settled by pass3-blog C1, CONFIRMED.** No transactional email ever sent attributes, so "no attributes" is not a regression. The copy-sweep §5 open question is closed.
- **E7 Digest (blog D2):** CONFIRMED.
- **E8 Support feedback (blog D3):** CONFIRMED.
- **E9 Links base (S-D2):** CONFIRMED in code; env UNVERIFIABLE.
- **E10 Transport (anymail `sendinblue` alias):** UNVERIFIABLE; this is the one item that could zero out *all* email.
- **E11 Payment email date:** CONFIRMED raw ISO UTC. `emails.py` sets `when = paid_at or …isoformat()`; old used `toLocaleString('el-GR')` (`subscription-payment.ts:74`).
- **E12 Recipients:** CONFIRMED same. `_admin_email()` resolves to `ADMIN_EMAIL‖contact@doulitsa.gr`. `ADMIN_NOTIFICATION_EMAIL` isn't defined in settings, so it is `""`.

---

## 4. Notes on non-CONFIRMED verdicts (why)

- **Lib D11 / authz D6 login comparison:** both rest on the scoped throttles working. They don't (§0.1).
- **Lib D7:** `admin_services._service_status_hooks` and `delete_service` already call `brevo_state_change`. The finding was written against an older picture of the code.
- **Lib D5 / blog D6 verification subject:** the reporters read `EMAIL_CONFIG`, but the auth path reads `EMAIL_TEMPLATES`.
- **pass3-lib "Dockerfile adds TZ":** `grep TZ frontend/Dockerfile` gives 0 lines.
- **Caching D7:** the Addendum explicitly removes TTL/layer design from scope.
- **Blog D10:** the old GET was the same open-without-secret behaviour.
- **Blog D1 fix direction:** live data and old prod use the old slugs.
- **Reviews D8:** FK constraints exist; the `IntegrityError` swallow turns it into a false-success, not orphan counts.
- **pass3-reviews N3 bulk delete:** Django `QuerySet.delete()` emits per-row signals when receivers are connected.
- **Copy-sweep empty contact subject:** the view supplies a fallback.
- **Validation D5/N5 slug length:** restored Prisma columns are TEXT (pass2-schema C3). The only live way to confirm is `\d blog_articles` on prod.
- **Validation D6:** the old 128 cap can't be confirmed without better-auth sources.

## 5. Live checks still owed
1. Prod `blog_articles."categorySlug"` distribution (XC-BLOGSLUG fix direction on prod).
2. `import anymail.backends.sendinblue` in the backend container, plus one real send (E10).
3. Dokploy env: `BREVO_SENDER_EMAIL` (display name?), `FRONTEND_BASE_URL`, `ADMIN_EMAIL`, `BREVO_LIST_*` names, frontend `TZ`, `LIVE_URL`.
4. Is celery-beat deployed on prod? With XC-CRONAUTH it is the only trigger for digests and auto-refresh. Check the Periodic-tasks rows for a stale `billing-process-worldline-renewals`.
5. Prod API host: `/api/docs/`, `/api/schema/`, `/django-admin/` reachability (authz D5/D6).
6. DB counts: services with >3 addons or >5 FAQs (validation D2); the Google-name drift query (pass3-reviews §6).
