# Pass 6: live E2E verification on the LOCAL stack (2026-11-05)

Stack: frontend `localhost:3100` (Next 15 dev), Django `localhost:8800` (DEBUG, settings.dev), Postgres :5433, Redis, Celery.
Browser: playwright-core 1.64 with the cached chromium headless shell.
Method: Django shell, direct API calls (curl with JWTs minted by `issue_tokens`), and real browser journeys.
Constraints kept:
- No git commands and no code changes.
- No external calls: no Google, no Cardlink/Worldline, no Cloudinary upload, no email (Brevo is not configured locally).
- Writes were limited to disposable local DB rows (listed in §5) and this file.

## 0. Environment caveats (read first)

- **The frontend container was OOM-killed 5 times** (`OOMKilled=true`, no mem limit; the Docker VM has 7.6 GB and is shared with the `parkit_*` containers). Each time I restarted it with `docker compose start frontend`. Dev-mode compiles of new routes are the trigger. This is local-only, not an app bug, but long browser sessions need restarts.
- **Backend `FRONTEND_BASE_URL=http://localhost:3000`**, while the override file moved the frontend to 3100. Django's 302 targets (verify-email) therefore land on port 3000, which is a different local app (404). I followed the paths manually on 3100. The verdicts are unaffected.
- **Dev mode** shows debug panels (onboarding "isValid / Form Values / Trigger Validation", oauth-setup "Debug: userType=…"). Both are `NODE_ENV==='development'`-gated, so they are not prod issues. React StrictMode double-mounts effects in dev, so the duplicate-WebSocket observations (§2 K-3) need a prod-build recheck.
- **Timezones:** host TZ is +07; the frontend container is UTC.

---

## 1. Verdict table (MASTER ids)

