# FIX TRACKER — live status (updated by the orchestrator as batches land)

Legend: ⏳ in progress · ✅ fixed+verified · ☑️ already fixed (found done) ·
⏭️ skipped (reason) · ⛔ blocked · ❄️ FROZEN by user (payments)
Batch reports with evidence: fixes-B1..B5.md in this folder.

## P0 CRITICAL
| Id | Fix | Batch | Status |
|---|---|---|---|
| P0-1 | provider_customer_id MID write + Q0c cleanup | — | ❄️ frozen (payments) |
| P0-2 | OAuth setup accepts simple users (+unstick 4 users) | B1 | ✅ (B1, 40/40 tests; stuck user unstuck live) |
| P0-3 | Admin user-detail payload/page crash | B4 | ✅ (live 200) |
| P0-4 | Admin service edit wipes addons/faq/description | B4 | ✅ (live: append 2→3, not 4→1) |
| P0-5 | Admin profile additional-info wipe | B4+B3 | ✅ (all 6 fields; Radix guard BLOCKER-1) |
| P0-6 | Revoke-all-sessions kills JWTs | B4+int | ✅ (refresh blacklist + access epoch, live) |
| P0-7 | Cutover restore path rehearsal | — | 🅿️ separate task (not code) |

## P1 HIGH (main heads; sub-items in batch reports)
| Id / Group | Fix | Batch | Status |
|---|---|---|---|
| PRIV-1 | Public serializer: email gated, names stripped | B2 | ✅ (live: 0 emails in payload/HTML) |
| P1-2/P1-3 AUTHZ-PUB | Drafts/unpublished exposure + count poisoning | B2 | ✅ (repros dead) |
| P1-4 AZ-D1 | API-key auth scoping | B1 | 🔶 partial (B1 scope done; api_keys.py hardening pending) |
| P1-5 A-D1/D15 | Verify-email logs in + resend error surfacing | B1 | ✅ (B1; verify logs in, resend 200-always, failure page) |
| P1-6 A-D2/D3 | Broken-pro onboarding safeguards | B1 | ✅ (B1) |
| P1-7 AUTH-G4 | confirmed/ban_expires login semantics | B1 | ✅ (B1; token-holder message = frontend follow-up) |
| P1-12 | /dir pills broken links | B3 | ✅ |
| P1-13/14 DROP-1 | Dropdown caps (10/8) → full lists | B2+int | ✅ (41 αντί 10; carousel semantics = product D) |
| P1-15 | Archive search term lost | B3 | ✅ |
| P1-16 | Service SEO description " -  - " | B3 | ✅ |
| P1-18 CG-1 | Slug collisions (search index + banners + 404s) | B2+B3 | ✅ (8/88/490; banners/404 live) |
| P1-20 CG-2 | Tag search never matches (449 services) | B2 | ✅ ("adobe flash" βρίσκει ξανά) |
| P1-22 | Blog category slugs revert (frontend) | B3 | ✅ |
| P1-24/P2-13 CACHE-1 | Signal purges: service pages + on_commit | B2 | ✅ (4 signal modules) |
| P1-25 AFM-1 | AADE lookup (4 bugs τελικά) | B2+int | ✅ κώδικας (LC-10: 1 live call με AADE creds εκκρεμεί) |
| AZ-D3 | Support can't modify admins | B1 | ✅ (B1; token-only legacy revoke gap noted) |
| XC-THROTTLE THR-1 | Throttles real (forgot-password parity) | B1 | ✅ (B1; globals restored, forgot-pw 1/10min/email) |
| S-D1/P3-D2 | Refresh-logout causes (client refresh + race) | B3(+B1) | ✅ shared store + narrowed cookie clear |
| BILL-G1/G2, P2-26 gate | Featured purge, Cardlink proxy, checkout gate | — | ❄️ frozen |

