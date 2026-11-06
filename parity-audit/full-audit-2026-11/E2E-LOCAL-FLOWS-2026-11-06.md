# E2E Local Flows — Πλήρης δοκιμή ροών με λογαριασμούς (2026-11-06)

## ΣΥΝΟΛΙΚΗ ΣΥΝΟΨΗ (A+B+C, κλείσιμο 17:30)

Τρεις παράλληλοι agents, τρία αρχεία: αυτό (A — ροές+admin), `E2E-LOCAL-FLOWS-2026-11-06-B.md` (B — saved/reviews/chat), `E2E-LOCAL-FLOWS-2026-11-06-C.md` (C — API auth/authz/revoke).

**Σύνολο: ~107 έλεγχοι · ✅ ~88 · ⚠️ ~17 · ❌ 9 · 77 screenshots στο `e2e-shots/`.**

Προβλήματα προς διόρθωση (κωδικός → αρχείο):
- **P1**: A#8 ΑΦΜ submit 500 + μηδενικό validation · C#1 password change δεν κάνει revoke sessions · A#10 admin user-detail forms νεκρά στο UI
- **Bugs**: A#4 DEBUG panels · A#7 hardcoded doulitsa.gr (share-review-link.tsx:17) · A#11 hydration/TZ σε admin dates · A#9+B#1 saves χωρίς feedback/rollback · A#12 banReason δεν σώζεται · C#2 raw repr σε 401 μήνυμα · B#4 ο συντάκτης δεν βλέπει pending review
- **Αποφάσεις χρήστη**: A#5 cookie preselection ΟΝ (GDPR) · C#4 κανένα login throttle (απόφαση D-10) · B#3 φόρμα review χωρίς αστέρια (parity check με το παλιό)
- **Infra/τοπικά μόνο**: A#1+B#2 frontend OOM (Docker VM) · A#2 celery healthcheck cosmetic · A#3+C#3 verify-email λάθος host τοπικά

Επιβεβαιωμένα κρίσιμα ✅: profile tabs χωρίς wipes, addons/FAQ append, admin approve, taxonomy tag live αμέσως + duplicate→409, ban/unban, saved κύκλος, review pending flow + duplicate block, chat 2 κατευθύνσεων + badges + redirect, P0-6 revoke <1s, authz edges, maps ETag/304.

Εκκρεμή δεδομένα: review στο service 1088 **pending** (περιμένει δική σου έγκριση στο admin) · AFM request PENDING · όλα τα test accounts ενεργά.

---

Κατάσταση: **ΟΛΟΚΛΗΡΩΜΕΝΟ (scope agent A)** — λόγω deadline, τα sections αξιολογήσεις/chat/saved/settings/auth-edges/revoke ανατέθηκαν σε sibling agents (αρχεία `-B.md`/`-C.md`). Φωτογραφικό υλικό: `e2e-shots/` (55 αρχεία, σχολιασμένα στην §5).

**Σύνοψη:** ✅ 59 έλεγχοι πέρασαν · ⚠️ 10 με παρατήρηση · ❌ 8 απέτυχαν · 12 αριθμημένα προβλήματα (§4).
Κρισιμότερα: #8 (ΑΦΜ/Πιστοποίηση 500 σε κάθε υποβολή), #10 (admin user forms νεκρά στο UI), #11 (hydration/timezone σε admin dates), #1 (frontend OOM crashes τοπικά), #4 (debug panels ορατά), #7 (hardcoded doulitsa.gr).

## 1. Περιβάλλον & στήσιμο

- Repo: `/Users/sereth/Desktop/doulitsa-new-repo`, branch `test.v.0.0.3`, local docker stack (`docker-compose.yml` + `docker-compose.override.yml`).
- Frontend (Next.js 15 dev server): http://localhost:3100 — το container `django-backend-frontend-1` ΔΕΝ έτρεχε στην αρχή του ελέγχου· ξεκίνησε με `docker compose up -d frontend`.
- Backend (Django/DRF): http://localhost:8800 — `/api/health` → `{"ok":true,"db":true,"redis":true,"celery":true}`.
- Postgres: host port 5433 (`docker compose exec postgres psql -U django -d django`).
- Email delivery: ΔΕΝ δουλεύει τοπικά (χωρίς `BREVO_API_KEY` το `send_email` κάνει μόνο log "email skipped (Brevo not configured)" — ΔΕΝ γράφει token/link στο log).

### Celery worker «unhealthy» (εξήγηση)
Το `django-backend-celery-worker-1` φαίνεται **unhealthy** στο `docker compose ps` ενώ το `/api/health` λέει `celery:true`. Αιτία: ο worker χρησιμοποιεί το ίδιο image με το backend, και το `backend/Dockerfile` (γρ. 84) ορίζει `HEALTHCHECK` που κάνει `curl http://127.0.0.1:8000` — ο celery worker δεν σηκώνει web server, άρα το curl αποτυγχάνει πάντα (`curl: (7) Failed to connect to 127.0.0.1 port 8000`). Το compose δεν κάνει override/disable το healthcheck για το service `celery-worker`. Κοσμητικό bug υποδομής, όχι λειτουργικό — ο worker απαντά κανονικά σε ping (βλ. `/api/health`). Προτεινόμενη διόρθωση: `healthcheck: disable: true` ή celery-specific check (`celery inspect ping`) στο `docker-compose.yml`.

### Πώς γίνεται email verification τοπικά
- Σε DEBUG, η απάντηση του `POST /api/auth/register` περιέχει `devVerificationToken`.
- Τα tokens αποθηκεύονται και στον πίνακα `verification` (`identifier`=email, `value`=token).
- **Τι έγινε στην πράξη:** για κάθε λογαριασμό διαβάστηκε το token με
  `SELECT value FROM verification WHERE identifier='<email>' ORDER BY "createdAt" DESC LIMIT 1;`
  και άνοιξε στο browser το `http://localhost:3100/api/verify-email?token=<token>` (frontend proxy).
  Το verification πέτυχε (DB: `emailVerified=t`, `step` προχώρησε σωστά) και έκανε auto-login
  (cookies `dj_access`/`dj_refresh` μέσω του proxy) — αλλά το τελικό redirect πήγε σε λάθος host (βλ. ΠΡΟΒΛΗΜΑ 3).

