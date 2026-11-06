# E2E LOCAL — Agent C: Έλεγχοι API (curl-only)

Ημερομηνία: 2026-11-06 · Stack: backend http://localhost:8800, frontend http://localhost:3100 (τοπικό docker)
Πεδίο: AUTH basics, authorization edges, password change, session revoke (P0-6), public API spot checks.
Κανόνες: μόνο τοπικά, κανένα billing/payment endpoint, καμία αλλαγή σε λογαριασμούς των άλλων agents.

**Σύνοψη: 20 ✅ · 7 ⚠️ · 1 ❌ — το P0-6 (admin session revoke → άμεσο 401 σε access token) ΠΕΡΑΣΕ, ο χρόνος ακύρωσης ήταν <1s.**

## 0. Λογαριασμοί-αναλώσιμα (ΜΟΝΟ τοπικά, δημιουργήθηκαν από τον Agent C)

| Ρόλος | Email | Σκοπός |
|---|---|---|
| Απλός χρήστης | agentc-user@example.com | register/login/refresh/password change/στόχος revoke |
| Admin | agentc-admin@example.com | admin token για revoke + 403 tests |

- Και οι δύο δημιουργήθηκαν με `POST /api/auth/register` και επαληθεύτηκαν με το `devVerificationToken` που επιστρέφει το API σε DEBUG (`GET /api/auth/verify-email/?token=…`).
- Elevation του admin μέσω psql (ίδια μέθοδος με το κύριο run): `UPDATE users SET role='admin', step='DASHBOARD' WHERE email='agentc-admin@example.com';` (το `emailVerified` είχε ήδη γίνει true από το verify-email token).
- Κωδικοί: ΔΕΝ καταγράφονται (τοπικά throwaway). Tokens μασκαρισμένα ως `<ACCESS>`, `<REFRESH>`, `<ADMIN_ACCESS>`.
- Οι λογαριασμοί των siblings (e2e-user-a / e2e-pro-b / e2e-admin-c) ΔΕΝ πειράχτηκαν — μόνο ένα read-only GET στο public profile του e2e-pro-b (έλεγχος 5.4).

## 1. Πίνακας ελέγχων

| # | Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|---|
| 1.1 | Register happy path (απλός χρήστης) | ✅ | 201, `userId`, μήνυμα, `devVerificationToken` (DEBUG) |
| 1.2 | Register: άκυρο email | ✅ | 400 `validation_error`, `details.email` |
| 1.3 | Register: κωδικός <6 χαρ. | ✅ | 400 `validation_error`, `details.password` |
| 1.4 | Register: διπλό email | ✅ | 409 `email_taken` (ελληνικό μήνυμα) |
| 1.5 | Verify email (GET verify-email/?token=) | ⚠️ | 302 → `http://localhost:3000/dashboard` — port 3000 αντί 3100 (ΠΡΟΒΛΗΜΑ 3, τοπικό env) |
| 1.6 | Login → access+refresh | ✅ | 200: `access`, `refresh`, `user`, `redirectPath:/dashboard` (admin: `/admin`) |
| 1.7 | Login: λάθος κωδικός | ✅ | 401 `invalid_credentials` (γενικό μήνυμα, δεν διαρρέει ύπαρξη email) |
| 1.8 | Refresh rotation | ✅ | 200, νέο `access` ΚΑΙ νέο `refresh` (rotation ενεργό) |
| 1.9 | Επαναχρησιμοποίηση παλιού refresh | ⚠️ | 401 «Token is blacklisted» ✅, ΑΛΛΑ `message` = raw Python repr (ΠΡΟΒΛΗΜΑ 2) |
| 1.10 | Throttling σε 12 γρήγορα failed logins | ⚠️ | 12×401, ΚΑΝΕΝΑ 429 — τα per-endpoint rates (`login:10/min`) είναι declared αλλά ΑΝΕΝΕΡΓΑ by design (parity: OLD δεν είχε κανένα όριο· D-10 εκκρεμής απόφαση). Μόνο global `anon 100/5s` ανά IP (ΠΡΟΒΛΗΜΑ 4) |
| 2.1 | Anon σε protected endpoint (GET /api/auth/me) | ✅ | 401 `not_authenticated` |
| 2.2 | Simple-user JWT σε admin endpoint (GET /api/admin/users) | ✅ | 403 `permission_denied` «Insufficient permission for users (view).» |
| 2.3 | Simple-user JWT σε pro-only (POST /api/services/draft) | ✅ | 403 «Professional account required.» (`IsProfessional`) |
| 2.4 | Simple-user JWT σε GET /api/services/me | ⚠️ | 200 με κενή λίστα — view είναι `IsAuthenticated` μόνο (dashboard endpoint). Παρατήρηση, όχι regression |
| 2.5 | `curl -sI http://localhost:3100/dashboard` χωρίς cookies | ✅ | 307 → `location: /login` |
| 3.1 | Password change (σωστός τρέχων κωδικός) | ✅ | 200 «Ο κωδικός άλλαξε επιτυχώς» |
| 3.2 | Παλιό ACCESS token μετά το change | ⚠️ | Παραμένει έγκυρο ως το 15' TTL (δεν μπαίνει revocation epoch στο password change) |
| 3.3 | Παλιό REFRESH token μετά το change | ❌ | 200 — έκοψε ΝΕΟ ζεύγος tokens ΜΕΤΑ την αλλαγή κωδικού (ΠΡΟΒΛΗΜΑ 1) |
| 3.4 | Login με ΠΑΛΙΟ κωδικό | ✅ | 401 `invalid_credentials` |
| 3.5 | Login με ΝΕΟ κωδικό | ✅ | 200, πλήρες payload |
| 4.1 | Admin revoke-all στον throwaway (P0-6) | ✅ | 200 `{"revoked":3,"refreshTokensRevoked":3}` |
| 4.2 | Προϋπάρχον ACCESS token μετά το revoke | ✅ | **401 ΑΜΕΣΩΣ (t+0s στο polling ανά 2s, δηλ. <1s)** — πολύ κάτω από το όριο ~60s. Ο Redis epoch (`auth:revoked-before:<user_id>`) δουλεύει |
| 4.3 | Προϋπάρχον REFRESH token μετά το revoke | ✅ | 401 «Token is blacklisted» |
| 4.4 | Fresh login ΜΕΤΑ το revoke | ✅ | 200, νέο access δουλεύει — ο epoch κόβει μόνο tokens με iat πριν το revoke |
| 5.1 | GET /api/health | ✅ | 200 `{"ok":true,"db":true,"redis":true,"celery":true}` |
| 5.2 | GET /api/taxonomy/maps — ETag/304 | ✅ | `ETag: W/"08adda1c…"` + `If-None-Match` → 304 |
| 5.3 | GET /api/services/list ανώνυμα | ✅ | 200 `{services,total,hasMore}` — ΚΑΝΕΝΑ email/phone/afm key στο payload |
| 5.4 | Private fields σε public profile page | ⚠️ | `/api/profiles/page/<username>` περιέχει email/phone/viber/whatsapp/address ΟΤΑΝ `visibility:{email:true,phone:true,address:true}` — parity με OLD (literal port, το frontend κρύβει κατά visibility). ΔΕΝ επιβεβαιώθηκε φιλτράρισμα με visibility=false (θα απαιτούσε αλλαγή σε sibling λογαριασμό — ΠΡΟΒΛΗΜΑ 5) |

## 2. Αναλυτικά — εντολές & αποτελέσματα

### 2.1 Register (happy + validation)

```bash
# Happy path → 201
curl -s -w "%{http_code}" -X POST http://localhost:8800/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"agentc-user@example.com","password":"<PW>","authType":"user","consent":["terms"]}'
# → 201 {"message":"Επιτυχής εγγραφή. Έλεγξε το email σου για επαλήθευση.","userId":"cmw4spe1…","email":"…","devVerificationToken":"<TOKEN>"}

# Άκυρο email → 400 {"error":{"code":"validation_error","details":{"email":["Enter a valid email address."]}}}
# Κωδικός "ab1" → 400 {"error":{"code":"validation_error","details":{"password":["Ensure this field has at least 6 characters."]}}}
# Διπλό email → 409 {"error":{"code":"email_taken","message":"Υπάρχει ήδη λογαριασμός με αυτό το email"}}
```

Παρατήρηση: τα validation `details` είναι αγγλικά DRF defaults (το frontend έχει δικά του μηνύματα), ενώ τα domain errors (`email_taken`) ελληνικά.

### 2.2 Verify email

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}" \
  "http://localhost:8800/api/auth/verify-email/?token=<TOKEN>"
# → 302 -> http://localhost:3000/dashboard   (port 3000 αντί 3100 — ΠΡΟΒΛΗΜΑ 3)
```

### 2.3 Login / refresh

```bash
curl -s -X POST http://localhost:8800/api/auth/login -H "Content-Type: application/json" \
  -d '{"identifier":"agentc-user@example.com","password":"<PW>"}'
# → 200 keys: access, refresh, user, redirectPath:/dashboard
# user object: id, email, username, role, step, banned, blocked, confirmed, emailVerified, … (δικός του λογαριασμός — οκ)

