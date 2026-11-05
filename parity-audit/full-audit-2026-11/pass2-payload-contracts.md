# Payload-contract parity audit (pass 2) — 2026-11-05

Scope: data-shape contracts between the copied OLD components/pages and the
Django payloads that now feed them, plus read-modify-write hazards in forms.
Method: for every read path, list the keys the consumer reads (including deep
paths and `.map`/`.slice`/`.length` calls), then check each key in the Django
selector/serializer output. For every form, check that the GET payload carries
every field the PATCH/PUT writes back.

Dedupe: every candidate was checked against SUMMARY.md and the 11 pass-1
reports. Only new findings are listed. Most contracts outside admin are now
correct; the many fix comments in the new actions show that earlier shape
bugs were already patched. The two new findings come from pages where OLD
called Prisma directly inside the page or used the Better-Auth session object.
Pass 1 diffed actions, so these were missed.

No code was changed. No git commands were run.

## 1. Coverage

### OLD files read
- `src/actions/profiles/get-profile.ts`: profile page bundle, `transformProfileService`, visibility and coverage defaults.
- `src/actions/services/get-service.ts`: service page bundle, related and additional cards.
- `src/lib/database/selects/service.ts`: `SERVICE_DETAIL_SELECT`, the profile fields on the service page.
- `src/actions/reviews/get-reviews.ts`: review card author shape.
- `src/actions/services/get-recent-services.ts`: sidebar recent services.
- `src/actions/profiles/presentation.ts`: owner contact-details write semantics.
- `src/actions/services/update-service.ts`: `subscriptionType` and `duration` write handling.
- `src/actions/taxonomy-submission.ts`: pending skill/tag shape.
- `src/actions/subscription/toggle-featured-service.ts`: error texts.
- `src/lib/seo/fetch-entity.ts`: profile case.
- `src/lib/prisma/schema/user.prisma`: User and Profile columns.
- `src/lib/prisma/schema/service.prisma`: media and pid.
- `src/lib/auth/config.ts`: session config.
- `src/components/shared/service-media-card.tsx`
- `src/components/service/service-contact.tsx`
- `src/components/profile/menu-user.tsx`
- `src/components/dashboard/dashboard-content.tsx`
- `src/components/dashboard/no-service-dialog.tsx`
- `src/components/dashboard/dashboard-sidebar.tsx`
- `src/components/admin/article-form.tsx`
- `src/components/admin/admin-articles-data-table.tsx`
- `src/components/admin/forms/edit-service-media-form.tsx`
- `src/app/(profile)/profile/[username]/page.tsx`
- `src/app/(service)/s/[slug]/page.tsx`
- `src/app/(admin)/admin/articles/create/page.tsx`
- `src/app/(admin)/admin/articles/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/messages/[chatId]/page.tsx`
- Every file that imports `@/lib/prisma/client` from `app/`, `components/` or `lib/` was enumerated. That list is how the two new findings were found.

### NEW files read: frontend (consumer side, fields read)
- Session and profile:
  - `actions/auth/server.ts` (`getCurrentUser`)
  - `lib/types/auth.ts`
  - `lib/api/{auth,profiles,services,billing,messaging}.ts`
- Dashboard profile pages: `basic`, `additional`, `contact-details`, `coverage`, `verification`, `account`.
- Profile forms:
  - `form-basic-info`, `form-additional-info`, `form-presentation-info`
  - `form-coverage`, `form-billing`, `form-portfolio`
  - `form-account`, `form-verification`, `verification-status`
  - `form-onboarding`, `profile-sidebar`
- Dashboard home:
  - `dashboard-content.tsx`, `no-service-dialog.tsx`
  - `dashboard-nav-services.tsx`, `dashboard-sidebar.tsx`, `dashboard-nav-user.tsx`
- Services dashboard:
  - `services/(list)/page.tsx`, `service-table.tsx`
  - `services/edit/[id]/page.tsx`, `services/create/page.tsx`
  - `form-service-edit`, `form-service-edit-media`, `form-service-delete`, `form-service-create`
  - `featured-star-button.tsx`
  - `actions/services/{get-user-services,get-service,update-service,get-recent-services,get-categories}.ts`
- Profile page:
  - `(profile)/profile/[username]/page.tsx`
  - `actions/profiles/get-profile.ts`
  - `components/profile/{profile-services,profile-info,profile-meta,profile-metrics}.tsx`
  - `shared/service-media-card.tsx`
- Service page:
  - `(service)/s/[slug]/page.tsx`
  - `components/service/service-contact.tsx`
  - `lib/taxonomies/enrich.ts`
- Cards: `shared/service-card.tsx`, `archives/archive-profile-card.tsx`, `archives/archive-service-card.tsx`.
- Reviews:
  - `components/review/*`
  - `components/dashboard/reviews/*` (all card and section files)
  - `actions/reviews/get-user-reviews.ts`, `lib/types/reviews.ts`