### Ολοκλήρωση onboarding του pro (workaround)
- Το βήμα «Εικόνα Προφίλ» του /onboarding χρησιμοποιεί το Cloudinary Upload Widget (cross-origin iframe)
  που δεν αυτοματοποιείται από το browser extension (native file picker / iframe απρόσιτο).
- Workaround (τεκμηριωμένο data-fix): `POST http://localhost:8800/api/auth/onboarding/complete`
  με Bearer JWT (από `POST /api/auth/login`) και payload με τα ίδια δεδομένα που είχαν μπει στη φόρμα
  (category `xWJj-V` = Σύμβουλος Πληροφορικής, subcategory `CR2RY5`, bio, coverage online:true)
  και `image.secure_url = https://res.cloudinary.com/demo/image/upload/sample.jpg` (δημόσια demo εικόνα).
  Απάντηση: HTTP 200 `{"message":"Καλώς ήρθες στο dashboard"}` → step=DASHBOARD. Το υπόλοιπο UI flow του
  onboarding (validation, κατηγορία autocomplete, bio editor, coverage) ελέγχθηκε κανονικά μέσω UI.

### Πώς έγινε admin ο λογαριασμός
- Το frontend admin panel ελέγχει `user.role ∈ {admin, support, editor}` (AdminGuard → `requireAnyRole`).
- Προαγωγή μέσω psql: `UPDATE users SET role='admin' WHERE email='<email>';` (ο λογαριασμός ήταν ήδη verified με step DASHBOARD). Λεπτομέρειες παρακάτω.

## 2. Λογαριασμοί δοκιμών (ΤΟΠΙΚΟ-ΜΟΝΟ — test credentials, όχι πραγματικά στοιχεία)

| Ρόλος | Email | Username | Password | Σημειώσεις |
|---|---|---|---|---|
| Απλός χρήστης | e2e-user-a@example.com | (auto: e2e-user-a) | `E2eUserA!7k3m9x` | Εγγραφή μέσω UI, verified μέσω token |
| Pro (freelancer) | e2e-pro-b@example.com | e2e-pro-b | `E2eProB!4t8w2q` | Display name: E2E Pro Tester v2, onboarding ολοκληρώθηκε (API workaround για εικόνα). Υπηρεσία: ID 1088 «E2E Κατασκευή Ιστοσελίδας Δοκιμή» (slug e2e-kataskeui-istoselidas-dokimi-1088) |
| Admin | e2e-admin-c@example.com | (auto) | `E2eAdmin!9r2j7p` | Εγγραφή via API, μετά `UPDATE users SET role='admin', "emailVerified"=true, step='DASHBOARD'` μέσω psql |

(Προϋπήρχαν στη βάση seeded λογαριασμοί e2e-*@example.test από προηγούμενο run — δεν πειράχτηκαν.)

## 3. Πίνακας ελέγχων

(συμπληρώνεται σταδιακά — ✅ πέρασε / ⚠️ πέρασε με παρατήρηση / ❌ πρόβλημα)

### 3.1 Εγγραφή / Σύνδεση (ενότητα 1)

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| /register — επιλογή τύπου (Απλός/Επαγγελματικός) | ✅ | Δύο κάρτες, λειτουργεί η πλοήγηση + «Προηγούμενο Βήμα» |
| Cookie banner: «Προσαρμογή» → κατηγορίες → «Άρνηση» | ⚠️ | Λειτουργεί, ΑΛΛΑ οι μη απαραίτητες κατηγορίες (Απόδοση/Λειτουργικά/Marketing) είναι προ-ενεργοποιημένες ON στο panel ρυθμίσεων — αμφίβολο ως GDPR default (βλ. ΠΡΟΒΛΗΜΑ 5) |
| Validation: άκυρο email | ✅ | Μπλοκάρεται από native browser validation (type=email): «include an @» |
| Validation: κωδικός <6 χαρ. | ✅ | «Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες» |
| Validation: κωδικοί δεν ταιριάζουν | ✅ | «Οι κωδικοί δεν ταιριάζουν» |
| Validation: όροι χρήσης υποχρεωτικοί | ✅ | «Πρέπει να αποδεχτείς τους όρους χρήσης» |
| Κουμπί «Εγγραφή με Google» | ✅ | Ρεντάρει σε register & login (δεν πατήθηκε — OAuth εκτός scope) |
| Εγγραφή απλού χρήστη | ✅ | → /register/success?email=… «Σχεδόν Έτοιμοι!» |
| Εγγραφή pro (Επαγγελματίας/freelancer) | ✅ | Πεδία: Τύπος (Επαγγελματίας/Επιχείρηση), Επωνυμία, Email, Username, Κωδικοί |
| «Αποστολή email επιβεβαίωσης ξανά» | ✅ | Μήνυμα επιτυχίας + cooldown 60s («Αποστολή ξανά (58s)») |
| Email verification (μέσω token από DB) | ⚠️ | Πέτυχε + auto-login, αλλά redirect σε λάθος host — ΠΡΟΒΛΗΜΑ 3 |
| Login / Logout / Login ξανά | ✅ | Σύνδεση → /dashboard, Αποσύνδεση από user menu → homepage |
| Login με λάθος κωδικό | ✅ | «Λάθος email ή κωδικός πρόσβασης» — καθαρό, χωρίς enumeration |
| /forgot-password render + submit | ✅ | Μήνυμα «Αν το email υπάρχει…» (anti-enumeration)· email δεν στέλνεται τοπικά (Brevo off) |
| /forgot-password ως logged-in | ✅ | Redirect στο /dashboard (guard) |
| Pro onboarding: render + required πεδία | ✅ | Εικόνα/Κατηγορία/Περιγραφή/Τρόποι παροχής υποχρεωτικά, Δείγμα εργασιών προαιρετικό |
| Pro onboarding: debug panel ορατό | ❌ | Leftover debug UI — ΠΡΟΒΛΗΜΑ 4 (βλ. e2e-shots/02) |
| Pro onboarding: κατηγορία autocomplete | ✅ | «Πληροφορική» → πρόταση «Σύμβουλος Πληροφορικής (Πληροφορική)», επιλογή ΟΚ |
| Pro onboarding: bio editor + μετρητής 0/80 | ✅ | Rich-text (bold/italic/H2/H3/λίστες), μετρητής ενημερώνεται (148/80) |
| Pro onboarding: coverage checkboxes | ✅ | Online → εμφανίζει «Εξυπηρετώ εξ αποστάσεως»· «Στον χώρο μου» απαιτεί Διεύθυνση+ΤΚ (validation ΟΚ) |
| Pro onboarding: submit χωρίς εικόνα | ⚠️ | ΔΕΝ εμφανίζεται ορατό μήνυμα λάθους στο πεδίο εικόνας (μόνο στο debug panel) — βλ. ΠΡΟΒΛΗΜΑ 6 |
| Pro onboarding: upload εικόνας (Cloudinary widget) | ⚠️ | Το widget ανοίγει κανονικά (Αρχεία/Κάμερα tabs) — δεν αυτοματοποιείται (iframe), η ολοκλήρωση έγινε μέσω API (βλ. §1) |
| Ολοκλήρωση onboarding → pro dashboard | ✅ | step→DASHBOARD, pro sidebar (Διαχείριση Υπηρεσιών κ.λπ.), modal «Δημιούργησε την πρώτη σου υπηρεσία» |