# Λάθος κωδικός → 401 {"error":{"code":"invalid_credentials","message":"Λάθος email ή κωδικός πρόσβασης"}}

curl -s -X POST http://localhost:8800/api/auth/token/refresh -H "Content-Type: application/json" \
  -d '{"refresh":"<REFRESH>"}'
# → 200 {access, refresh}  (ROTATION: επιστρέφει νέο refresh)
# Ξανά με το ΙΔΙΟ (παλιό) refresh → 401 token_not_valid "Token is blacklisted" ✅
# ΑΛΛΑ: message = "{'detail': ErrorDetail(string='Token is blacklisted', …)}" — raw repr (ΠΡΟΒΛΗΜΑ 2)
```

### 2.4 Throttling (failed logins)

```bash
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code} " -X POST \
  http://localhost:8800/api/auth/login -H "Content-Type: application/json" \
  -d '{"identifier":"agentc-user@example.com","password":"wrong-'$i'"}'; done
# → 401 ×12, κανένα 429
```

Κώδικας: `common/throttling.py` — `LoginThrottle(_EndpointThrottle)` εφαρμόζει ΜΟΝΟ τα global `anon 100/5s` / `user 200/5s` ανά IP. Τα `DEFAULT_THROTTLE_RATES` (`login:10/min`, `register:5/min`, κ.λπ.) είναι δηλωμένα αλλά ενεργοποιούνται μόνο αν προστεθεί `ClassScopedRateThrottle` (σχόλιο στον κώδικα: parity — OLD χωρίς όριο, D-10 product decision).

### 2.5 Authorization edges

```bash
curl -s -w "%{http_code}" http://localhost:8800/api/auth/me                                   # → 401 not_authenticated
curl -s -w "%{http_code}" -H "Authorization: Bearer <ACCESS>" http://localhost:8800/api/admin/users   # → 403 permission_denied
curl -s -w "%{http_code}" -X POST -H "Authorization: Bearer <ACCESS>" -H "Content-Type: application/json" \
  -d '{}' http://localhost:8800/api/services/draft                                            # → 403 "Professional account required."
curl -s -w "%{http_code}" -H "Authorization: Bearer <ACCESS>" http://localhost:8800/api/services/me   # → 200 κενή λίστα (παρατήρηση 2.4)
curl -sI http://localhost:3100/dashboard                                                       # → 307, location: /login
```

### 2.6 Password change

```bash
curl -s -X POST http://localhost:8800/api/auth/password/change \
  -H "Authorization: Bearer <ACCESS>" -H "Content-Type: application/json" \
  -d '{"currentPassword":"<OLD>","newPassword":"<NEW>","confirmPassword":"<NEW>"}'
# → 200 {"message":"Ο κωδικός άλλαξε επιτυχώς"}

# Παλιό ACCESS → /api/auth/me → 200 (ζει ως το 15' TTL — δεν μπαίνει epoch)
# Παλιό REFRESH → /api/auth/token/refresh → 200 ΝΕΟ ζεύγος (ΠΡΟΒΛΗΜΑ 1)
# Login παλιός κωδικός → 401 ✅ · Login νέος κωδικός → 200 ✅
```

### 2.7 P0-6 — Admin session revoke

```bash
# Admin login → <ADMIN_ACCESS>. Target: userId του agentc-user (cmw4spe1…)
curl -s -X POST -H "Authorization: Bearer <ADMIN_ACCESS>" \
  http://localhost:8800/api/admin/users/<USER_ID>/sessions/revoke-all
# → 200 {"revoked":3,"refreshTokensRevoked":3}

# Polling με το ΠΡΟΗΓΟΥΜΕΝΩΣ ΕΓΚΥΡΟ access του χρήστη (έλεγχος pre-revoke: 200):
# t+0s → 401  ✅ ΑΜΕΣΑ (<1s, όριο αποδοχής ~60s)
# Refresh του χρήστη → 401 "Token is blacklisted" ✅
# Fresh login του χρήστη ΜΕΤΑ το revoke → 200, νέο access δουλεύει ✅ (epoch μόνο για iat < revoke)
```

Μηχανισμός (`apps/accounts/services/sessions.py::revoke_all_for_user`): blacklist όλων των outstanding refresh + Redis key `auth:revoked-before:<user_id>` (epoch)· το `RevocationAwareJWTAuthentication` απορρίπτει access με `iat` πριν το epoch. Επιβεβαιώθηκε εμπειρικά.

### 2.8 Public spot checks

```bash
curl -s http://localhost:8800/api/health
# → 200 {"ok":true,"db":true,"redis":true,"celery":true}