- Billing:
  - `dashboard/promote/page.tsx`, `promote/subscription-management.tsx`
  - `dashboard/checkout/page.tsx`
  - `actions/subscription/{get-subscription,toggle-featured-service}.ts`
  - `components/subscription/payment-attempts-list.tsx`
  - `lib/subscription/feature-gate.ts`
- Messaging:
  - `actions/messages/{chats,messages}.ts`
  - `components/messages/start-chat-dialog.tsx`, `chat-messages.tsx` (Date usage)
  - `lib/hooks/chat/*`, `lib/hooks/use-unread-count.ts`
- Saved: `actions/saved/{get-saved-state,toggle-save,get-saved-items}.ts`.
- Other:
  - `actions/taxonomy-submission.ts`, `actions/profiles/{verification,lookup-afm,presentation}.ts`
  - `lib/seo/{fetch-entity,get-entity-values,pages}.ts`
  - `lib/taxonomies/index.ts` (maps loader)
  - `components/ui/lazy-combobox.tsx`
  - `lib/utils/form.ts` (`populateFormData`)
  - `components/blog/author-box.tsx`
- Admin:
  - `app/(admin)/admin/articles/{create,[id]}/page.tsx`
  - `components/admin/{article-form,admin-articles-data-table,admin-articles-table-section}.tsx`
  - `actions/blog/manage-articles.ts`
  - `profiles/[id]/page.tsx`, `forms/edit-profile-settings-form.tsx`
  - `services/[id]/page.tsx`, `forms/edit-service-*.tsx` (field reads)
  - `verifications/[id]/page.tsx`, `subscriptions/[id]/page.tsx`
  - `taxonomies/service/[id]/page.tsx`

### NEW files read: backend (producer side)
- `apps/profiles/selectors/profile_reads.py`:
  - `serialize_profile_summary`, `serialize_profile_card`, `serialize_profile_owner`
- `apps/profiles/selectors/profile_aggregations.py`:
  - `profile_page_bundle`, `_brief_service`, `_calculated_experience`
- `apps/profiles/views/public/profile.py`: owner PATCH views and the presentation GET.
- `apps/profiles/services/profile_updates.py`:
  - `update_basic_info`, `update_additional_info`, `update_presentation`
- `apps/profiles/services/verification.py`: `get_verification_status`.
- `apps/profiles/services/afm_lookup.py`
- `apps/profiles/services/admin_profiles.py`:
  - `_admin_profile_row`, `get_profile_detail`, `search_profiles_for_selection`, `_verification_row`
- `apps/profiles/views/admin/profiles.py`: search and settings views.
- `apps/profiles/models/profile.py`
- `apps/services/selectors/service_reads.py`:
  - `_card`, `_edit_card`, `get_service_page_bundle`
  - `get_user_services_dashboard`, `_dashboard_card`, `get_user_services_stats`
  - `get_recent_services_for_user`, `get_categories_page`, `get_archive_bundle`
- `apps/services/views/public/service.py`
- `apps/services/services/admin_services.py`: `_admin_row`, `get_service_detail`.
- `apps/services/models/service.py`
- `apps/reviews/selectors/review_reads.py`
- `apps/billing/views/public/billing.py`
- `apps/billing/services/subscription_ops.py`:
  - `get_for_user`, `_row`, `_attempt_row`, `list_payment_attempts_for_user`, `toggle_featured_service`
- `apps/messaging/views/public/chats.py`, `apps/messaging/services/chat_ops.py`:
  - `total_unread`, `recent_unread_messages`, `get_or_create_dm`
- `apps/taxonomy/services/submissions.py`: `list_my_submissions`.
- `apps/taxonomy/services/maps_builder.py`
- `apps/taxonomy/services/dataset_ops.py`: node create and update, `raw` write-through.
- `apps/taxonomy/views/public/maps.py`
- `apps/blog/services/articles.py`: `_public_card`, `_detail_authors_of`, `_admin_card`, `get_admin`, create and update.
- `apps/blog/serializers/article.py`
- `apps/accounts/selectors/users.py`: `serialize_session_user`.
- `apps/accounts/views/public/account.py`: `SessionView`.
- `config/settings/base.py`: `SIMPLE_JWT` lifetimes.

### Delegated elsewhere
None new. Everything already reported in pass 1 was skipped; see the dedupe notes in §4.

## 2. Mapping (consumer → producer, the contracts checked)