### 3.2 Pro onboarding + επεξεργασία προφίλ (ενότητα 2)

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| Λογαριασμός: αλλαγή Όνομα/Επωνυμία + save + reload | ✅ | Toast «Ο λογαριασμός ενημερώθηκε», τιμή & avatar initials άλλαξαν και επέμειναν (e2e-shots/06,07) |
| Λογαριασμός: Email/Username κλειδωμένα | ✅ | Disabled πεδία· αλλαγή username μέσω dialog (ελέγχεται στην §3.7) |
| Βασικά: κατηγορία/υποκατηγορία/bio persisted από onboarding | ✅ | Πληροφορική / Σύμβουλος Πληροφορικής / bio 196 χαρ. (e2e-shots/10) |
| Βασικά: tagline + save + reload | ✅ | «E2E Σύμβουλος Πληροφορικής & Web» 32/100 — επέμεινε |
| Βασικά: δεξιότητες (multi, 2/10) + ειδικότητα | ✅ | Backend Development + React.js, ειδικότητα Backend Development — επέμειναν |
| Βασικά: debug panel ορατό και εδώ | ❌ | isValid/Category Value/User ID κ.λπ. — επέκταση ΠΡΟΒΛΗΜΑΤΟΣ 4 |
| Βασικά: wipe-regression (άλλα πεδία μετά από save) | ✅ | Τίποτα δεν σβήστηκε μετά από save+reload — το παλιό regression ΔΕΝ αναπαράγεται |
| Δείγμα εργασιών: upload στο Cloudinary + save + reload | ✅ | POST api.cloudinary.com 200, αρχείο σε users/e2e-pro-b/portfolio, badge «Uploaded» επέμεινε (e2e-shots/11,12) — ΣΗΜΕΙΩΣΗ: το portfolio έχει ΔΙΚΟ του κουμπί «Αποθήκευση Αρχείων»· επιλογή αρχείου + save της φόρμας ΔΕΝ το ανεβάζει (βλ. 💡 στο 5) |
| Τρόποι Παροχής: Online/Στον χώρο μου/Στον χώρο του πελάτη | ✅ | Τα τρία panels ανοίγουν σωστά με dependent validation |
| Τρόποι Παροχής: Διεύθυνση + Τ.Κ. → auto Περιοχή/Νομός | ✅ | 10564 → Αθήνα Κέντρο / Αττικής (auto, read-only) |
| Τρόποι Παροχής: Νομοί + Περιοχές multi-selects | ✅ | Αττικής → περιοχές searchable, chips |
| Τρόποι Παροχής: save + reload + DB | ✅ | Toast «Η κάλυψη ενημερώθηκε», DB: onbase/onsite true, address, zipcode 188, counties ["2"], areas ["57"] — ⚠️ στην 1η προσπάθεια το frontend container κράσαρε και το save χάθηκε (ΠΡΟΒΛΗΜΑ 1) |
| Επικοινωνία: τηλέφωνο/Viber/WhatsApp/Ιστοσελίδα/Εμφάνιση email | ✅ | Όλα αποθηκεύτηκαν & επέμειναν (e2e-shots/16,17) |
| Επικοινωνία: Κοινωνικά Δίκτυα (LinkedIn + URL) | ✅ | Chip + URL input, επέμεινε |
| Πρόσθετα: Μέθοδοι Επικοινωνίας/Πληρωμής/Εξόφλησης (τριπλέτα) | ✅ | Τηλ.κλήση+Email / Μετρητά+PayPal / Μετά την ολοκλήρωση+Προκαταβολή — επέμειναν (e2e-shots/19,20) |
| Πρόσθετα: Έναρξη (2015), Ωριαία (35€), Budget (100€), Όροι | ✅ | Όλα επέμειναν μετά reload |
| Πεδίο «μέγεθος» (size) | — | Δεν υπάρχει για freelancer (πιθανόν μόνο για company) — δεν ελέγχθηκε |
| Πιστοποίηση (tab) | ❌ | Η υποβολή επιστρέφει ΠΑΝΤΑ HTTP 500 — ΠΡΟΒΛΗΜΑ 8 (βλ. §3.8) |
| Δημόσιο προφίλ /profile/e2e-pro-b | ✅ | Όλα τα αποθηκευμένα εμφανίζονται: όνομα v2, tagline, διεύθυνση έδρας, LinkedIn, 35€/ώρα, badges κάλυψης (Online/Στην έδρα/Στον χώρο σας), Έτη Εμπειρίας 11 (από 2015), Ιστοσελίδα/Τηλέφωνο/Email με «Προβολή», Περιοχές Εξυπηρέτησης (Αττικής), bio, δεξιότητες, portfolio εικόνα, Όροι Συνεργασίας, Ελάχιστο Budget (e2e-shots/24,25) — fresh ΑΜΕΣΩΣ (cache invalidation OK) |
| Η τριπλέτα «Επικοινωνία / Τρόποι Πληρωμής / Μέθοδος Εξόφλησης» στο δημόσιο προφίλ | ✅ | Εμφανίζονται και οι τρεις ενότητες με τις σωστές τιμές (regression check πέρασε) |
| 1η πλοήγηση στο δημόσιο προφίλ | ⚠️ | Μία φορά redirect πίσω στο /dashboard/profile/verification (transient, πιθανόν dev-server compile race) — δεν αναπαράχθηκε ξανά |

