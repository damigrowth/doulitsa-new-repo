# FIX TRACKER — live status (updated by the orchestrator as batches land)

Legend: ⏳ in progress · ✅ fixed+verified · ☑️ already fixed (found done) ·
⏭️ skipped (reason) · ⛔ blocked · ❄️ FROZEN by user (payments)
Batch reports with evidence: fixes-B1..B5.md in this folder.

## P0 CRITICAL
| Id | Fix | Batch | Status |
|---|---|---|---|
| P0-1 | provider_customer_id MID write + Q0c cleanup | — | ❄️ frozen (payments) |
| P0-2 | OAuth setup accepts simple users (+unstick 4 users) | B1 | ⏳ |
| P0-3 | Admin user-detail payload/page crash | B4 | ⏳ |
| P0-4 | Admin service edit wipes addons/faq/description | B4 | ⏳ |
| P0-5 | Admin profile additional-info wipe | B4 | ⏳ |
| P0-6 | Revoke-all-sessions kills JWTs | B4 | ⏳ |
| P0-7 | Cutover restore path rehearsal | — | 🅿️ separate task (not code) |

## P1 HIGH (main heads; sub-items in batch reports)
| Id / Group | Fix | Batch | Status |
|---|---|---|---|
| PRIV-1 | Public serializer: email gated, names stripped | B2 | ⏳ |
| P1-2/P1-3 AUTHZ-PUB | Drafts/unpublished exposure + count poisoning | B2 | ⏳ |
| P1-4 AZ-D1 | API-key auth scoping | B1 | ⏳ |
| P1-5 A-D1/D15 | Verify-email logs in + resend error surfacing | B1 | ⏳ |
| P1-6 A-D2/D3 | Broken-pro onboarding safeguards | B1 | ⏳ |
| P1-7 AUTH-G4 | confirmed/ban_expires login semantics | B1 | ⏳ |
| P1-12 | /dir pills broken links | B3 | ⏳ |
| P1-13/14 DROP-1 | Dropdown caps (10/8) → full lists | B2 | ⏳ |
| P1-15 | Archive search term lost | B3 | ⏳ |
| P1-16 | Service SEO description " -  - " | B3 | ⏳ |
| P1-18 CG-1 | Slug collisions (search index + banners + 404s) | B2+B3 | ⏳ |
| P1-20 CG-2 | Tag search never matches (449 services) | B2 | ⏳ |
| P1-22 | Blog category slugs revert (frontend) | B3 | ⏳ |
| P1-24/P2-13 CACHE-1 | Signal purges: service pages + on_commit | B2 | ⏳ |
| P1-25 AFM-1 | AADE lookup (3 bugs) | B2 | ⏳ |
| AZ-D3 | Support can't modify admins | B1 | ⏳ |
| XC-THROTTLE THR-1 | Throttles real (forgot-password parity) | B1 | ⏳ |
| S-D1/P3-D2 | Refresh-logout causes (client refresh + race) | B3(+B1) | ⏳ |
| BILL-G1/G2, P2-26 gate | Featured purge, Cardlink proxy, checkout gate | — | ❄️ frozen |

## P2 MEDIUM (clusters)
| Cluster | Batch | Status |
|---|---|---|
| English errors → Greek (XC-EN plumbing sites) | B3 (+B2 messages) | ⏳ |
| Email mechanics (sender/Reply-To/subjects/digest/plain-text/double-welcome) | B5 | ⏳ |
| Brevo env names + missing re-syncs | B5 | ⏳ |
| XC-TZ (TZ=Athens + UTC call sites) | B5 (+B4 stats, B3 hydration) | ⏳ |
| P2-38 enum/int query-param 500s | B2 | ⏳ |
| CG-3 area→county resolver | B2 | ⏳ |
| LOC-1 coverage normalization + renormalize | B2 | ⏳ |
| MSG-NAME + msg D1 badge + msg D2 guards | B2 | ⏳ |
| Review author names (rev D1 + public cards + admin D16) | B2+B4 | ⏳ |
| Admin: D5/D8/D10/D12/D14, billing-details '' , D2 sort, D3 stats | B4 | ⏳ |
| XC-CRONAUTH (3 non-billing views) + P5-BR-2 missing task | B5 | ⏳ |
| useSession vein (P5-CS-1..5 + NoServiceDialog) | B3 | ⏳ |
| Taxonomy approve purge no-op (CG-8) | B2 | ⏳ |

## P3 LOW (handled inside batches; see batch reports for item lists)
| Area | Batch | Status |
|---|---|---|
| Soft-404 statuses, PLURAL-1, XC-DEADREVAL, sitemaps/home regen (P5-RW) | B3 | ⏳ |
| Saved bad-params 400, admin notifications PENDING casing | B2 | ⏳ |
| Blog cover-image null (N2), duplicate slug 500 (N5), slug-rename purge (D9) | B4/B5 | ⏳ |
| Runtime: enqueue logging, channels_routing, zeep reuse, digest lock, ws close guard | B5 (+B3) | ⏳ |
| Admin chat notFound (P5-DU-1), taxonomy toasts (NEW-3), purge-order (NEW-1) | B4 | ⏳ |

## Not in any batch (deliberate)
- ❄️ ALL billing/payments items (user: don't touch for now)
- 🅿️ P0-7 cutover rehearsal — infra task, scheduled separately
- 🗳️ §5 product decisions (23 items) — await user choices
- 🛠️ Server-side actions from SERVER-CHECKS-RESULTS.md: celery-beat down since
  July, disable renewals beat row, close 5432 (✅ closed), env checks (§4.2)
