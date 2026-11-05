> **SUPERSEDED (2026-11-05):** this was the pass-1 summary. The verified,
> consolidated document is **MASTER-FINDINGS.md** in this folder (122 canonical
> fixes from 6 passes incl. live E2E). Some findings below were later adjusted
> or refuted — do not work from this file. NOTE: the env var named `LIVE_URL`
> below is wrong; the backend reads `FRONTEND_BASE_URL`.

# Full Parity Audit — SUMMARY (2026-11-05)

11 domain reports in this folder, ~199 documented differences vs the old
production app. Each item below cites its report (file → finding id) — the
reports carry file:line detail on both sides, enough to write the fix
directly. Old app = source of truth; intentional changes were excluded.

Reports: auth-accounts.md, profiles-dashboard.md, profiles-public-archives.md,
services.md, home-search-taxonomy.md, reviews-saved.md, messaging.md,
billing-payments.md, admin.md, blog-support-media-crons.md, lib-shared-sweep.md.

---

## P0 — CRITICAL (fix before anything else)

1. **Second paying customer breaks payments.** First successful payment writes
   the merchant MID into UNIQUE `provider_customer_id`; the next different
   customer's webhook 500s — money taken, subscription stays incomplete, all
   their future renewal notices 404. → billing-payments.md D1
2. **Admin user-detail page crashes** (payload shape) → ban/delete/sessions/
   account editing all unreachable. → admin.md D1
3. **Admin service edit WIPES data** — detail payload lacks description/
   addons/faq; forms open empty and save `[]` over real data. → admin.md D2
4. **Admin profile "additional info" save WIPES the other fields** (same
   pattern). → admin.md D3
5. **"Revoke all sessions" doesn't revoke JWTs** (helper exists, not called).
   → admin.md D4

## P0b — Privacy/data exposure (public API leaks)

6. **`serialize_profile_summary` leaks phone/viber/whatsapp/first+last name/
   socials regardless of visibility settings**, via public `/api/home`
   (featured profiles), `/api/saved`, `profiles/by-username`; the profile
   page endpoint also always returns emails. ONE root fix covers all.
   → profiles-public-archives.md D3, reviews-saved.md D5,
   home-search-taxonomy.md D4
7. **Unpublished services exposed:** public `/api/services/search` + `/count`
   accept `status: "draft"|...` and return everyone's drafts with full
   content. → services.md D1

## P1 — HIGH (user-visible breakage)

Auth flow:
8. Email-verification link no longer logs the user in → bounced to /login;
   expired link page has no resend. → auth-accounts.md D1
9. Broken pro accounts (role=user, old Google bug) can't finish onboarding
   (403, English); the old safeguards that prevented/repaired them are gone.
   → auth-accounts.md D2 (+D3)
10. `confirmed=false` (or expired-ban) users log in but every request treats
    them as logged out → silent /login loop. Needs prod count check.
    → auth-accounts.md D4

Archives/search/SEO:
11. Subcategory pills on /dir (no category selected) link to broken
    `/dir/<sub>` URLs → empty pages. → profiles-public-archives.md D1
12. Filter dropdowns capped: profile subcategories top-10, service
    subdivisions top-8 — deeper taxa unpickable; on those pages filters die.
    → profiles-public-archives.md D2, services.md D4
13. ALL of Μάρκετινγκ (8 subs, 42 subdivisions) missing from search
    suggestions (category/subcategory index bug). → home-search-taxonomy.md D1
14. Archive `?search=` term lost from filter state/URL on next filter change.
    → services.md D3
15. Every service page's meta description + JSON-LD broken (`" -  - …"`).
    → services.md D5
16. Draft service save fails by default (duration 0 vs min 1). → services.md D2

Platform:
17. Server timezone is UTC (old forced Europe/Athens) → timestamps 2–3h off,
    dates can show previous day. Also fixable via `TZ` env. → lib-shared-sweep.md D1
18. Blog category slugs frontend↔backend mismatch (5 renamed) → admin can't
    save articles in them; old URLs 404. Check DB rows too.
    → blog-support-media-crons.md D1, lib-shared-sweep.md D2