| # | MASTER id | Verdict | Evidence (short) |
|---|---|---|---|
| A | **P0-1 BILL-MID** | **REPRODUCED** | §A. 2nd activation → `IntegrityError subscriptions_providerCustomerId_key`. Locally even the **1st** fails, because an existing canceled row already holds MID `9000011131` |
| B | **P0-2 AUTH-G2** | **REPRODUCED** (API + UI) | 400 `"user" is not a valid choice`. UI: spinner "Ολοκλήρωση εγγραφής…" forever, English error, 4 POSTs; the user is soft-locked (every route → /oauth-setup) |
| C | onboarding / dir freshness | **WORKS** (with notes) | browser register (simple + pro) → verify → login → onboarding UI submit → `/dashboard`. The new pro appears **immediately** on `/dir`, `/dir/marketing`, `/dir/marketing/digital-marketers`, `/profile/<u>` (caches pre-warmed) |
| C | journey guards | **WORKS** | matrix in §C. Note the OAUTH_SETUP soft-lock (P0-2) |
| D | **P1-5 AUTH-G1** (A-D1, P3-D3, A-D15, resend) | **REPRODUCED** (all legs) | no auth cookie after verify → `/dashboard` bounces to `/login`; 2nd click → `/register/success?verified=false&reason=error` (generic code, wrong page, "check your email" copy); resend gives 409 `already_verified` / 200 error envelope |
| E | dashboard edits → public | **WORKS** (basic + additional tabs) | tagline, rate and terms saved via UI appear on `/profile/<u>` immediately |
| E | **P2-17 LOC-1** | **REPRODUCED** | coverage Αττικής / Αγία Βαρβάρα / 12351 (ids 2/2/2) → `coverageNormalized = "12351"` (the county and area words are lost). The public page displays the names correctly; only search is affected |
| E | **P0-5 AM-WIPE profile** | **REPRODUCED** | admin detail lacks 6 keys; an admin additional-info save wiped commencement/contact/payment/settlement/budget/terms |
| F | **N1** saved hearts | **PARTIAL** | after email login + client nav to home, the saved heart shows "Αποθήκευση" (not saved). Clicking opens **"Για να αποθηκεύσεις… πρέπει να έχεις λογαριασμό"** (an auth dialog for a logged-in user) instead of deleting. **No data loss observed.** The logo link is a hard nav (bug masked there) |
| F | **N2** stale sidebar | **REPRODUCED + worse** | (a) after rename e2epro1c→e2epro1d, the menu "Προφίλ" still links `/profile/e2epro1c` → "404 - Προφίλ δεν βρέθηκε" until reload. (b) NEW: right after an **email login**, a pro's sidebar footer shows the placeholder **"US / User"** and the **simple-user menu** (no Προφίλ, Υπηρεσίες, Προώθηση) until a hard reload |
| F | **N3** login loop | **NOT REPRODUCED** | 2 action POSTs in 30 s after login; 7 `/api/auth/session` GETs in 45 s (incl. my curls); 0×429 |
| G | **P1-17** draft duration | **REPRODUCED** | exact action payload (`duration:0`) → 400 "Η διάρκεια πρέπει να είναι τουλάχιστον 1 ημέρα". Omitting `duration` → 200 (the fix works) |
| G | **P2-34** >3 addons | **REPRODUCED** (API + UI) | PATCH with the 4 stored addons → 400. UI: 4 addons render with the inline error "έως 3"; Save → 400; the service cannot be edited without deleting an addon |
| G | **P1-16** meta description | **REPRODUCED** | `/s/katoikon-…-196` → `<meta name="description" content=" -  - Βιολογικός καθαρισμός…">`; og:description identical |
| H | review lifecycle | **WORKS** (parity) | create → pending → admin approve → still hidden, because `visibility=False` by design (OLD parity, owner toggles "Εμφάνιση σχολίου") → after toggle, it shows publicly |
| H | **P2-44 REV-AUTHOR** (rev D1) | **REPRODUCED** | dashboard Συστάσεις: **"Από: - (05/11/2026)"**. API `author={name:'e2e-simple1', displayName:null, username:null}` although `users.username='e2e-simple1'` |
| I | chat realtime | **WORKS** | `/ws/chat/<id>/` + `/ws/presence/` connect; the message arrives live; `read` events flow; the list item badge clears after the chat is open about 15 s |
| I | **P3-25 MSG-NAME** | **REPRODUCED** | with the Profile name ≠ the User name: chat list "E2E Pro One" (User) vs header "E2E Profile Name" (Profile) |
| I | failed-send ghost bubble | SKIPPED | would need the backend blocked mid-session (disruptive with the OOM-prone frontend) |
| J | **P0-3 AM-PAYLOAD user detail** | **REPRODUCED** | `/admin/users/<id>` → HTTP 500 `Cannot read properties of undefined (reading 'slice')`; the API returns `{user,accounts,sessions}` and no profile |
| J | **P0-4 AM-WIPE service** | **REPRODUCED** | admin GET lacks `addons/faq/description`; the form's add-one submit → 4 addons → 1 (service **1087** sacrificed, later re-seeded) |
| J | **P0-6 AM-JWT** | **REPRODUCED** | admin revoke-all → `{"revoked":0}`; the user's access token AND refresh token still work afterwards |
| — | **P1-1 PRIV-1** | **REPRODUCED** | `visibility.email=false`, yet the anonymous `GET /api/profiles/page/<u>` returns `"email":"e2e-pro1@example.test"`; the address appears 2× in the `/profile/<u>` HTML |
| — | **P1-2 CG-5** | **REPRODUCED** (incl. count poisoning) | anon `POST /services/search {"status":"draft"}` → 4 drafts (incl. my E2E draft). Count poisoning: `{"category":"c0eOR-","status":"draft"}` then `{"category":"c0eOR-"}` → **0** (DB: 33 published). Later self-healed (TTL) |
| — | **P1-3 AUTHZ-PUB** | **REPRODUCED** | an unpublished active profile is listed by anon `/profiles/search {"published":false}`; the count is poisoned the same way (23 → 0) |
| — | **P1-7 AUTH-G4** | **REPRODUCED** (shape differs) | expired-ban user and `confirmed=false` user: login → "Λάθος email ή κωδικός πρόσβασης" (misleading; no loop). An already-issued JWT for such a user → cookies silently cleared, `/dashboard` → `/login`, no message |
| — | **P1-12 TAX-HIER** | **PARTIAL** | `/dir` pills link to `/dir/<sub>` (5 links, e.g. `/dir/kathigites-xenon-glosson`). It renders 200 as a duplicate subcategory page (not broken, but a wrong canonical). Unknown slugs (`/dir/nonexistent-xyz`, `/dir/marketing/nonexistent-xyz`, `/dir/null`) **do 404**, so that sub-claim is NOT reproduced here |

