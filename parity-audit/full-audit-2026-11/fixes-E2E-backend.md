# Διορθώσεις backend — ευρήματα E2E 2026-11-06

Τα 4 backend bugs του τοπικού E2E (§4 E2E-LOCAL-FLOWS-2026-11-06.md: #8, #12 ·
E2E-LOCAL-FLOWS-2026-11-06-C.md: #1, #2). Όλα επαληθεύτηκαν live στο τοπικό
stack (backend :8800) μετά από `manage.py check` (0 issues) και restart του
backend container. ΔΕΝ έγινε commit — οι αλλαγές είναι στο working tree.

## 1. ΑΦΜ/Πιστοποίηση: HTTP 500 σε κάθε υποβολή + αποδοχή άκυρου ΑΦΜ (ΠΡΟΒΛΗΜΑ 8, P1)

**Αιτία 500:** `apps/profiles/services/verification.py` περνούσε το key
`created` στο logger `extra` — το `created` είναι reserved attribute του
LogRecord, οπότε ΚΑΘΕ υποβολή σκαγε με `KeyError` ΜΕΤΑ την εγγραφή της σειράς
(γι' αυτό ο χρήστης έβλεπε 500 ενώ το αίτημα καταχωρούνταν). Μετονομάστηκε σε
`created_new`. Σάρωση ΟΛΟΥ του backend (script σε όλα τα `extra={...}` blocks
για τα reserved keys name/msg/args/created/module/level* κ.λπ.): κανένα άλλο
σημείο.

**Validation ΑΦΜ:** Το OLD `verificationFormSchema` (oldnext
`lib/validations/profile.ts:426-431`) είχε μόνο min(1)/max(20) — ΔΕΝ είχε
κανόνα 9 ψηφίων σε αυτή τη φόρμα. Όμως κάθε ΑΛΛΗ επιφάνεια ΑΦΜ του OLD
επέβαλλε ακριβώς 9 ψηφία: billing refine `profile.ts:410-421`
(`/^\d{9}$/`, μήνυμα «Ο ΑΦΜ πρέπει να είναι ακριβώς 9 ψηφία») και
`lookup-afm.ts:28` («Μη έγκυρο ΑΦΜ»). Απόφαση (per fix-ανάθεση): επιβολή του
κανόνα 9 ψηφίων server-side στο `SubmitVerificationSerializer`
(`apps/profiles/serializers/profile_updates.py`) με το wording του OLD billing
— parity-safe απόρριψη σκουπιδιών.

**Αρχεία:** `backend/apps/profiles/services/verification.py`,
`backend/apps/profiles/serializers/profile_updates.py`.

**Επαλήθευση (live, λογαριασμός e2e-pro-b):**
- `POST /api/profiles/me/verification` με `afm:"12345"` → **HTTP 400**
  `details.afm: ["Ο ΑΦΜ πρέπει να είναι ακριβώς 9 ψηφία"]` — κανένα 500,
  ΔΕΝ γράφτηκε στη DB.
- Με `afm:"090000045"` → **HTTP 200**
  `{"message":"Η αίτηση επαλήθευσης υποβλήθηκε","status":"PENDING"}` — κανένα 500.
- DB (shell): `afm: 090000045 | status: PENDING` (updated 10:23 UTC).

## 2. Password change δεν ακύρωνε sessions (C#1, P1)

**Αιτία:** `apps/accounts/services/password.py::change_password` έγραφε μόνο το
νέο hash — κανένα revoke, κανένα epoch. Κλεμμένο 14ήμερο refresh επιβίωνε της
αλλαγής κωδικού.

**Τι έκανε το OLD:** `oldnext/src/actions/auth/change-password.ts:45-51` καλεί
Better Auth `auth.api.changePassword` με body ΜΟΝΟ
`{currentPassword, newPassword}` — ΧΩΡΙΣ `revokeOtherSessions` (default false).
Δηλαδή το OLD δεν έκοβε άλλα sessions, και το session του καλούντος έμενε
ζωντανό. Η ασφαλής συμπεριφορά (revoke) αποφασίστηκε ρητά στην ανάθεση· το
parity στοιχείο που κρατήσαμε είναι το UX: **ο καλών μένει συνδεδεμένος**.

**Υλοποίηση:** μετά από επιτυχή αλλαγή, το `change_password` καλεί το ΙΔΙΟ
μονοπάτι με το δουλεμένο admin revoke
(`apps/accounts/services/sessions.py::revoke_all_for_user`: blacklist όλων των
outstanding refresh + Redis revocation epoch `auth:revoked-before:<uid>`) και
ΜΕΤΑ το epoch κόβει φρέσκο ζεύγος (`issue_tokens`) που επιστρέφεται στο
response (`{"message", "access", "refresh"}`). Πλήρες «revoke όλων πλην
τρέχοντος» με εξαίρεση token δεν υποστηρίζεται από τον μηχανισμό (το epoch δεν
κάνει εξαιρέσεις και το request δεν κουβαλά το refresh του καλούντος), γι'
αυτό: revoke όλων + νέο ζεύγος στον καλούντα. Το frontend
(`frontend/src/lib/api/auth.ts::changePassword`) υιοθετεί το νέο ζεύγος μέσω
`setTokens` (ίδιο pattern με το login), ώστε το UI να μη «πετάξει έξω» τον
χρήστη που μόλις άλλαξε κωδικό.

**Αρχεία:** `backend/apps/accounts/services/password.py`,
`backend/apps/accounts/views/public/auth.py`,
`frontend/src/lib/api/auth.ts`.

**Επαλήθευση (live, throwaway λογαριασμός e2e-fix2-throwaway@example.com):**
δύο logins (ζεύγη A, B) → αναμονή 2s → change με το A:
- `me` με access B → **401** (<1s μετά το change, μέσω epoch).
- refresh B → **401** «Token is blacklisted».
- Παλιό access A → **401**, παλιό refresh A → **401**.
- Νέο ζεύγος από το response: `me` → **200**, refresh → **200** (ο καλών
  συνεχίζει κανονικά).
- Login με παλιό κωδικό → **401** · με νέο → **200**.

Σημείωση: tokens που κόπηκαν στο ΙΔΙΟ δευτερόλεπτο με το change επιβιώνουν (το
epoch στρογγυλοποιείται σε ακέραια δευτερόλεπτα — τεκμηριωμένο ήδη στο
`sessions.py`, ίδιο ισχύει και στο admin revoke)· αυτό είναι και ό,τι κρατά
ζωντανό το φρέσκο ζεύγος του καλούντος.

## 3. banReason δεν αποθηκευόταν στο admin ban (ΠΡΟΒΛΗΜΑ 12/A#12)

**Αιτία:** Το E2E κάλεσε `POST /api/admin/users/<id>/ban` με
`{"reason":"…","days":1}` — λάθος keys. Ο `AdminBanUserSerializer` είχε το
`banReason` **optional**, οπότε το αγνόησε σιωπηλά και έκανε ban ΧΩΡΙΣ
αποθηκευμένο λόγο. Το persist καθαυτό δούλευε πάντα με τα σωστά keys
(`banReason`/`banExpiresIn` — αυτά στέλνουν και το νέο frontend
`actions/admin/users.ts:70` και το OLD `adminBanUserSchema`).

**Fix (parity):** Η φόρμα του OLD απαιτούσε ΥΠΟΧΡΕΩΤΙΚΑ λόγο —
`banUserFormSchema` (oldnext `lib/validations/admin.ts:146`):
`z.string().min(1, 'Please provide a ban reason').max(500)` — άρα κανένα OLD
ban δεν γινόταν χωρίς λόγο. Το `banReason` έγινε required (min 1/max 500) στον
`AdminBanUserSerializer` με το wording του OLD, ώστε mis-keyed payload να
αποτυγχάνει καθαρά αντί να χάνει σιωπηλά τον λόγο. Το νέο frontend form
(`banUserFormSchema`, ήδη min(1)) δεν επηρεάζεται.

**Αρχείο:** `backend/apps/accounts/serializers/admin_users.py`.

**Επαλήθευση (live, λογαριασμός e2e-admin-c):**
- Repro payload `{"reason":"spam","days":1}` → **HTTP 400**
  `details.banReason: ["Please provide a ban reason"]`.
- `{"banReason":"E2E fix3: δοκιμαστικός λόγος ban","banExpiresIn":3600}` →
  **200** · psql: `banned=t | banReason='E2E fix3: δοκιμαστικός λόγος ban' |
  banExpires=+1h` ✔
- Unban → **200** · psql: `banned=f`, `banReason` NULL (καθάρισμα όπως πριν).

## 4. Raw Python repr στο 401 body (C#2, cosmetic)

**Αιτία:** Τα SimpleJWT token errors (π.χ. blacklisted refresh) κουβαλούν dict
detail (`{'detail': …, 'code': 'token_not_valid', 'messages': […]}`)· ο
`json_exception_handler` (`backend/common/exceptions.py`) έκανε `str()` σε όλο
το dict → raw `ErrorDetail` repr στο `message`.

**Fix:** νέος helper `_plain_message` που εξάγει καθαρό string από
str/list/dict detail· στο generic branch του handler το `code` παίρνει το
specific `detail['code']` όταν υπάρχει (π.χ. `token_not_valid` — όπως και
πριν, μέσω default_code) και τα `messages` του SimpleJWT διατηρούνται
stringified στο `details`. Το envelope `{error:{code,message,details}}` μένει
απαράλλαχτο.

**Αρχείο:** `backend/common/exceptions.py`.

**Επαλήθευση (live):** δεύτερη χρήση ίδιου refresh στο
`/api/auth/token/refresh` → **HTTP 401**
`{"error":{"code":"token_not_valid","message":"Token is blacklisted","details":null}}`
— καθαρό string. Αντίστοιχα το epoch-revoked access δίνει
`message:"Session revoked"`.

## Τελικός έλεγχος

- `docker compose exec backend python manage.py check` → **0 issues** (και
  μετά τις αλλαγές).
- Restart backend container → `/api/health` 200 `{ok:true,db,redis,celery}`.
- Και οι 4 επαληθεύσεις ξανατρέξαν ΜΕΤΑ το restart (τα αποτελέσματα παραπάνω
  είναι από το restarted container).
- Λογαριασμός-αναλώσιμο που δημιουργήθηκε: `e2e-fix2-throwaway@example.com`
  (τρέχων κωδικός `Fix2Throw!e5f6`, unbanned) — ΤΟΠΙΚΟ-ΜΟΝΟ test credential.
- PAYMENTS/Worldline/Cardlink: δεν αγγίχτηκε τίποτα.
