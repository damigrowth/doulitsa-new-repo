# Fix campaign plan — 2026-11-05

Source of truth: MASTER-FINDINGS.md (+ §7 addendum, SERVER-CHECKS-RESULTS.md).

## FROZEN by the user — DO NOT TOUCH
- Everything under `backend/apps/billing/` and the payment/checkout/promote
  flows (P0-1 MID fix, server-side checkout gate, BILL-G1/G2, Cardlink proxy,
  renewals route/cron, worldline parsing P3-B*, billing emails).
- The worldline-renewals leg of XC-CRONAUTH: fixing cron auth must SKIP the
  renewals view (fix-order trap §0.3-13). Only auto-refresh, email-batches
  and revalidate-cache views get the auth fix.
- Admin profile BILLING-DETAILS form null-vs-'' (pass3-admin D1) is ALLOWED —
  it is invoice-details data plumbing in profiles, not payment processing.

## Batches (disjoint file ownership; every fix re-verified against CURRENT code first)

### B1 backend-auth (apps/accounts, common/authentication, common/throttling)
P0-2 oauth-setup accepts simple users (+ unstick SQL note); A-D1/A-D15 shared
root cause `exc.default_code`→`exc.code` + verify-email logs the user in +
failed-link → resend page; AUTH-G4 is_active/confirmed/ban_expires semantics;
SM-D1 google login must not force confirmed=True; SM-D2 User.save hook must
not override admin edits; VM-D1 trim_whitespace=False on 7 password fields;
XC-THROTTLE per MASTER THR-1 (parity: old had NO limit on login/register/
resend — restore forgot-password per-email 1/10min only, make scoped
throttles real where a limit is parity); AZ-D1 api-key auth out of defaults
(+ scoping per MASTER); AZ-D3 support cannot modify admins; P5-BR-2 implement
cleanup_expired_pending_registrations task; D5 username-change atomicity.

### B2 backend-content (apps/profiles, services, core/taxonomy, core/locations, apps/reviews, apps/saved, apps/messaging non-billing)
PRIV-1 public serializer email/name gating; AUTHZ-PUB published=True forced
on public profile search/count + service search/count status override
(P1-2/P1-3); CG-1 level-aware taxonomy resolution (backend half); CG-2 tag
search id expansion; CG-3 area→county resolver + unresolvable→ignore; AFM-1
(3 bugs incl. result unwrap per live WSDL); LOC-1 port old location-name
lookup + renormalize the 1 affected row (management command or note); DROP-1
full subcategory/subdivision lists; P2-38 validate enum/int query params
(all 6+ sites incl. services ?page/?limit); counts cache keys include
status/published; CACHE-1 profile-signal purges owner service pages +
transaction.on_commit on all 4 signal modules; review author name from User
row (rev D1 + public cards); admin notifications PENDING casing; saved list
query defaults instead of 400; messaging read-event badge clear (msg D1),
chat-name keying bug (MSG-NAME), D2 chat guards parity.

### B3 frontend (src/lib, src/actions non-billing, src/components, src/app)
useSession shared store + stable refetch (fixes P5-CS-1..5 + NoServiceDialog
jti) with the login-form loop guard; P1-15 archive search term kept in state/
URL; P1-16 service SEO description resolution; CG-1 frontend half (enrich via
findTaxonomyBySubcategorySlug + top-level category lookup + notFound());
soft-404 → real 404 status; P1-22 revert the 5 blog category slugs (frontend
constants + any links); error/message plumbing cluster (taxonomy submission,
skill proposal, review-visibility toast, resend-verification UI, login
?error param, admin chat notFound P5-DU-1); P1-12 pills built as
/dir/<cat>/<sub>; PLURAL-1 plural labels where old used them; dead
revalidate helpers retagged (XC-DEADREVAL); sitemaps revalidate (P5-RW-2)
and home static regen (P5-RW-1) per MASTER; W2/W1 fixes; NEW-1 purge order
in admin user actions; P5-CS-6 ws close guard.

### B4 admin payload+wipe (frontend admin actions/pages + backend admin serializers/views, NO billing endpoints)
P0-3 user-detail payload/page contract; P0-4 service-edit detail returns
description/addons/faq (and form merge semantics); P0-5 profile
additional-info detail returns all fields; P0-6 revoke uses
revoke_all_for_user; author picker empty-query search; adm D5 coverage in
profile search; D8 category labels; D10 clearable contact fields; D12
toasts/profile avatar sync; D14 chat table authors/sort; adm D16; pass3-adm
D1 billing-details ''-vs-null; D2 chat column sort precedence; D3 Athens
midnight for "today" stats; admin article cover-image removal (N2) +
duplicate-slug 500 (N5).

### B5 emails/crons/platform (backend emails, tasks, config; frontend none)
TZ Europe/Athens (backend container env/settings note + the explicit UTC
date sites: refresh quota, admin stats — coordinate with B4 D3); cron-auth
fix on the 3 non-billing views ONLY; email mechanics cluster: sender name +
Reply-To, subject table restored, digest newest-15 + subject + no user-row
touch, plain-text alternatives, admin emails restored content (incl. raw
category id), double-welcome removed, FRONTEND_BASE_URL default →
https://doulitsa.gr fallback like old; BREVO_LIST_* env names accept BOTH
old and new names; Brevo re-syncs on owner delete/archive + admin profile
delete; blog D9 slug-rename purge; P5-BR items: digest run lock, enqueue
except logging, channels_routing bare except, zeep client reuse+timeout,
CookieJWTAuthentication only auth-errors → anonymous.

## Rules for every batch
- NEVER touch frozen areas. NEVER git commit/push — leave changes in the
  working tree, report files touched.
- Re-verify each finding against CURRENT code before patching (user made
  improvements; if already fixed, mark SKIPPED-ALREADY-FIXED).
- Old app = parity reference (oldnext/). Match old behavior unless MASTER
  marks the item product-decision or intentional.
- Verification per batch: backend `python manage.py check` + targeted shell
  tests in the running docker stack (localhost:8800); frontend
  `corepack yarn tsc --noEmit` + `corepack yarn lint`; after all batches: a
  full `yarn build` + `git checkout -- frontend/src/lib/taxonomies/maps.generated.json*`.
- Product-decision items (§5) and frozen items: SKIP, list them.