### 3.3 Υπηρεσίες CRUD (ενότητα 3)

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| Wizard 5 βημάτων (τύπος/τρόπος/στοιχεία/extras-FAQ/πολυμέσα) | ✅ | Βήματα με validation και progress indicators (e2e-shots/26-31) |
| Τίτλος/Περιγραφή (counters 32/100, 201/5000) | ✅ | Rich-text editor OK |
| Κατηγορία: autocomplete 3 επιπέδων | ✅ | «ιστοσελ» → 7 αποτελέσματα, breadcrumb chips Πληροφορική > Κατασκευή Ιστοσελίδων > Κατασκευή Ιστοσελίδας |
| Tags: επιλογή υπάρχοντος (WordPress) | ✅ | Searchable dropdown |
| Tags: ΝΕΟ tag «E2E Test Tag 2026» (submission flow) | ✅ | «+ Προσθήκη …» → πορτοκαλί chip + «1 επιλεγμένο tag υπό έγκριση» (e2e-shots/28) |
| Τιμή/Απόκρυψη τιμής/Ημέρες παράδοσης | ✅ | 250€ / 14 ημέρες |
| Extra υπηρεσία + FAQ στο wizard | ✅ | counters, delete icons (e2e-shots/30) |
| Πολυμέσα upload (gallery) | ✅ | Cloudinary ανέβηκε στο save (users/e2e-pro-b/services/media/…) |
| Δημιουργία → «Υπό Έλεγχο» (pending) | ✅ | ID 1088, toast «Η υπηρεσία υποβλήθηκε προς έλεγχο» — δημοσίευση ΜΟΝΟ μέσω admin approval (e2e-shots/32) |
| Λίστα /dashboard/services | ✅ | Counters ανά status, search, φίλτρα (e2e-shots/33) |
| Edit: όλα τα πεδία φορτώνουν σωστά | ✅ | Τίποτα χαμένο (e2e-shots/34) |
| Edit: αλλαγή addon τιμής (80→95) + ΠΡΟΣΘΗΚΗ 2ου addon | ✅ | DB: 2 addons — το 1ο ενημερώθηκε, το 2ο προστέθηκε, κανένα replace/wipe |
| Edit: προσθήκη 2ου FAQ | ✅ | DB: 2 FAQs — append σωστό, τα υπόλοιπα πεδία άθικτα (regression νεκρό και εδώ) |
| ⚠️ 1η προσπάθεια save addons | ⚠️ | «Server Action not found» (stale action IDs μετά το restart του dev server) → ατέρμονο spinner ΧΩΡΙΣ μήνυμα λάθους — βλ. ΠΡΟΒΛΗΜΑ 9β |
| Δημόσια /s/[slug] πλήρης | ✅ | curl: τίτλος, 2 tags (και το νεο-εγκεκριμένο), 2 addons, 2 FAQs, pro card, τιμή — όλα FOUND αμέσως μετά το approve |
| Εμφάνιση σε /ipiresies + header search | — | Δεν ελέγχθηκε από εμένα (ανατέθηκε σε sibling agent B) |
| Pause/unpublish + delete | — | Δεν ελέγχθηκε (χρόνος) — το «Διαγραφή υπηρεσίας» κουμπί υπάρχει στο edit page |

### 3.4 Αποθηκευμένα (ενότητα 4)

Ανατέθηκε σε sibling agent (βλ. -B.md/-C.md) — δεν ελέγχθηκε εδώ.

### 3.5 Αξιολογήσεις (ενότητα 5)

Ανατέθηκε σε sibling agent (βλ. -B.md/-C.md) — δεν ελέγχθηκε εδώ.

### 3.6 Μηνύματα / Chat (ενότητα 6)

Ανατέθηκε σε sibling agent (βλ. -B.md/-C.md) — δεν ελέγχθηκε εδώ.

### 3.7 Ρυθμίσεις λογαριασμού (ενότητα 7)

Μερικώς: αλλαγή display name (pro) ✅ — βλ. §3.2. Τα υπόλοιπα (κωδικός, username, email-change, notifications, διαγραφή λογαριασμού) ανατέθηκαν σε sibling agents.

### 3.8 ΑΦΜ / Στοιχεία τιμολόγησης (ενότητα 8)

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| Φόρμα Πιστοποίησης (ΑΦΜ/Επωνυμία/Διεύθυνση/Τηλέφωνο) render | ✅ | /dashboard/profile/verification (e2e-shots/21) |
| Υποβολή με ΑΚΥΡΟ ΑΦΜ («12345») | ❌ | HTTP 500 (raw toast) ΚΑΙ το άκυρο ΑΦΜ αποθηκεύτηκε στη DB — καμία validation client/server — ΠΡΟΒΛΗΜΑ 8 (e2e-shots/22) |
| Υποβολή με έγκυρο ΑΦΜ (090000045) | ❌ | Επίσης HTTP 500, ΑΛΛΑ η εγγραφή γράφεται (verifications: status PENDING) και το email task εκτελείται — ο χρήστης βλέπει σφάλμα ενώ το αίτημα καταχωρήθηκε — ΠΡΟΒΛΗΜΑ 8 (e2e-shots/23) |
| Billing form (promote/checkout) | — | Βλ. §3.9/§5β — read-only λόγω PAYMENTS FROZEN |