---

## 2. Details

### A. P0-1 (no Cardlink involved)
Script: `handle_worldline_webhook(params, is_server_to_server=True)` with `status=CAPTURED, mid=9000011131, var1=<profile>`, run for 2 profiles without subscriptions (`cmi5005ep000lulm0frhg2fs8`, `cmi500uts0039ulm0pco1pi83`) inside an outer `atomic()` that I rolled back.
- **Run 1 (DB as-is):** profile #1 already fails, because canceled subscription `cmsshfawa1vgv2dij40rn6pu` holds `providerCustomerId=9000011131`. So the local DB is already in the poisoned state Q0 asks about.
- **Run 2 (that row nulled inside the rollback):** #1 → `{'status':'ok'}`, active, `provider_customer_id=9000011131`. #2 → `IntegrityError duplicate key … ("providerCustomerId")=(9000011131)`.
- The view (`billing.py:354`) does not catch the error, so the webhook returns 500. The subscriptions count stayed at 4 and nothing persisted.

### B. P0-2
- User `e2e-oauth1@example.test` was created at OAUTH_SETUP (google, type=user, role=user).
- `POST /api/auth/oauth/setup {"role":"user","type":"user",…}` → 400 `{"details":{"role":["\"user\" is not a valid choice."]}}`.
- Browser with JWT cookies → `/oauth-setup`: the auto-submit fires; card shows a spinner "Ολοκλήρωση εγγραφής…" **and** a red "One or more fields are invalid." (English). The page stays like that; 4 POSTs to `/oauth-setup` were observed.
- The guards then pin the user there: `/dashboard`, `/onboarding`, `/login` and `/dashboard/services` all redirect to `/oauth-setup`. The user is effectively locked out.

### C. Signup and onboarding journey (browser)
- `/register` → "Απλός" (email + password only; the username is auto `e2e-simple1`) and "Επαγγελματικός" (Επαγγελματίας, displayName, email, username, password, terms).
  - Both land on `/register/success?email=…`.
  - DB shows `step=EMAIL_VERIFICATION, emailVerified=f`. Note: **`confirmed=t` is already set at register**, which is relevant to the P1-7 / D-06 decision.
- Onboarding (the pro logged in with email; login → `/onboarding`).
  - I set `users.image` to an existing seed Cloudinary URL so that no upload was needed (no Cloudinary calls apart from loading the widget script).
  - UI steps: category combobox "Digital Mark" → only **"Digital Marketer (Μάρκετινγκ)"** offered (no "Digital Marketing Agency"; presumably scoped to role=freelancer); rich-text bio; Online checkbox; submit.
  - Result: → `/dashboard`; DB `published=t, isActive=t, step=DASHBOARD`.
  - The new pro was visible right away (pages pre-warmed before onboarding) on `/dir`, `/dir/marketing`, `/dir/marketing/digital-marketers` and `/profile/e2epro1`.
- Guard matrix (JWT cookies; → final URL):

| state | /dashboard | /onboarding | /oauth-setup | /login | /dashboard/services |
|---|---|---|---|---|---|
| pro ONBOARDING (seed `damigrowth+662`) | /onboarding | /onboarding | /onboarding | /onboarding | /onboarding |
| user DASHBOARD (e2e-simple1) | /dashboard | /dashboard | /dashboard | /dashboard | /dashboard/services (renders) |
| OAUTH_SETUP (e2e-oauth1) | /oauth-setup | /oauth-setup | /oauth-setup | /oauth-setup | /oauth-setup |
| TYPE_SELECTION (seed `conspets87`) | /oauth-setup (type picker) | /oauth-setup | /oauth-setup | /oauth-setup | (frontend OOM) |
| expired-ban (JWT held) | /login, cookies cleared | — | — | — | — |

### D. Verification link
The token was read from the `verification` table, then `/api/verify-email?token=…` was opened in a fresh context.
- **Click 1:** 307 → `{FRONTEND}/dashboard` (simple) or `/onboarding` (pro). **No `dj_*` cookies are set**, so the next request to `/dashboard` or `/onboarding` → `/login`.
- **Click 2:** 307 → `/register/success?verified=false&reason=error`. `reason=error` comes from `exc.default_code` (A-D15). The page says "Σχεδόν Έτοιμοι! Έλεγξε το email σου…" with no error and no resend button. It should go to `/register/failure`, or count as success for an already-verified user.
- **Resend:** verified email → **409 `already_verified`** (an enumeration oracle). Unknown email → **HTTP 200 with an `{"error":{"code":"ok_silent"…}}` envelope**.