19. AFM lookup (Πιστοποίηση) likely fails for every AFM (wrong
    `afm_called_by`, AADE errors unread). Needs live test.
    → profiles-dashboard.md D1
20. Payments env/featured: `PAYMENTS_TEST_MODE` default-true on Django (prod
    must set false; frontend/back gates can disagree); featured flag set via
    queryset `.update()` skips cache purge (up to 2h invisible); webhook
    Next-proxy drops User-Agent → Cardlink server confirmations may be
    mishandled. → billing-payments.md D2, D4, D3
21. Admin: create-service-for-profile stuck at step 2; duplicate "published"
    emails; taxonomy re-parenting silently ignored. → admin.md D5, D6, D7

## P2 — MEDIUM clusters (one fix each, many symptoms)

- **English instead of Greek everywhere:** DRF `LANGUAGE_CODE`, generic
  "One or more fields are invalid.", throttle texts, ~80 hardcoded strings,
  actions passing `err.message` through. → lib-shared-sweep.md D3,
  auth-accounts.md D12-14, services.md D6, profiles-dashboard.md D3
- **Email regressions:** changed subjects (~10), lost Reply-To + sender
  display names, support/report emails genericized (no user info/admin
  links), unread digest shows 15 OLDEST + wrong subject, possible double
  welcome email, payment email raw UTC date. → lib-shared-sweep.md D4-D5,
  blog-support-media-crons.md D2-D3/D6, messaging.md D3, auth-accounts.md D18
- **Brevo breakage:** env var names changed (3 of 4 lists silently unset if
  old env copied) + missing re-syncs on service/profile delete/unpublish.
  → lib-shared-sweep.md D6-D7, services.md D9
- **Cache purge gaps:** profile edit doesn't purge the pro's service pages
  (~35' stale); taxonomy submission approve purge is a no-op (`*` keys);
  taxonomy live-refresh misses pro-subcategory/location caches.
  → profiles-dashboard.md D2, home-search-taxonomy.md D5-D6, admin.md D13
- **Review/author names:** blank author in dashboard Συστάσεις (simple users
  have no Profile row); same in admin review views. → reviews-saved.md D1,
  admin.md D16
- **Wrong data on cards:** service card online/onbase/onsite read from
  profile coverage instead of service type; saved badge shows subcategory.
  → services.md D11, reviews-saved.md D4, lib-shared-sweep.md D10
- **Error-swallowing actions:** taxonomy submissions + skill proposal always
  show generic "Σφάλμα κατά την υποβολή"; resend-verification returns 200
  with hidden error; review visibility toasts generic.
  → home-search-taxonomy.md D2, profiles-dashboard.md D6,
  auth-accounts.md D15, reviews-saved.md D2
- **Throttling risks:** global anon 100/5s shared by container IP can 500
  public pages; forgot-password re-keyed per-IP; submission throttle counts
  failures. → lib-shared-sweep.md D12/D11, home-search-taxonomy.md D3
- Full MEDIUM/LOW lists live in each report (§3).

## Product decisions needed (not bugs, but behavior changes)

- Auto-refresh cron NEVER ran on old prod (GET/405 bug) — now it really runs
  nightly and reorders listings. Keep? → blog-support-media-crons.md D7,
  services.md D12
- Featured shuffle only on default sort now. → profiles-public-archives.md D6
- Password min length 8→6; session idle 7d→3d. → auth-accounts.md D6, D16
- GTM only after opt-in (check GTM container for CookieFirst double banner).
  → lib-shared-sweep.md D8
- Gross vs net amount shown in admin "Χρέωση". → billing-payments.md D8

## Live env / DB checks (can't be verified from the repo)

On production Dokploy (backend): `PAYMENTS_TEST_MODE=false`?, `TZ`, `DEBUG`
off, `BREVO_LIST_*` (NEW names), `BREVO_SENDER_EMAIL` (+display name),
`LIVE_URL`, `ADMIN_EMAIL`. In Django admin → Periodic tasks: is an OLD
worldline-renewals beat row still enabled (double-billing risk)? In DB:
blog `categorySlug` values migrated?, count of `confirmed=false` users,
`verifications.afm` column type, two-profiles-paid check for P0 #1.
At Cardlink: does the confirm URL hit the Next proxy or Django directly?