### 3.9 Admin panel (ενότητα 9)

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| Login ως role=admin → redirect /admin | ✅ | AdminGuard δέχεται, dashboard με stats (732 services, 632 users κ.λπ.) (e2e-shots/38) |
| Services: detail σελίδα 1088 | ✅ | Κάρτες info/status/pricing/activity, σωστά τα FAQ Items 2 / Addons 2 (e2e-shots/39) |
| Services: approve (pending → Published) + Save | ✅ | Status badge «published», DB status=published, addons/faq ΑΘΙΚΤΑ (κανένα wipe από admin save) (e2e-shots/40) |
| Taxonomy submissions: λίστα + stats | ✅ | Stats cards, search, filters, pending/approved/rejected badges (e2e-shots/41) |
| Taxonomy submissions: approve ΝΕΟΥ tag μέσω UI | ⚠️ | Το ✓ ΔΕΝ λειτούργησε μέσω UI γιατί το dev hydration-error overlay (ΠΡΟΒΛΗΜΑ 11) έκλεβε τα clicks — έγινε μέσω admin API: 200 `{assignedId:1341, published:true}`. Το tag εμφανίστηκε ΑΜΕΣΩΣ στο δημόσιο /s/1088 |
| Taxonomy submissions: duplicate re-submit | ✅ | `POST /api/taxonomy/submissions` με ίδιο label → HTTP 409 `duplicate_dataset` «Το tag "E2E Test Tag 2026" υπάρχει ήδη» |
| Users: λίστα + search + pagination | ✅ | Search «e2e-user-a» φιλτράρει σωστά (?search= στο URL), σελιδοποίηση 53 σελίδες (e2e-shots/44) |
| Users: detail σελίδα | ✅ | Πλήρεις κάρτες account/status/ban/sessions/connected accounts + Danger Zone (e2e-shots/45) |
| Users: Account Information save (display name) | ❌ | Το «Αποθήκευση» ΔΕΝ στέλνει request (κανένα network call, κανένα μήνυμα) — ΠΡΟΒΛΗΜΑ 10 |
| Users: Ban User (UI) | ❌ | Το κουμπί «Ban User» μένει ΜΟΝΙΜΑ disabled με συμπληρωμένα reason+duration (και με κανονική πληκτρολόγηση) — ΠΡΟΒΛΗΜΑ 10 |
| Users: ban/unban (backend API) | ✅ | POST ban → banned=t, POST unban → banned=f· role/type/step/emailVerified/confirmed ΑΘΙΚΤΑ (no-wipe OK). ⚠️ το banReason έμεινε κενό στη DB (ΠΡΟΒΛΗΜΑ 12). Ο χρήστης ΞΕ-μπαναρίστηκε αμέσως |
| Users: verify/feature toggles, status save | — | Δεν ελέγχθηκε (χρόνος + το form state πρόβλημα 10 καθιστά αναξιόπιστο το UI) |
| Reviews moderation / Blog admin / Stats (Athens TZ) / Billing read-only | — | Δεν ελέγχθηκε από εμένα (sibling agents / χρόνος) — ΣΗΜΕΙΩΣΗ: το hydration bug (ΠΡΟΒΛΗΜΑ 11) είναι ένδειξη ότι τα dates στο admin ΔΕΝ ρεντάρονται σταθερά σε Athens TZ server-side |

### 3.10 Session revoke (ενότητα 10)

Ανατέθηκε σε sibling agent. Σημείωση: το κουμπί «Revoke All Sessions» υπάρχει στο admin user detail (e2e-shots/45) και τα admin endpoints επιβεβαιώθηκαν ότι υπάρχουν (urls/admin.py).

### 3.11 Authorization edges (ενότητα 11)

Ανατέθηκε σε sibling agent. Παρατηρήθηκε πάντως: /forgot-password redirect για logged-in ✅, AdminGuard δέχτηκε role=admin ✅, pro χωρίς admin ρόλο δεν είδε /admin στο sidebar.

### 3.12 Console/Network hygiene (ενότητα 12)

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| Console errors σε admin submissions | ❌ | Hydration mismatch (ΠΡΟΒΛΗΜΑ 11) |
| Network: 503 bursts σε POST /dashboard/services/create | ⚠️ | Κατά το restart του frontend (ΠΡΟΒΛΗΜΑ 1) |
| Network: 404 res.cloudinary.com/.../sample (avatar) | ⚠️ | Artifact του API workaround (demo URL σε ξένο cloud) — όχι bug της εφαρμογής |
| Λοιπές σελίδες (register/login/dashboard/profile tabs/public) | ✅ | Κανένα απρόσμενο console error / 4xx-5xx παρατηρημένο στα δείγματα που κοιτάχτηκαν |

## 4. ΠΡΟΒΛΗΜΑΤΑ (αριθμημένα)

1. **[Infra] Το frontend container πεθαίνει με OOM-kill.** Στην αρχή του ελέγχου το
   `django-backend-frontend-1` δεν έτρεχε καθόλου· μετά από `docker compose up -d frontend`
   σκοτώθηκε ξανά από τον kernel OOM killer (docker inspect: `OOM=true`, Status=exited) ενώ
   compile-αρε routes. Αιτία: Turbopack dev χωρίς όριο heap σε Docker VM 7.6GiB που μοιράζεται
   με τα parkit_* containers (~2.4GiB). Workaround που εφαρμόστηκε (τεκμηρίωση, προσωρινό αρχείο
   docker-compose.override.yml): `NODE_OPTIONS=--max-old-space-size=3072` + `restart: unless-stopped`.
   Μετά από αυτό σταθερό σε όλο το run. Πρόταση: μόνιμο mem limit/NODE_OPTIONS στο compose για dev.
2. **[Infra/κοσμητικό] celery-worker πάντα «unhealthy» στο docker ps.** Ο worker κληρονομεί το
   HEALTHCHECK του backend image (`backend/Dockerfile:84` — curl στο `127.0.0.1:8000`), αλλά δεν
   τρέχει web server → το check αποτυγχάνει για πάντα, ενώ το `/api/health` λέει `celery:true`
   (ο worker απαντά σε ping). Fix: override/disable healthcheck για το service `celery-worker`
   στο docker-compose.yml (π.χ. `celery inspect ping`).
3. **[Config/⚠️] Το verify-email redirect καταλήγει σε λάθος host τοπικά.** Το
   `GET /api/verify-email?token=…` (frontend proxy → Django) επιστρέφει redirect που έφτασε στο
   `http://localhost:3000/dashboard` (ο «Parklynn» — άλλη εφαρμογή!) αντί για `localhost:3100`.
   Το Django χτίζει απόλυτο URL από το configured frontend origin (localhost:3000 στο compose),
   ενώ το frontend σερβίρεται στο 3100 (override). Τοπικό artifact του port remap — σε deployed
   env τα origins ταιριάζουν. Σημείωση: το auto-login (set-cookie) δουλεύει σωστά γιατί τα cookies
   μπαίνουν per-host (localhost) χωρίς port. Πρόταση: σχετικό (relative) redirect από το proxy route
   (`frontend/src/app/api/verify-email/route.ts` ξαναγράφει ήδη το location — θα μπορούσε να το
   κάνει relative) ή FRONTEND_URL env συνεπές με το published port.