### E. Dashboard edits
- **Basic tab** (UI): tagline → DB → public page, immediately.
- **Additional tab** (UI): rate 75 + terms → DB → public page, immediately.
- **Coverage** (via `PATCH /api/profiles/me/coverage`, the same endpoint as the form):
  - Saved `county=2, area=2, zipcode=2, counties=[2], areas=[2]`.
  - DB `coverageNormalized='12351'`, which is **LOC-1** (all three ids resolve through the colliding id→name map to the zipcode).
  - The public profile page shows "Αττικής", "Αγία Βαρβάρα" and "12351" correctly, so the damage is limited to search.
- Contact-details, verification, presentation/media and account tabs were not exercised in the UI; time went to the frontend OOM restarts.

### F. useSession family
- **N1:** the login nav is client-side (a window marker survives); the header logo link is a **hard** nav (the marker is lost), so the bug only shows on client-side links/pushes.
  - With `router.push('/')` after login, the saved service 862 shows "Αποθήκευση".
  - Clicking it opens the `AuthRequiredDialog` ("Για να αποθηκεύσεις στα αγαπημένα πρέπει να έχεις λογαριασμό").
  - So the `SaveButton` instance also had `session=null`, contrary to the N1 write-up, which predicted a delete. A hard reload shows "Διαγραφή" correctly, and the DB was unchanged.
- **N2:** see the table. The post-login placeholder "US / User" plus the simple-user menu for a pro is the bigger visible symptom; it also means no "Προφίλ"/"Υπηρεσίες" links until a reload.
- **N3:** not reproduced.

### G. Services
- `POST /api/services/` with `duration:0` works (min 0 on create).
- `POST /api/services/draft` with `duration:0` → 400 (P1-17).
- **NEW (LOW):** `POST /api/services/draft` with no `category` key → **500 IntegrityError** (`null value in column "category"`, `service_writes.py:249`). The UI always sends `""`, so it is not reachable from the UI; it is an API robustness issue.
- **NEW (LOW):** the owner's edit form disables Save until dirty; with >3 addons, dirty + Save → PATCH 400, and the only feedback is the inline "έως 3" text (no toast).

### H. Reviews
- `e2e-simple1` reviewed `e2epro1d` (service 1087): pending → admin `PATCH /admin/reviews/<id>/status approved` → `status=approved, published=t, visibility=f` → public list empty.
- The owner toggled visibility → public list shows it.
- 8 of the 10 approved local reviews have `visibility=f`, consistent with the ported OLD default. Confirm that this is OLD's actual default (`review_ops.py:86` claims parity).

### I. Chat
- Chat `cmw3ggon6zuegp9hb2ilswet` was created via `POST /chats/with/<pro uid>`. The 2 messages were sent via the UI.
- **K-1 (cookie banner):** the cookie consent banner covers the chat input until it is dismissed (Playwright reported "intercepts pointer events"). This was at 1280×900, not mobile width.

### J. Admin
See the table above.

---

## 3. NEW findings (K)