| Consumer (frontend) | Producer (Django) | Result |
|---|---|---|
| Dashboard profile forms (`initialProfile`) via `getCurrentUser` | `GET /profiles/me` → `serialize_profile_owner` | all form keys present; `email` missing (already profiles-dashboard D10) |
| `initialUser` (all forms, headers, nav) | `GET /auth/session` → `serialize_session_user` | all keys read are present |
| `session.id` (NoServiceDialog) | `SessionView` → `{"id": <access-token jti>}` | **D2** |
| Verification page | `get_verification_status` | match |
| Dashboard home stats/chats | `/services/me/stats`, `/reviews/me/received/total`, `/chats` | match |
| Services list table | `get_user_services_dashboard` / `_dashboard_card` | match |
| Service edit forms | `/services/{id}/edit` → `_edit_card` (unwrapped by page) | every field in form-service-edit:155-181 present |
| Service create (coverage gating) | owner `coverage` raw JSON | match |
| Profile page | `profile_page_bundle` + FE enrichment | match (services/visibility defaults behave the same, see §4) |
| Service page + ServiceContact | `get_service_page_bundle` (`serialize_profile_summary` as `service.profile`) | superset of `SERVICE_DETAIL_SELECT.profile` |
| Review cards / stats | `review_reads._card`, `get_*_review_stats` | match (author issue = reviews-saved D1) |
| Promote / checkout / payment history | `get_for_user` → `_row`, `_attempt_row` | match |
| Featured star | `toggle_featured_service` → `{featured}` | match (copy = billing D5) |
| Pending skills/tags | `list_my_submissions` | match |
| AFM lookup → billing form | `afm_lookup` (verbatim AADE keys) | match |
| Unread count hook | `total_unread` → int | match |
| Start chat dialog | `get_or_create_dm` → `{chatId,isNew}` | match |
| Admin article editor author picker | `GET /admin/profiles/search?searchQuery=` | **D1** |
| Admin article editor initial data | `get_admin` → `_admin_card` + content | match (`authors[].profileId` present) |
| Admin verification/subscription detail | `_verification_row`, `_row` | match |

## 3. DIFFERENCES (new in pass 2)

### D1. Admin article create/edit: the "Συγγραφείς" author picker is always empty, so authors cannot be assigned or changed — HIGH
- OLD:
  - Both pages load every published profile directly with Prisma, ordered by name: `prisma.profile.findMany({ where: { published: true }, select: {id, displayName, username, email, image}, orderBy: { displayName: 'asc' } })`.
  - Create page: `oldnext/src/app/(admin)/admin/articles/create/page.tsx:16-26`. Edit page: `oldnext/src/app/(admin)/admin/articles/[id]/page.tsx:28-38`.
  - The result feeds `profileOptions` into `ArticleForm`.
- NEW:
  - Both pages call `adminProfiles.search('')`: `frontend/src/app/(admin)/admin/articles/create/page.tsx:28` and `[id]/page.tsx:33`.
  - The comment at `create/page.tsx:16-18` says "Use the existing admin profile-search endpoint with an empty query => returns up to 50 published profiles". That is wrong. The endpoint is `GET /api/admin/profiles/search` → `search_profiles_for_selection`, and for an empty query it returns `[]` (`backend/apps/profiles/services/admin_profiles.py:316-321`):
    ```python
    query = (query or "").strip()
    if len(query) < 2:
        return []
    ```
  - So `profileOptions` is always `[]`.
  - The picker is `LazyCombobox` with `options={profileOptions}` (`frontend/src/components/admin/article-form.tsx:337-346`). It only filters its local `options`; it has no remote-search prop (`components/ui/lazy-combobox.tsx` props).
  - Selected chips are resolved through `effectiveOptions.filter(...)` (`lazy-combobox.tsx:309-311`), so existing authors are not shown either.
  - Add and remove both rebuild the selection from `effectiveOptions` (`lazy-combobox.tsx:320-343`), so with no options nothing can be added or removed.
  - Even with a non-empty query the endpoint would differ from old: it is capped at 50, limited to `user.role in (freelancer, company)` instead of `published=true`, and does not filter on published (`admin_profiles.py:322-331`).
- Impact:
  - Editors cannot set authors on new articles. Published articles get no AuthorBox for the real writer.
  - On existing articles, the editor shows an empty author field. The stored ids stay in the form value (`article-form.tsx:128`), so saving keeps them (no data loss), but they cannot be changed.
- Fix hint: add an admin endpoint (or an `all=1` mode) that returns all published profiles `{id, displayName, username, email, image}` ordered by `display_name`, and use it on both pages. Alternatively, wire LazyCombobox to a remote search, but old was a full preloaded list.
- Possibly intentional?: no. The code comment shows the author expected a non-empty list.

### D2. Dashboard "create your first service" dialog comes back about every 15 minutes after "Αργότερα" — LOW/MEDIUM
- OLD:
  - `NoServiceDialog` stores its dismissal in `sessionStorage` under `no-service-dialog-dismissed-<sessionId>` (`oldnext/src/components/dashboard/no-service-dialog.tsx:25-39`).
  - `sessionId` is `userResult.data.session?.id` (`oldnext/src/components/dashboard/dashboard-content.tsx:261`), the Better-Auth session row id. That id is stable for the whole login.
  - So "Αργότερα" hides the dialog for the rest of the tab session.