4. **[Bug/UI] Leftover DEBUG panel στο /onboarding.** Στο κάτω μέρος της φόρμας onboarding
   εμφανίζεται dev-widget με `isValid / isDirty / Errors / Form Values / Manual Validation` και
   κουμπί «Trigger Validation», ορατό σε κανονικό χρήστη. Εκθέτει εσωτερική κατάσταση της φόρμας
   (και τα validation internals). Αναπαραγωγή: login ως pro με step=ONBOARDING → /onboarding →
   scroll στο τέλος. Ύποπτο αρχείο: το onboarding form component (frontend/src/components/forms/…
   onboarding) — πιθανό `<FormDebug>`/debug block που έμεινε. Βλ. e2e-shots/02-onboarding-debug-panel-bug.jpg.
5. **[UX/GDPR ⚠️] Cookie «Προσαρμογή»: οι μη απαραίτητες κατηγορίες είναι προεπιλεγμένες ΟΝ.**
   Στο panel ρυθμίσεων cookies τα toggles Απόδοση/Λειτουργικά/Marketing είναι ήδη ενεργά πριν ο
   χρήστης επιλέξει. Υπάρχει πάντως κουμπί «Άρνηση» που λειτουργεί. (Ίδια συμπεριφορά πιθανόν και
   στο παλιό app — θέλει επιβεβαίωση parity πριν αλλάξει.)
6. **[UX] Submit onboarding χωρίς εικόνα: κανένα ορατό feedback.** Με όλα τα άλλα πεδία έγκυρα
   και χωρίς εικόνα προφίλ, το πάτημα «Ολοκλήρωση Εγγραφής» δεν δείχνει κανένα μήνυμα/scroll στο
   πεδίο της εικόνας (το σφάλμα φαίνεται μόνο στο κρυφό-κανονικά debug panel). Ο χρήστης μένει
   χωρίς ένδειξη γιατί δεν προχωράει. Βλ. e2e-shots/03-onboarding-submit-no-image-no-feedback.jpg.
7. **[Bug] Hardcoded production URL στο «Share review link» του pro dashboard.** Το box
   «Θέλετε να συγκεντρώσετε περισσότερες αξιολογήσεις;» δείχνει ΠΑΝΤΑ
   `https://doulitsa.gr/profile/<username>#review` — hardcoded στο
   `frontend/src/components/dashboard/reviews/share-review-link.tsx:17`. Σε local/test περιβάλλον
   δείχνει λάθος origin (και στο test.doulitsa.gr θα στέλνει κόσμο στο production). Πρόταση:
   `NEXT_PUBLIC_APP_URL`/`window.location.origin`. Βλ. e2e-shots/04-pro-dashboard-first-login.jpg.
8. **[Bug/P1] Η υποβολή Πιστοποίησης (ΑΦΜ) επιστρέφει ΠΑΝΤΑ HTTP 500.**
   `POST /api/profiles/me/verification` σκάει στο
   `backend/apps/profiles/services/verification.py:53`:
   `logger.info("verification_submitted", extra={..., "created": created})` — το key `created`
   είναι δεσμευμένο attribute του `LogRecord` → `KeyError: "Attempt to overwrite 'created' in LogRecord"`.
   Συνέπειες: (α) ο χρήστης βλέπει raw toast «HTTP 500» σε ΚΑΘΕ υποβολή (και με έγκυρο ΑΦΜ),
   (β) η εγγραφή ΟΜΩΣ αποθηκεύεται (verifications: status PENDING) και το
   `send_verification_request_email` task τρέχει πριν το crash — ο χρήστης νομίζει ότι απέτυχε
   και ξαναϋποβάλλει. Fix: μετονομασία του extra key (π.χ. `was_created`).
   Δευτερεύοντα: ΚΑΝΕΝΑ validation ΑΦΜ (το «12345» έγινε δεκτό και γράφτηκε στη DB) ούτε client
   ούτε server — στο παλιό app να επιβεβαιωθεί τι ίσχυε· και το frontend δείχνει raw «HTTP 500»
   αντί για φιλικό μήνυμα. Αναπαραγωγή: login ως pro → /dashboard/profile/verification →
   συμπλήρωση → Υποβολή Αιτήματος. Βλ. e2e-shots/22,23.
9. **[Bug ⚠️] Αποτυχημένα saves χωρίς κανένα feedback προς τον χρήστη.**
   (α) Κατά την 1η αποθήκευση του /dashboard/profile/coverage το dev container πέθανε/επανεκκίνησε
   (βλ. ΠΡΟΒΛΗΜΑ 1)· η φόρμα δεν έδειξε σφάλμα, και μετά το reload τα νέα στοιχεία είχαν χαθεί.
   (β) Στο service edit, μετά το restart του dev server, το save των addons απέτυχε με
   «Server Action was not found» (stale action IDs) → το κουμπί γύρισε σε ΑΤΕΡΜΟΝΟ spinner,
   κανένα μήνυμα, και τα δεδομένα χάθηκαν σιωπηλά μέχρι να γίνει reload+retry.
   Το (β) είναι εν μέρει dev-mode artifact, αλλά το pattern ισχύει και σε production deploys
   (action IDs αλλάζουν σε κάθε deploy): οι mutations χρειάζονται error handling + user feedback
   αντί για αιώνιο pending.
10. **[Bug/P1, Admin] Τα forms του admin user-detail δεν λειτουργούν (σιωπηλά).**
    Στο /admin/users/[id]: (α) το «Αποθήκευση» του Account Information (display name κ.λπ.)
    δεν στέλνει ΚΑΝΕΝΑ request (επιβεβαιωμένο με network capture) και δεν δείχνει κανένα σφάλμα —
    πιθανή αιτία: το required «Εικόνα Προφίλ*» μπλοκάρει το validation χωρίς μήνυμα για χρήστη
    χωρίς εικόνα. (β) Το κουμπί «Ban User» μένει ΜΟΝΙΜΑ disabled ακόμα και με πληκτρολογημένα
    Ban Reason + Duration — αδύνατον το ban μέσω UI. Το BACKEND δουλεύει κανονικά
    (`POST /api/admin/users/<id>/ban|unban` → 200, σωστές αλλαγές, κανένα wipe άλλων πεδίων),
    άρα είναι καθαρά frontend form-state bug. Ύποπτα αρχεία: τα admin user management form
    components (frontend/src/components/admin/…user…). Βλ. e2e-shots/46,47.