## P2 MEDIUM (clusters)
| Cluster | Batch | Status |
|---|---|---|
| English errors → Greek (XC-EN plumbing sites) | B3 (+B2) | ✅ κύρια sites (πλήρες XC-EN sweep = follow-up) |
| Email mechanics (sender/Reply-To/subjects/digest/plain-text/double-welcome) | B5 | ✅ (0-diff vs old templates, 38 parts; digest lock) |
| Brevo env names + missing re-syncs | B5 | ✅ (both name sets; archive/delete re-syncs) |
| XC-TZ (TZ=Athens + UTC call sites) | B5+B4+B3 | ✅ (όλα τα halves) |
| P2-38 enum/int query-param 500s | B2 | ✅ (400/defaults αντί 500) |
| CG-3 area→county resolver | B2 | ✅ |
| LOC-1 coverage normalization + renormalize | B2 | ✅ (+command: run renormalize_coverage --apply στο prod) |
| MSG-NAME + msg D1 badge + msg D2 guards | B2+int | ✅ (name keying, read event, inbox redirects) |
| Review author names (rev D1 + public cards + admin D16) | B2 | ✅ |
| Admin: D5/D8/D10/D12/D14, billing-details '' , D2 sort, D3 stats | B4 | ✅ |
| XC-CRONAUTH (3 non-billing views) | B5 | ✅ (wrong secret 401, right secret 200, renewals untouched) |
| P5-BR-2 missing cleanup task | B1 | ✅ (tasks.py created, worker lists it) |
| useSession vein (P5-CS-1..5 + NoServiceDialog) | B3 | ✅ (2 ρίζες: store + 5s cache) |
| Taxonomy approve purge no-op (CG-8) | — | ⏭️ εκτός briefs — follow-up |

## P3 LOW (handled inside batches; see batch reports for item lists)
| Area | Batch | Status |
|---|---|---|
| Soft-404 statuses, PLURAL-1, XC-DEADREVAL, sitemaps/home regen (P5-RW) | B3+int | ✅ |
| Saved bad-params 400, admin notifications PENDING casing | B2 | ✅ |
| Blog cover-image null (N2), duplicate slug 500 (N5), slug-rename purge (D9) | B4/B5 | ✅ |
| Runtime: enqueue logging, channels_routing, digest lock, zeep, ws guard | B5+B2+B3 | ✅ (retries/acks+Brevo ordering = design follow-ups) |
| Admin chat notFound (P5-DU-1), taxonomy toasts (NEW-3), purge-order (NEW-1) | B4 | ✅ |

## Not in any batch (deliberate)
- ❄️ ALL billing/payments items (user: don't touch for now)
- 🅿️ P0-7 cutover rehearsal — infra task, scheduled separately
- 🗳️ §5 product decisions (23 items) — await user choices
- 🛠️ Server-side actions from SERVER-CHECKS-RESULTS.md: celery-beat down since
  July, disable renewals beat row, close 5432 (✅ closed), env checks (§4.2)

## Cross-batch handoffs collected (apply at integration)
- B3: google callback 403 account_blocked → Greek /login?message; forgot-password action shows backend message; resend already_verified branch dead
- B5: brevo.py:242 use is_ban_active(); FRONTEND_BASE_URL local :3000 vs :3100 note
- Follow-up (post-batch): AZ-D1 remainder in apps/admin_api/services/api_keys.py (hash at rest, owner scoping, constant-time, drop from default auth classes)
- B1 extras fixed: SM-D1 ✅, SM-D2 ✅, VM-D1 ✅ (8 fields), P5-BR-8 ✅, D5 username atomicity ✅

## Still open after the batches
- CG-8 taxonomy submission purge/static reads (not in any brief)
- Full XC-EN Greek sweep of remaining ~80 backend strings (main plumbing done)
- P1-14 carousel semantics + D-02 shuffle (product decisions)
- LC-10 live AADE call (needs creds), reviews/views/admin enum validation (B4 skipped, B2 noted)
- P3-29 saved-toggle false success
- Prod commands after deploy: renormalize_coverage --apply, unstick OAUTH users (fixes-B1), SQL Q0c stays frozen with payments