curl -sI http://localhost:8800/api/taxonomy/maps | grep -i "etag\|cache"
# → ETag: W/"08adda1c9ac64f1ebec56c4272e12ff9", Cache-Control: no-cache
curl -s -o /dev/null -w "%{http_code}" -H 'If-None-Match: W/"08adda1c9ac64f1ebec56c4272e12ff9"' \
  http://localhost:8800/api/taxonomy/maps
# → 304 ✅

curl -s "http://localhost:8800/api/services/list?limit=5"
# → 200 {services, total, hasMore} — σάρωση ΟΛΩΝ των keys: κανένα email/phone/tel/afm/viber/whatsapp, κανένα email string στο σώμα ✅

curl -s "http://localhost:8800/api/profiles/page/e2e-pro-b"    # read-only στο sibling pro
# → 200 — περιέχει profile.email, phone, viber, whatsapp, coverage.address
#   ΜΕ visibility:{email:true,phone:true,address:true} (ο sibling τα έχει ενεργά)
#   Ο selector (apps/profiles/selectors/profile_aggregations.py) είναι literal port του OLD → parity
#   ΔΕΝ ελέγχθηκε η περίπτωση visibility=false (βλ. ΠΡΟΒΛΗΜΑ 5 / «Δεν ελέγχθηκε»)
```

## 3. Προβλήματα (αριθμημένα)

1. **(Σοβαρό/Security) Το password change ΔΕΝ ακυρώνει τα υπάρχοντα refresh tokens.** Μετά από επιτυχές `POST /api/auth/password/change`, το προϋπάρχον refresh συνεχίζει να κόβει νέα access/refresh (δοκιμάστηκε: 200). Με 14ήμερα refresh, κλεμμένος session επιβιώνει της αλλαγής κωδικού. Το `apps/accounts/services/password.py::change_password` αλλάζει μόνο το hash — δεν καλεί `sessions.revoke_all_for_user`/blacklist ούτε βάζει epoch. Repro: login → κράτα refresh R → password change → `POST /api/auth/token/refresh {refresh:R}` → 200. Πρόταση: revoke όλων (ή όλων πλην τρέχοντος) στο change· να ελεγχθεί τι έκανε το OLD (Better Auth `changePassword` με `revokeOtherSessions`) για το τελικό parity call.
2. **(Μικρό/Cosmetic) Raw Python repr σε error message.** Στο 401 για blacklisted refresh: `"message":"{'detail': ErrorDetail(string='Token is blacklisted', code='token_not_valid'), …}"`. Ο exception handler κάνει str() σε dict detail αντί να εξάγει καθαρό string. Repro: χρησιμοποίησε δύο φορές το ίδιο refresh στο `/api/auth/token/refresh`.
3. **(Τοπικό env) Verify-email redirect σε λάθος port.** `GET /api/auth/verify-email/?token=…` → 302 σε `http://localhost:3000/dashboard`, ενώ το τοπικό frontend είναι στο 3100. Πιθανό FRONTEND_URL default στο backend container. Μόνο τοπικό config — να επιβεβαιωθεί το σωστό host στο test.doulitsa.gr.
4. **(Παρατήρηση/Απόφαση D-10) Κανένα brute-force όριο στο login.** 12 συνεχόμενα failed logins → όλα 401, κανένα 429. Σκόπιμο parity (OLD χωρίς όριο)· τα rates `login:10/min` κ.λπ. υπάρχουν στο settings αλλά δεν επιβάλλονται. Προστατεύει μόνο το γενικό `anon 100/5s` ανά IP. Προτείνεται να κλείσει η εκκρεμής απόφαση D-10 πριν το cutover.
5. **(Δεν ελέγχθηκε — περιορισμός, όχι χρόνος) Public profile με visibility=false.** Δεν επιβεβαιώθηκε αν το `/api/profiles/page/<username>` αφαιρεί email/phone όταν τα visibility flags είναι false, γιατί θα απαιτούσε αλλαγή στο profile του sibling (απαγορευμένο) ή πλήρες pro onboarding νέου λογαριασμού. Το payload με visibility=true είναι parity με OLD (frontend-side απόκρυψη). Να καλυφθεί σε επόμενο run με δικό του pro λογαριασμό.

## 4. Δεν ελέγχθηκε (εκτός scope ή περιορισμός)

- Billing/payment endpoints — ΕΚΤΟΣ SCOPE (frozen), δεν αγγίχτηκαν.
- Visibility=false φιλτράρισμα σε public profile (βλ. ΠΡΟΒΛΗΜΑ 5 — περιορισμός, όχι χρόνος).
- OAuth ροές (Google) — εκτός scope curl-only.