| id | sev | finding |
|---|---|---|
| K-1 | LOW | Cookie banner overlaps the chat message input at 1280×900 (`/dashboard/messages/<id>`); the user must dismiss it first. |
| K-2 | MED | **Hydration error on `/dashboard/messages*`** (both parties, every load): "Hydration failed because the server rendered text didn't match the client". Cause: message times are rendered in the server TZ (container UTC, 11:24) vs the browser TZ (18:24). Same family as **P1-21 XC-TZ**; it will also fire in prod for any user whose TZ ≠ the server's (prod server UTC vs Greek users, +2/+3). |
| K-3 | LOW (verify on prod build) | Several `/ws/presence/` sockets per page (3 opened at once, more over time). Each chat frame was received 4× per page. Possibly StrictMode double-mount in dev plus N6; recheck on a prod build. |
| K-4 | MED | **Post-email-login dashboard identity placeholder**: a pro sees "US / User" and the simple-user nav until a hard reload (N2 root cause, but triggered by login itself, not only by edits). |
| K-5 | LOW | `/dashboard/*` layout renders **nested `<main>`** elements (two main landmarks; a11y). |
| K-6 | LOW | Missing profiles/old usernames return **HTTP 200** with "404 - Προφίλ δεν βρέθηκε" + `noindex` (a streaming soft-404). The stale N2 link therefore lands on a 200 "not found" page. |
| K-7 | LOW | JWT error envelopes leak Python reprs: `{"code":"token_not_valid","message":"{'detail': ErrorDetail(string='Given token not valid…'), …}"}`. |
| K-8 | LOW | Middleware refreshes only when the `dj_access` cookie is **absent**. A request that still carries an **expired** access cookie (clock skew, a cookie outliving the token) → `/login`, no refresh. The normal path (the cookie expires via maxAge 15 min = the JWT lifetime) refreshes fine (verified: refresh-only → 200 + rotated cookies). Also, the refresh cookie maxAge is 3 days, while the Django refresh lifetime is 14 days. |
| K-9 | LOW | Draft API 500 on a missing `category` key (§G). |
| K-10 | INFO | `confirmed=true` is set already at registration (before email verification), so `confirmed` is not a verification signal for new users (relevant to P1-7 / D-06). |
| K-11 | INFO | Onboarding category search for a freelancer offers "Digital Marketer" but not "Digital Marketing Agency". Check against OLD's role scoping. |
| K-12 | ENV | `FRONTEND_BASE_URL` (backend) = `:3000` while the local frontend is on `:3100` (override). Verify-email redirects go to the wrong port locally. |

---

## 4. Not done / limits
- Failed-send ghost bubble (I), the full UI service create wizard (category tree + media upload → Cloudinary), and contact/verification/presentation tabs. The reason was time lost to 5 frontend OOM restarts and the rule against external uploads.
- Payments: only the shell path (no checkout UI; Cardlink not called).
- No prod-build run, so the dev-only effects (K-3) are unconfirmed.

---

## 5. Records created / modified (all disposable, local DB only)

Password for every E2E login: `E2eTest!234`.

| record | details |
|---|---|
| user `e2e-oauth1@example.test` | id `cmw3ecexvlardvjrna80480z`, stuck at OAUTH_SETUP |
| user `e2e-simple1@example.test` | id `cmw3eg20oj0he0wjaijxt9nd`, simple, DASHBOARD; saved service **862** |
| user `e2e-pro1@example.test` | id `cmw3egauhcf13rh3oea3yolo`, pro freelancer; **username now `e2epro1d`** (renamed e2epro1→b→c→d); `image` = a seed Cloudinary URL |
| its profile | `cmw3erbd6yboz434kr9744u4`: Z0YeWT/vusw5R, tagline/rate 75/terms set, coverage Αττικής, additional fields wiped by the admin test |
| user `e2e-banexp@example.test` | banned, ban expired yesterday |
| user `e2e-unconf@example.test` | `confirmed=false`, verified |
| service **1086** | draft "E2E draft nodur" (e2epro1d) |
| service **1087** | pending "E2E Υπηρεσία Ψηφιακού Μάρκετινγκ", price 150, addons re-seeded to 4 (admin wipe test ran on it) |
| review `cmw3gf32tmcty49zi27k1lrk` | 5★, approved, visible; simple1 → e2epro1d / 1087 |
| chat `cmw3ggon6zuegp9hb2ilswet` | simple1 ↔ e2epro1d, 2 messages |
| verification tokens | both consumed |
| subscriptions | none (test A rolled back; count still 4) |
| existing seed rows | no lasting change. My own profile was briefly unpublished then restored; the profile displayName was briefly changed then restored |
| Redis | count keys were poisoned by the P1-2/P1-3 test; they have since expired (counts back to 33/23) |

Cleanup (optional):
```sql
DELETE FROM users WHERE email LIKE 'e2e-%@example.test';  -- cascades profile/accounts; check services 1086/1087, review, chat/messages FKs
```
Scratch scripts (not in the repo): `/private/tmp/claude-501/-Users-sereth-Desktop-doulitsa-new-repo/ef1955cb-3414-4103-b674-914f896cceb2/scratchpad/e2e/`.