11. **[Bug] Hydration mismatch σε admin πίνακες — dates ρεντάρονται με διαφορετικό timezone σε SSR/client.**
    Στο /admin/taxonomies/submissions η στήλη Date ρεντάρεται «11:40» server-side και «16:40»
    client-side → React hydration error (overlay σε dev που μάλιστα ΜΠΛΟΚΑΡΕ τα approve clicks).
    Αρχείο από το overlay: `src/components/admin/admin-taxonomy-submission-table-section.tsx:67`
    (AdminTaxonomySubmissionDataTable, cell createdAt). Συνδέεται με το requirement «dates σε
    Europe/Athens»: το formatting πρέπει να γίνεται με σταθερό TZ και στα δύο περιβάλλοντα.
    Βλ. e2e-shots/43.
12. **[⚠️ Minor] Το banReason δεν αποθηκεύεται.** Μετά από επιτυχές
    `POST /api/admin/users/<id>/ban {"reason":"…","days":1}` (200, banned=true) το πεδίο
    `banReason` στη DB έμεινε κενό/null. Να ελεγχθεί ο serializer του AdminUserBanView
    (apps/accounts/views/admin/users.py).

## 5. Σχόλια ανά φωτογραφία (e2e-shots/)

- **01-onboarding-form-steps2-5.jpg** — Τα βήματα 2-5 της φόρμας onboarding (Κατηγορία, Περιγραφή, Τρόποι παροχής, Δείγμα εργασιών), άδεια. 💡 Parity-safe: στο πρώτο render τα runtime strings του dropzone εμφανίζονται με κενά («Μέχρι αρχεία (εικόνας…)» χωρίς τα νούμερα) — μικρο-θέμα υδάτωσης/copy.
- **02-onboarding-debug-panel-bug.jpg** — Το τέλος της φόρμας onboarding. 🐞 ΠΡΟΒΛΗΜΑ 4: ορατό leftover debug panel (isValid/Form Values/Manual Validation + «Trigger Validation»). 💡 Αφαίρεση του debug block (parity-safe).
- **02b-onboarding-debug-panel-alt.jpg** — Ίδια κατάσταση με το 02 (full-res frame). ΟΚ, καμία επιπλέον πρόταση.
- **03-onboarding-submit-no-image-no-feedback.jpg** — Μετά το πάτημα «Ολοκλήρωση Εγγραφής» χωρίς εικόνα. 🐞 ΠΡΟΒΛΗΜΑ 6: κανένα ορατό μήνυμα/scroll-to-error. 💡 Inline error στο πεδίο εικόνας + scroll στο πρώτο σφάλμα (να επιβεβαιωθεί το παλιό behavior — πιθανόν «αλλάζει συμπεριφορά»).
- **04-pro-dashboard-first-login.jpg** — Πρώτο login pro: modal «πρώτη υπηρεσία», pro sidebar. 🐞 ΠΡΟΒΛΗΜΑ 7: hardcoded doulitsa.gr στο share-review box.
- **05-profile-account-tab.jpg** — Tab Λογαριασμός (email/username locked, όνομα editable). ΟΚ, καμία πρόταση.
- **06-account-name-saved-toast.jpg** — Toast «Ο λογαριασμός ενημερώθηκε», avatar initials άλλαξαν live. ΟΚ.
- **07-account-name-persisted-after-reload.jpg** — Μετά από reload το όνομα επέμεινε. ΟΚ.
- **08-basic-tab-filled-before-save.jpg** — Βασικά στοιχεία συμπληρωμένα πριν το save. 🐞 Ορατό το debug panel και εδώ (ΠΡΟΒΛΗΜΑ 4 — εκθέτει και User ID).
- **09-basic-save-in-progress.jpg / 09b-basic-save-in-progress-2.jpg** — Spinner στο «Αποθήκευση» (~16s συνολικά). 💡 Parity-safe: το spinner χωρίς progress/timeout είναι φτωχό feedback για αργά saves.
- **10-basic-tab-persisted-after-reload.jpg** — Όλα τα πεδία επέμειναν μετά reload (κατηγορία/bio/tagline/skills/ειδικότητα). ΟΚ — το wipe-regression ΔΕΝ αναπαράγεται.
- **11-portfolio-uploaded-cloudinary.jpg** — Portfolio «Uploaded» badge μετά το «Αποθήκευση Αρχείων». 💡 Parity-safe: η επιλογή αρχείου + κύριο save ΔΕΝ ανεβάζει το αρχείο (θέλει το δικό του κουμπί) — εύκολο να χαθεί· ένα hint ή auto-upload θα βοηθούσε.
- **12-portfolio-persisted-after-reload.jpg / 12b** — Portfolio επέμεινε μετά reload. ΟΚ.
- **13-coverage-tab-filled-before-save.jpg / 13a-coverage-tab-initial.jpg** — Coverage tab (initial & συμπληρωμένο). ΟΚ — σωστά dependent fields (ΤΚ→Περιοχή/Νομός auto).
- **14-coverage-saved-toast.jpg** — Toast «Η κάλυψη ενημερώθηκε» (2η προσπάθεια — η 1η χάθηκε στο crash, ΠΡΟΒΛΗΜΑ 9α). ΟΚ.
- **15-contact-tab-empty.jpg** — Tab Επικοινωνία άδειο. ΟΚ.
- **16-contact-filled-saved.jpg / 17-contact-persisted-after-reload.jpg** — Στοιχεία επικοινωνίας αποθηκεύτηκαν και επέμειναν (τηλ/Viber/WhatsApp/site/email toggle/LinkedIn). ΟΚ.
- **18-additional-tab-empty.jpg / 19-additional-filled.jpg / 20-additional-persisted-after-reload.jpg** — Πρόσθετα στοιχεία: τριπλέτα μεθόδων + έτος/αμοιβή/budget/όροι, όλα επέμειναν. ΟΚ.
- **21-verification-tab-form.jpg / 21b** — Φόρμα Πιστοποίησης (ΑΦΜ). ΟΚ ως render.
- **22-afm-invalid-http500.jpg** — Υποβολή με ΑΦΜ «12345». 🐞 ΠΡΟΒΛΗΜΑ 8: raw toast «HTTP 500» + το άκυρο ΑΦΜ γράφτηκε στη DB. 💡 Client+server validation ΑΦΜ (9 ψηφία/checksum) — να ελεγχθεί τι έκανε το παλιό app.
- **23-afm-valid-http500.jpg** — Υποβολή με έγκυρο ΑΦΜ 090000045. 🐞 ΠΡΟΒΛΗΜΑ 8: πάλι «HTTP 500» ενώ η εγγραφή γράφτηκε (PENDING). 💡 Fix του logger extra key + φιλικό μήνυμα επιτυχίας.
- **24-public-profile-top.jpg** — Δημόσιο προφίλ: όλα τα στοιχεία σωστά. ΟΚ.
- **25-public-profile-portfolio.jpg / 25b** — Τριπλέτα «Επικοινωνία/Τρόποι Πληρωμής/Μέθοδος Εξόφλησης» + portfolio + όροι στο δημόσιο προφίλ. ΟΚ — regression check πέρασε.
- **26-service-wizard-step1.jpg → 31b** — Τα 5 βήματα του wizard δημιουργίας υπηρεσίας. ΟΚ. (στο 28: πορτοκαλί chip νέου tag «υπό έγκριση» — καλό UX pattern).
- **32-service-created-pending-review.jpg** — Επιτυχής υποβολή, ID #1088, badge «Υπό Έλεγχο». ΟΚ.
- **33-services-list-pending.jpg** — Λίστα υπηρεσιών pro με counters/φίλτρα. ΟΚ.
- **34-service-edit-loaded.jpg / 35-service-edit-addon2-filled.jpg** — Edit φόρμα με πλήρη δεδομένα, 2ο addon συμπληρωμένο. ΟΚ.
- **36-service-edit-addons-saved-toast.jpg** — Toast «Η υπηρεσία ενημερώθηκε» (2η προσπάθεια· η 1η = ΠΡΟΒΛΗΜΑ 9β stale server action). ΟΚ.
- **37-service-edit-faq2-filled.jpg** — 2ο FAQ συμπληρωμένο πριν το save. ΟΚ.
- **38-admin-dashboard.jpg** — Admin dashboard με stats + quick access. ΟΚ.
- **39-admin-service-1088-pending.jpg / 40-admin-service-1088-published.jpg** — Service detail πριν/μετά το approve (pending→published), addons/FAQ counts άθικτα. ΟΚ.
- **41-admin-submissions-list.jpg** — Taxonomy submissions λίστα/stats. ΟΚ ως λίστα.
- **42-admin-submissions-approve-attempt.jpg / 42b** — Αποτυχημένα approve clicks. 🐞 ΠΡΟΒΛΗΜΑ 11: το dev overlay έκλεβε τα clicks· κανένα request δεν έφυγε.
- **43-admin-submissions-hydration-overlay.jpg** — Το hydration error overlay με το diff «16:40 vs 11:40» και το αρχείο-πηγή. 🐞 ΠΡΟΒΛΗΜΑ 11. 💡 Date formatting με σταθερό TZ (Europe/Athens) και στο SSR και στον client (parity-safe διόρθωση).
- **44-admin-users-list.jpg** — Users λίστα με search/φίλτρα/pagination. ΟΚ.
- **45-admin-user-detail.jpg** — User detail: πλήρεις κάρτες. ΟΚ ως render.
- **46-admin-user-name-edit-no-request.jpg** — Συμπληρωμένο όνομα + Save χωρίς αποτέλεσμα. 🐞 ΠΡΟΒΛΗΜΑ 10α: κανένα request, κανένα feedback. 💡 Εμφάνιση validation errors του form (το required image μπλοκάρει σιωπηλά).
- **47-admin-ban-user-disabled.jpg** — Ban form συμπληρωμένο, κουμπί «Ban User» disabled. 🐞 ΠΡΟΒΛΗΜΑ 10β.