- NEW:
  - Same component and same call (`frontend/src/components/dashboard/dashboard-content.tsx:271`). The only change is what `session.id` is.
  - Django `SessionView` returns `"session": {"id": request.auth.payload.get("jti")}` (`backend/apps/accounts/views/public/account.py:52-58`). That is the access token's `jti`.
  - Access tokens live 15 minutes (`backend/config/settings/base.py:280`, `SIMPLE_JWT_ACCESS_LIFETIME_MINUTES` default 15). Every refresh mints a new `jti`, so the storage key changes.
- Impact: a pro with no services who clicks "Αργότερα" sees the modal again on `/dashboard` after the next token refresh, typically every ~15 minutes in the same tab. Old showed it once per tab session.
- Fix hint: return a stable id in `SessionView`, for example the refresh-token family or `OutstandingToken` id, or the user id plus login time. Or key the dialog on `user.id`.
- Possibly intentional?: no. It is a side effect of the auth swap; the contract key `session.id` kept its name but changed meaning.

## 4. Confirmed same (contracts verified field by field)
- **Owner profile payload:** `serialize_profile_owner` has every key the dashboard forms read: tagline, bio, category, subcategory, skills, speciality, coverage, portfolio, phone, website, viber, whatsapp, visibility, socials, rate, commencement, experience, contactMethods, paymentMethods, settlementMethods, budget, terms, billing, id and username. Only `email` is missing, already reported as profiles-dashboard D10.
- **Owner write semantics:** `update_presentation` and `update_additional_info` write every field unconditionally, so blanks clear them, like old `presentation.ts:100-115`. The user-side dashboard does not have admin D10. `update_basic_info` keeps coverage and image out of the write, like old.
- **Service edit:** `_edit_card` carries every field `form-service-edit.tsx:155-181` reads. The page unwraps `{service}`. `populateFormData` still sends empty arrays (`'[]'`), so clearing addons, faq or tags works. `subscriptionType` is only written when present, in both old and new.
- **Service page:** `service.profile` (`serialize_profile_summary`) is a superset of old `SERVICE_DETAIL_SELECT.profile`, including terms, rate, commencement, experience, socials, website, firstName/lastName and portfolio. Related and additional cards carry the same profile subset as old.
- **Profile page:**
  - The `_brief_service` cards have no `profile`. Old cards had a profile without `portfolio`, so in both stacks `ServiceMediaCard` has no portfolio fallback.
  - `visibility` defaults to `{}` instead of `{email:false, phone:true, address:true}`, but the only reader is `visibility?.email === true` (`profile-info.tsx:165`), so the result is the same.
  - `reviewStats` keys (`totalReviews`, `averageRating`) match.
- **No taxonomy collisions:** no pro taxonomy id collides with a service id or slug in `maps.generated.json`. The profile page's service-first resolution order therefore gives the same labels as old `findProById`.
- **Session payload:** has every `user.*` key read outside admin (role, username, step, id, email, type, displayName, name, image, emailVerified, banned, blocked, confirmed, banExpires, banReason, provider, createdAt, testUser, lastUsernameChangeAt).
- **Billing:** subscription `_row`, payment-attempt rows, toggle-featured `{featured}`, AFM lookup keys, verification status and pending submissions all match their consumers.
- **Messaging:** list rows and realtime payloads are normalised to `Date` before any `.toISOString()` call. The unread total is a plain int. `getOrCreateDm` returns `{chatId,isNew}`.
- **No DecimalField:** no Django model uses `DecimalField`, so no numeric field arrives as a string.
- **Taxonomy maps overlay:** `build_maps` only overlays keys already present in `raw`, but admin `update_taxonomy_item` writes the edited keys into `raw` (`dataset_ops.py:258-262`). Admin edits of image, featured, icon or plural therefore do propagate; this is not a new bug. Children drift is home-search-taxonomy D15.
- **Pass-1 findings re-confirmed in code:** profiles-dashboard D10, reviews-saved D1/D4/D5, services D5/D11, admin D2/D3/D5/D9. No pass-1 finding in this cut was proven wrong, so there is no Corrections section.

## 5. Open questions / couldn't verify
- D2 assumes the frontend refreshes the access token, and so gets a new `jti`, while the tab stays open. The refresh lives in the Next middleware/client. Worth confirming in a browser that the dialog reappears after about 15 minutes.
- D1: confirm in the DB that some articles have authors whose profiles are not `freelancer`/`company`, for example the `doulitsa` house account. Even after a fix that uses the role-filtered search, those authors could not be re-selected.