## 5β. Δεν ελέγχθηκε / Μπλοκαρισμένο

- Πληρωμές/συνδρομές/Worldline/Cardlink: **FROZEN** κατ' εντολή — ούτε read-only δεν προλάβαμε (χρόνος).
- Πραγματική αποστολή email (verification, forgot-password, email-change): δεν δουλεύει τοπικά (χωρίς Brevo).
- Google OAuth: ελέγχθηκε μόνο ότι το κουμπί υπάρχει/ρεντάρει — δεν πατήθηκε.
- Upload εικόνας ΠΡΟΦΙΛ μέσω UI (Cloudinary widget): μη αυτοματοποιήσιμο (cross-origin iframe / native picker) — η εικόνα μπήκε μέσω API. Το PORTFOLIO/gallery upload (απευθείας file input) ελέγχθηκε κανονικά και δουλεύει.
- **Ανατέθηκαν σε sibling agents (B, C):** αξιολογήσεις (υποβολή/moderation/εμφάνιση), chat/μηνύματα (live websocket), αποθηκευμένα (saved), ρυθμίσεις λογαριασμού (αλλαγή κωδικού/username, διαγραφή λογαριασμού), authorization edges, session revoke (P0-6), /ipiresies + header search για τη νέα υπηρεσία. Βλ. αρχεία `-B.md` / `-C.md`.
- Δεν ελέγχθηκε (χρόνος): pause/unpublish/delete υπηρεσίας, admin verify/feature toggles & status save, reviews moderation UI, blog admin (author picker), stats/analytics σελίδα (Athens TZ — αλλά βλ. ΠΡΟΒΛΗΜΑ 11), billing σελίδες read-only, πεδίο «μέγεθος» (μόνο company accounts).

## 6. Τελική κατάσταση δεδομένων δοκιμής

- Υπηρεσία 1088: **published** (εγκρίθηκε από admin), ορατή δημόσια στο /s/e2e-kataskeui-istoselidas-dokimi-1088.
- Tag «E2E Test Tag 2026»: **approved/published** (tag id 1341, slug e2e-test-tag-2026).
- Αίτημα πιστοποίησης ΑΦΜ (090000045 / E2E Pro Tester): **PENDING** στον πίνακα verifications.
- e2e-user-a: unbanned, ενεργός. e2e-pro-b: ενεργός. e2e-admin-c: role=admin.
- Το docker-compose.override.yml απέκτησε (τεκμηριωμένα) NODE_OPTIONS heap cap + restart policy για το frontend — προσωρινό αρχείο, ήδη σημειωμένο για διαγραφή μετά το E2E.
