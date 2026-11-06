# E2E Local Flows — Agent D: Λογαριασμός ΕΠΙΧΕΙΡΗΣΗΣ (company) — 2026-11-06

Κατάσταση: **ΟΛΟΚΛΗΡΩΜΕΝΟ**

**Σύνοψη: 42 έλεγχοι · ✅ 36 · ⚠️ 5 · ❌ 1 · 30 screenshots (`e2e-shots/D-01…D-30`).**
Κεντρικό συμπέρασμα parity: ο company στο νέο app συμπεριφέρεται ΟΠΩΣ στο παλιό — ίδιες φόρμες
παντού, διαφοροποίηση ΜΟΝΟ στο type-filtering υποκατηγοριών (✅ δουλεύει), στο /dir φίλτρο (✅)
και στο SEO label «Επιχείρηση» (✅). Κανένα company-only πεδίο δεν λείπει (ούτε υπήρχε στο παλιό).
Επιβεβαιωμένα σημερινά fixes: ΑΦΜ 400 αντί 500 (πρωινό #8), debug panel αφαιρέθηκε (#4),
share-review link σωστό origin (#7). Νέα ευρήματα: D1 (coverage save disabled — πιθανό regression
in-flight edits), D2 (σιωπηλές αποτυχίες mutations), D3 (αγγλικό generic toast αντί ελληνικού
detail στο ΑΦΜ), D4 (toast καλύπτει submit), D5 (pending /s/ 404-σελίδα με HTTP 200).

Συμπλήρωμα του κυρίως run (αρχείο `E2E-LOCAL-FLOWS-2026-11-06.md`): το πρωινό πέρασμα κάλυψε μόνο
τον τύπο «Επαγγελματίας» (freelancer). Εδώ: πλήρης κύκλος ΝΕΟΥ λογαριασμού τύπου **«Επιχείρηση»
(`company`)** — εγγραφή, onboarding, όλα τα profile tabs, δημόσιο προφίλ, υπηρεσία, ΑΦΜ (μετά το
σημερινό fix), /dir. Φωτογραφίες: `e2e-shots/D-*.jpg`.

## 0. Baseline parity (έρευνα στο oldnext/ πριν τους ελέγχους)

Στο ΠΑΛΙΟ app ο company ΔΕΝ έχει δικά του πεδία σε καμία φόρμα — company και freelancer μοιράζονται
τις ίδιες φόρμες (register/onboarding/profile tabs/verification/billing). Οι ΜΟΝΕΣ διαφορές:

- **Φιλτράρισμα υποκατηγοριών ανά τύπο**: κάθε pro υποκατηγορία έχει `type: company|freelancer`
  (ή κανένα = και τα δύο). Dataset: ~118 company / ~242 freelancer. Το onboarding/basic-info
  φιλτράρει με `filterTaxonomyByType(…, role)`.
- **Archives/directory**: φίλτρο τύπου («Όλοι / Μόνο Επαγγελματίες / Μόνο Επιχειρήσεις»),
  `?type=companies` → role=company, διαφορετικά SEO labels («Επιχειρήσεις»).
- **Πεδίο `Profile.size`** («Αριθμός Εργαζομένων»): υπάρχει στο schema και ρεντάρεται στο δημόσιο
  προφίλ (profile-features) ΟΤΑΝ έχει τιμή, αλλά **καμία φόρμα δεν το επεξεργάζεται** στο παλιό app
  (γέμιζε μόνο από το data migration). Άρα η απουσία του από τα tabs του νέου app = ΣΩΣΤΟ parity.
- **ΔΕΝ υπάρχουν πουθενά**: ΓΕΜΗ, εκπρόσωπος, έτος ίδρυσης, ξεχωριστό brandName. Το register έχει
  κοινό πεδίο «Επωνυμία / Όνομα» και για τους δύο τύπους.
- **Δημόσιο προφίλ (παλιό)**: ΔΕΝ δείχνει badge/label «Επιχείρηση» — δείχνει το label της
  υποκατηγορίας (που είναι ήδη company-flavored, π.χ. «Εταιρεία Πληροφορικής»). Το
  `profile-breadcrumb.tsx` που κάνει branch σε ρόλο υπάρχει αλλά ΔΕΝ χρησιμοποιείται.
- Gaps του νέου app που εντόπισε η έρευνα (προς επιβεβαίωση/διόρθωση, πέρα από τους UI ελέγχους εδώ):
  (α) στο register του νέου app λείπει ο έλεγχος του παλιού «πρέπει να επιλέξεις ρόλο πριν το
  Google signup» (old form-auth-register.tsx:189-196), (β) λείπει ο «stuck account» role picker στο
  onboarding (παλιό form-onboarding.tsx:121-130,600-631) για pro με role='user',
  (γ) να επιβεβαιωθούν τα redirects `/pros/*`,`/companies/*` → `/dir/*` στο νέο next.config.

## 1. Λογαριασμός δοκιμής (ΤΟΠΙΚΟ-ΜΟΝΟ — test credentials)

| Πεδίο | Τιμή |
|---|---|
| Email | e2e-company-d@example.com |
| Username | e2e-company-d |
| Password | `E2eCompD!6w4p8r` |
| Επωνυμία | E2E Company Δοκιμή ΕΠΕ |
| Τύπος | Επαγγελματικός → **Επιχείρηση** (role=company, type=pro) |
| Κατηγορία | Πληροφορική (xWJj-V) → **Εταιρεία Πληροφορικής** (if7Ifk, type=company) |

## 2. Πίνακας ελέγχων

### 2.1 Εγγραφή / Verification / Login

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| /register → Επαγγελματικός → κάρτες τύπου «Επαγγελματίας»/«Επιχείρηση» | ✅ | Icons User/Building, επιλογή «Επιχείρηση» highlighted (D-01) |
| Πεδία φόρμας company vs freelancer | ✅ | ΙΔΙΑ πεδία και για τους 2 τύπους: Επωνυμία/Όνομα, Email, Username, Κωδικός ×2, Όροι — **ακριβές parity με παλιό** (κοινό label «Επωνυμία / Όνομα») |
| Εγγραφή company μέσω UI | ✅ | → /register/success «Σχεδόν Έτοιμοι!» (D-02, D-03). DB: role=company, type=pro, step=EMAIL_VERIFICATION, displayName με ελληνικά ΟΚ |
| Email verification μέσω devVerificationToken (DB) + auto-login | ✅ | Ίδια διαδικασία §1 κυρίως MD· redirect σε λάθος host τοπικά (γνωστό ΠΡΟΒΛΗΜΑ 3 — αναπαράγεται και εδώ) |
| Login μέσω API (`identifier`+password) | ✅ | Χρησιμοποιήθηκε για το onboarding workaround |

### 2.2 Onboarding (company)

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| Δομή φόρμας: Εικόνα*/Κατηγορία*/Περιγραφή*/Τρόποι παροχής*/Δείγμα εργασιών | ✅ | ΙΔΙΑ βήματα με freelancer — σωστό parity (καμία company-only ενότητα, όπως και στο παλιό) |
| **Autocomplete κατηγορίας φιλτράρει ανά company** | ✅ | «πληροφορικ» → ΜΟΝΟ «Εταιρεία Πληροφορικής (Πληροφορική)», 1 αποτέλεσμα — ΟΧΙ «Σύμβουλος Πληροφορικής» (freelancer, αυτό έβλεπε ο A) (D-04). DB: 118 company / 242 freelancer υποκατηγορίες = ακριβώς το παλιό dataset |
| Debug panel στο τέλος της φόρμας (ΠΡΟΒΛΗΜΑ 4 πρωινού) | ✅ | **ΔΕΝ εμφανίζεται πλέον** — φαίνεται διορθωμένο από τα σημερινά fixes (D-05) |
| Bio editor + μετρητής | ✅ | 90/80 χαρακτήρες, rich-text OK |
| Coverage Online checkbox → panel «Εξυπηρετώ τους πελάτες εξ αποστάσεως» | ✅ | ΟΚ |
| Submit χωρίς εικόνα: ορατό feedback | ⚠️ | Κανένα μήνυμα/scroll-to-error — το κουμπί μένει απλώς «χλωμό»/ανενεργό χωρίς εξήγηση. Ίδιο με freelancer (ΠΡΟΒΛΗΜΑ 6 πρωινού — ισχύει και για company) (D-06) |
| Ολοκλήρωση μέσω API workaround (εικόνα Cloudinary demo) | ✅ | `POST /api/auth/onboarding/complete` → 200 «Καλώς ήρθες στο dashboard». DB: step=DASHBOARD, profile published=t, isActive=t, **profile.type=company**, category/subcategory σωστά |

### 2.3 Profile tabs (fill → save → reload → persisted;)

Tabs για company: Λογαριασμός / Βασικά στοιχεία / Τρόποι Παροχής / Επικοινωνία / Πρόσθετα Στοιχεία /
Πιστοποίηση — **ίδια 6 tabs με freelancer, κανένα company-only πεδίο πουθενά** (σωστό parity, βλ. §0).

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| Λογαριασμός: Email/Username locked, κοινό «Όνομα / Επωνυμία» | ✅ | Ίδιο με freelancer (D-07) |
| Λογαριασμός: αλλαγή επωνυμίας → save → reload | ✅ | Toast «Ο λογαριασμός ενημερώθηκε», initials EE→EV live, «…ΕΠΕ v2» επέμεινε (D-08) |
| Βασικά: κατηγορία/υποκατηγορία/bio persisted από onboarding | ✅ | Πληροφορική / Εταιρεία Πληροφορικής / bio 161 χαρ. (D-09) |
| Βασικά: tagline + 2 δεξιότητες + ειδικότητα → save → reload | ✅* | Επέμειναν (D-10, DB: skills {317,385}, speciality 385). *ΑΛΛΑ οι 2 πρώτες προσπάθειες χάθηκαν σιωπηλά — βλ. ΠΡΟΒΛΗΜΑ D2 |
| Βασικά: «+ Προσθήκη "<νέο skill>"» submission flow υπάρχει | ✅ | Ίδιο pattern με tags (δεν υποβλήθηκε νέο) |
| Τρόποι Παροχής: onbase panel, ΤΚ 10564 → auto Αθήνα Κέντρο/Αττικής | ✅ | Dependent πεδία ΟΚ (D-11) |
| Τρόποι Παροχής: SAVE μέσω UI | ❌ | Το «Αποθήκευση» μένει ΜΟΝΙΜΑ disabled με πλήρως συμπληρωμένη έγκυρη φόρμα — ΠΡΟΒΛΗΜΑ D1. Workaround: PATCH /api/profiles/me/coverage → 200, DB ΟΚ |
| Επικοινωνία: τηλέφωνο/ιστοσελίδα/εμφάνιση email/LinkedIn → save | ✅ | Toast «Τα στοιχεία προβολής ενημερώθηκαν» (D-12, D-13) |
| Πρόσθετα: τριπλέτα + Έναρξη/Ωριαία/Budget/Όροι | ✅ | Πεδία πανομοιότυπα με freelancer, **ΧΩΡΙΣ πεδίο «μέγεθος» (size)** = σωστό parity (D-14). Λόγω κλοπής session από sibling (βλ. σημ. περιβάλλοντος) η εγγραφή έγινε μέσω API → 200, DB ΟΚ (rate 45, 2018, methods {1,2}/{1,4}/{1,2}, budget 2, terms) |

**Σημείωση περιβάλλοντος (shared browser):** όλοι οι σημερινοί agents μοιράζονται το ίδιο Chrome και
(μετά από οδηγία συντονιστή) το ίδιο origin localhost:3100 → κοινό cookie jar. Κατά τη διάρκεια του
run η συνεδρία μου «κλάπηκε» 2+ φορές από logins άλλων agents (admin). Μερικά writes έγιναν μέσω
backend API με JWT του λογαριασμού μου για να αποκλειστεί cross-user εγγραφή. ΔΕΝ είναι bug της
εφαρμογής — περιορισμός του test setup.

### 2.4 ΑΦΜ / Πιστοποίηση (re-test του σημερινού fix)

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| Φόρμα: ΑΦΜ*/Επωνυμία*/Επαγγελματική Διεύθυνση*/Τηλέφωνο* | ✅ | Ίδια πεδία με freelancer (καμία company παραλλαγή = parity ΟΚ) |
| Υποβολή με ΑΦΜ «12345» | ⚠️ | **ΟΧΙ πια 500** — HTTP 400, ΤΙΠΟΤΑ δεν γράφεται στη DB (το fix του ΠΡΟΒΛΗΜΑΤΟΣ 8 δουλεύει). Το backend επιστρέφει ελληνικό field detail «Ο ΑΦΜ πρέπει να είναι ακριβώς 9 ψηφία» (details.afm), ΑΛΛΑ το UI toast δείχνει το ΓΕΝΙΚΟ αγγλικό top-level μήνυμα «One or more fields are invalid.» αντί του detail — βλ. ΠΡΟΒΛΗΜΑ D3 (D-23) |
| Υποβολή με έγκυρο ΑΦΜ 090000045 | ✅ | 200 «Η αίτηση επαλήθευσης υποβλήθηκε» + status PENDING. DB: verifications row PENDING/090000045 για e2e-company-d. Το tab μετά δείχνει state «Πιστοποίηση σε Εξέλιξη — Η αίτηση … σε κατάσταση αξιολόγησης» με κουμπί «Ενημέρωση Στοιχείων» (D-24). *Σημ.: η τελική υποβολή επιβεβαιώθηκε μέσω API γιατί στο UI το toast του προηγούμενου σφάλματος ΚΑΛΥΠΤΕ το κουμπί «Υποβολή Αιτήματος» (βλ. D4) και μετά χάθηκε το session (κοινός browser)* |
| Resubmit συμπεριφορά | ✅ | `update_or_create` — idempotent, ο κώδικας πλέον με `created_new` key (το fix σχολιασμένο in-code: «"created" is a reserved LogRecord attribute…») |
| Το row του e2e-pro-b (πρωινό) | ✅ | Άθικτο (APPROVED — εγκρίθηκε από admin σήμερα), καμία παρενέργεια |

### 2.5 Δημόσιο προφίλ company

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| /profile/e2e-company-d render | ✅ | Πλήρες, fresh αμέσως μετά από κάθε αλλαγή (cache invalidation ΟΚ) (D-18) |
| Type label «Επιχείρηση» | ✅ | Στο `<title>`/SEO: «E2E Company Δοκιμή ΕΠΕ v2 - **Επιχείρηση** - Εταιρεία Πληροφορικής…» (ο freelancer αντίστοιχα «Επαγγελματίας»). Στο ΣΩΜΑ της σελίδας δεν υπάρχει badge τύπου — ίδιο με το παλιό app (το label της company υποκατηγορίας «Εταιρεία Πληροφορικής» μεταφέρει τον τύπο) = parity ΟΚ |
| Breadcrumb | ✅ | Επαγγελματικός Κατάλογος > Πληροφορική > **Εταιρείες Πληροφορικής** (πληθυντικός της company υποκατηγορίας) |
| Έδρα/κάλυψη | ✅ | «Σταδίου 10, Αθήνα Κέντρο (Αττικής)» + badges Εξυπηρετεί: Online / Στην έδρα |
| Τριπλέτα «Επικοινωνία / Τρόποι Πληρωμής / Μέθοδος Εξόφλησης» | ✅ | Και οι 3 ενότητες με σωστές τιμές (Τηλ.κλήση+Email / Μετρητά+PayPal / Μετά την ολοκλήρωση+Προκαταβολή) + Ελάχιστο Budget 100€ + Όροι Συνεργασίας (D-19) — regression check πέρασε για company |
| Λοιπά | ✅ | 45€/ώρα, Έτη Εμπειρίας 8 (από 2018), Ιστοσελίδα/Τηλέφωνο/Email «Προβολή» (email visible toggle ΟΚ), δεξιότητες chips, bio, LinkedIn icon |

### 2.6 Υπηρεσία (wizard)

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| Wizard 5 βημάτων για company | ✅ | Πανομοιότυπος με freelancer: Τύπος (Φυσική/Online) → Τρόπος (Μιας φοράς/Συνδρομή) → Στοιχεία → Extra&FAQ → Πολυμέσα (D-25…D-29) |
| Στοιχεία: τίτλος/περιγραφή counters + min-80 validation | ✅ | «Η περιγραφή πρέπει να είναι τουλάχιστον 80 χαρακτήρες» εμφανίζεται σωστά inline |
| Κατηγορία: autocomplete service tree | ✅ | «eshop» → 3 αποτελέσματα, breadcrumb chips Πληροφορική > Ecommerce > Κατασκευή Eshop — το service tree ΔΕΝ φιλτράρεται ανά τύπο (σωστό, ίδιο με παλιό) |
| Τελική υποβολή μέσω UI | ⚠️ | Το server action POST απάντησε 200 αλλά ΔΕΝ δημιουργήθηκε υπηρεσία και ΔΕΝ εμφανίστηκε κανένα μήνυμα — το cookie ανήκε στον admin άλλου agent τη στιγμή της υποβολής (κοινός browser) και το action απέτυχε ΣΙΩΠΗΛΑ. Το «καμία ένδειξη σε αποτυχημένο mutation» είναι το γνωστό pattern ΠΡΟΒΛΗΜΑ 9 του πρωινού — βλ. D4. (D-30) |
| Δημιουργία μέσω API (workaround) | ✅ | `POST /api/services/` με JWT → 201 **#1089** «E2E Company Κατασκευή Eshop Δοκιμή», 300€/21 ημέρες, status **pending** (ΔΕΝ εγκρίθηκε — όπως ζητήθηκε) |
| /api/services/me λίστα | ✅ | Η 1089 εμφανίζεται στις υπηρεσίες του company (pending) |
| Δημόσιο /s/[slug] για pending | ✅/⚠️ | Ρεντάρει «Η σελίδα δεν βρέθηκε» (σωστό — pending δεν εκτίθεται), ΑΛΛΑ με HTTP status 200 αντί 404 (πιθανό Next streaming artifact — ελάσσον SEO θέμα, να επιβεβαιωθεί σε prod build) |

### 2.7 Κατάλογος /dir & αναζήτηση

| Έλεγχος | Αποτέλεσμα | Σχόλιο |
|---|---|---|
| /dir?type=companies | ✅ | 83 αποτελέσματα, chips μόνο company υποκατηγοριών, κάρτες με badge υποκατηγορίας (ΟΧΙ badge «Επιχείρηση» — ίδιο με παλιό) (D-20) |
| Εμφάνιση της νέας company | ✅ | /dir?type=companies&search=E2E → 1 αποτέλεσμα: η κάρτα της «E2E Company Δοκιμή ΕΠΕ v2» με «Εταιρεία Πληροφορικής», skills chips, «Εξυπηρετεί: Online & Αθήνα Κέντρο, Αττικής» — εμφανίστηκε ΑΜΕΣΩΣ μετά το onboarding (D-21) |
| In-page φίλτρο αναζήτησης του /dir | ⚠️ | Η πληκτρολόγηση + Enter στο in-page «Αναζήτηση...» δεν εφάρμοσε το φίλτρο άμεσα (τα αποτελέσματα έμειναν 83)· με `?search=` στο URL δουλεύει. Πιθανό debounce/UX θέμα — θέλει ένα χέρι επιβεβαίωσης (δεν επέμεινα λόγω χρόνου) |
| Header search suggestions | ✅ | «E2E Company» → μόνο «Αναζήτηση για "E2E Company"», καμία υπηρεσία — **αναμενόμενο**: η 1089 είναι pending/αδημοσίευτη (D-22) |

## 3. ΠΡΟΒΛΗΜΑΤΑ (αριθμημένα, πρόθεμα D)

1. **[Bug/P1-candidate] Το «Αποθήκευση» του tab Τρόποι Παροχής μένει μόνιμα disabled (δεν γίνεται save μέσω UI).**
   Με πλήρως έγκυρη φόρμα (Online ✓, Στον χώρο μου ✓, Διεύθυνση, Τ.Κ. 10564 → auto Περιοχή/Νομός)
   το κουμπί μένει `disabled` — `form-coverage.tsx:715` `disabled={isPending || !isValid || !isDirty}`,
   δηλ. το RHF `isValid` μένει false. Το `coverageSchema` (lib/validations/profile.ts:111, refine
   onbase) απαιτεί ΚΑΙ τα auto πεδία `area`/`county` — ύποπτο ότι δεν γεμίζουν στο form state όταν
   επιλέγεται ΤΚ, ή ότι το isValid μένει stale (υπάρχει ήδη in-flight σχόλιο στο αρχείο γρ. 266
   «Force a full re-validation so isValid … updates»). ΣΗΜΕΙΩΣΗ: ο A το πρωί έσωσε το ίδιο tab
   κανονικά → πιθανό REGRESSION από τα σημερινά (uncommitted) edits στο `form-coverage.tsx`. Να
   επανελεγχθεί μόλις σταθεροποιηθούν τα edits. Repro: login pro → /dashboard/profile/coverage →
   τσέκαρε «Στον χώρο μου», συμπλήρωσε όλα → το κουμπί δεν ενεργοποιείται ποτέ. Workaround που
   χρησιμοποιήθηκε: `PATCH /api/profiles/me/coverage` → 200.
2. **[Bug ⚠️, επέκταση του πρωινού #9] Αποτυχημένα saves συνεχίζουν να χάνονται ΣΙΩΠΗΛΑ.**
   (α) Στα Βασικά στοιχεία, 2 διαδοχικά saves χάθηκαν με «Server Action not found» (stale action
   IDs από hot-reload — ο sibling επεξεργαζόταν frontend αρχεία εκείνη την ώρα): το 1ο χωρίς ΚΑΝΕΝΑ
   μήνυμα, το 2ο με dev overlay μόνο. Μετά από fresh reload το save πέρασε (DB ΟΚ).
   (β) Στην τελική υποβολή του service wizard, server action 200 με app-level αποτυχία (auth άλλου
   χρήστη λόγω κοινού browser) → κανένα feedback, το κουμπί απλά «δεν κάνει τίποτα».
   Και τα δύο είναι το ίδιο μοτίβο με το πρωινό ΠΡΟΒΛΗΜΑ 9: τα mutations χρειάζονται error
   handling + ορατό μήνυμα αποτυχίας (ισχύει ΚΑΙ σε production deploys όπου τα action IDs αλλάζουν).
3. **[UX/i18n] Το toast του ΑΦΜ validation δείχνει το γενικό αγγλικό μήνυμα αντί του ελληνικού detail.**
   Το backend (μετά το σημερινό fix) επιστρέφει σωστά 400 με
   `details.afm = ["Ο ΑΦΜ πρέπει να είναι ακριβώς 9 ψηφία"]` αλλά top-level
   `message = "One or more fields are invalid."` (DRF generic) — και το frontend toast εμφανίζει το
   top-level. Ο χρήστης βλέπει αγγλικό, μη-ενημερωτικό μήνυμα. Πρόταση (parity-safe): ο error
   handler του toast να προτιμά το πρώτο field detail όταν code=validation_error· ή το backend να
   βάζει το detail και στο top-level message. Συγγενές με το πρωινό C#2 (raw repr σε 401).
   Βλ. e2e-shots/D-23.
4. **[UX] Το toast κάλυπτε το κουμπί «Υποβολή Αιτήματος» στη φόρμα Πιστοποίησης.**
   Το error toast (κάτω-δεξιά) εμφανίζεται ΠΑΝΩ από το submit button της φόρμας· μέχρι να κλείσει,
   τα κλικ πάνε στο toast. Μικρό αλλά ενοχλητικό — πρόταση parity-safe: offset του toast container
   ή dismiss-on-click.
5. **[Ελάσσον/SEO] Το δημόσιο /s/[slug] pending υπηρεσίας γυρίζει 404-σελίδα με HTTP 200.**
   Το περιεχόμενο είναι σωστά «Η σελίδα δεν βρέθηκε», αλλά το status ήταν 200 (πιθανό Next
   streaming/dev artifact). Να επιβεβαιωθεί σε production build ότι επιστρέφεται πραγματικό 404.
6. **[Παρατήρηση — όχι bug εφαρμογής] Session wars στο κοινό Chrome.** Βλ. σημείωση §2.3 — τα
   κλεψίματα session μεταξύ agents στο ίδιο origin προκάλεσαν τα περισσότερα «κολλήματα» του run
   (και το D2β). Για μελλοντικά parallel E2E: ένας agent ανά origin ή σειριακά.

Διορθωμένα από τα σημερινά fixes, επιβεβαιωμένα εδώ: πρωινό **#4** (debug panel onboarding —
ΔΕΝ εμφανίζεται πια), πρωινό **#7** (share-review link δείχνει πλέον `localhost:3100/...` αντί
hardcoded doulitsa.gr — D-15), πρωινό **#8** (ΑΦΜ 500 → πλέον 400 με validation + γράφεται ΜΟΝΟ
έγκυρο αίτημα, logger key `created_new`).

## 4. Σχόλια ανά φωτογραφία (e2e-shots/D-*.jpg)

- **D-01-register-company-type-selected.jpg** — Register pro με κάρτα «Επιχείρηση» επιλεγμένη. ΟΚ — ίδια πεδία με freelancer (parity).
- **D-02-register-company-filled.jpg** — Φόρμα συμπληρωμένη (επωνυμία/email/username/κωδικοί/όροι). ΟΚ.
- **D-03-register-success.jpg** — «Σχεδόν Έτοιμοι!» + resend κουμπί. ΟΚ.
- **D-04-onboarding-company-category-filter.jpg** — Autocomplete «πληροφορικ» → ΜΟΝΟ «Εταιρεία Πληροφορικής». ΟΚ ✅ — το type-filtering λειτουργεί (κρίσιμο company check).
- **D-05-onboarding-end-no-debug-panel.jpg** — Τέλος φόρμας onboarding ΧΩΡΙΣ debug panel. ΟΚ — το πρωινό ΠΡΟΒΛΗΜΑ 4 διορθωμένο.
- **D-06-onboarding-submit-no-image-no-feedback.jpg** — Submit χωρίς εικόνα: κανένα μήνυμα, κουμπί «χλωμό». 🐞 πρωινό ΠΡΟΒΛΗΜΑ 6 ισχύει και για company. 💡 Inline error + scroll-to-error (να επιβεβαιωθεί το παλιό behavior πριν αλλάξει).
- **D-07-account-tab-company.jpg** — Tab Λογαριασμός: Email/Username locked, «Όνομα / Επωνυμία». ΟΚ.
- **D-08-account-saved-toast.jpg** — Toast «Ο λογαριασμός ενημερώθηκε», initials live. ΟΚ.
- **D-09-basic-tab-persisted-top.jpg** — Βασικά: κατηγορία «Εταιρεία Πληροφορικής» persisted από onboarding. ΟΚ.
- **D-10-basic-persisted-after-reload.jpg** — Tagline/skills/speciality μετά reload. ΟΚ (μετά το D2α).
- **D-11-coverage-filled-auto-area.jpg** — ΤΚ 10564 → auto «Αθήνα Κέντρο»/«Αττικής». ΟΚ ως render· 🐞 D1: το Αποθήκευση δεν ενεργοποιείται.
- **D-12-contact-tab-company.jpg / D-13-contact-saved-toast.jpg** — Επικοινωνία άδεια / «Τα στοιχεία προβολής ενημερώθηκαν». ΟΚ.
- **D-14-additional-tab-company-no-size.jpg** — Πρόσθετα: τριπλέτα+Έναρξη+Ωριαία+Budget+Όροι, ΧΩΡΙΣ size. ΟΚ — parity με παλιό (size πουθενά editable).
- **D-15-dashboard-company-first-login.jpg** — Pro dashboard company με modal «πρώτη υπηρεσία». ΟΚ — το share-review box δείχνει πλέον localhost origin (πρωινό #7 διορθωμένο).
- **D-16-additional-persisted-after-reload.jpg** — Τα Πρόσθετα (γραμμένα μέσω API) ρεντάρουν πλήρως στο UI. ΟΚ.
- **D-17-coverage-reload-after-api-write.jpg** — Coverage reload: φόρτωσε τα αποθηκευμένα· στο στιγμιότυπο η Περιοχή δείχνει «Αιγάλεω» από λάθος area id του πρώτου API write (δικό μου data-λάθος, διορθώθηκε σε «Αθήνα Κέντρο»/id 52). ΟΚ ως render check.
- **D-18-public-profile-top.jpg** — Δημόσιο προφίλ company: title «…- Επιχείρηση -…», breadcrumb «Εταιρείες Πληροφορικής», έδρα, 45€/ώρα, badges. ΟΚ ✅.
- **D-19-public-profile-triplet.jpg** — Τριπλέτα + Budget + Όροι. ΟΚ — regression πέρασε.
- **D-20-dir-companies-filter.jpg** — /dir?type=companies: 83 αποτελέσματα, company chips. ΟΚ — καμία badge τύπου στην κάρτα (ίδιο με παλιό).
- **D-21-dir-companies-search-card.jpg** — Η κάρτα της νέας company στο /dir. ΟΚ ✅ fresh.
- **D-22-header-search-no-suggestions.jpg** — Header search «E2E Company»: μόνο «Αναζήτηση για…». ΟΚ — pending υπηρεσία, αναμενόμενο.
- **D-23-afm-invalid-400-toast.jpg** — ΑΦΜ «12345»: toast «One or more fields is invalid.». ✅ όχι 500 / ❌ δεν γράφτηκε τίποτα· 🐞 D3: αγγλικό generic αντί του ελληνικού detail. 💡 toast να δείχνει details.afm.
- **D-24-afm-pending-state.jpg** — Tab Πιστοποίηση μετά το έγκυρο αίτημα: «Πιστοποίηση σε Εξέλιξη» + «Ενημέρωση Στοιχείων». ΟΚ ✅. 💡 Parity-safe: τα πεδία της φόρμας ενημέρωσης θα μπορούσαν να προσυμπληρώνονται με τα υποβληθέντα.
- **D-25…D-29 (wizard-step1/2/3/4/5)** — Τα 5 βήματα του wizard για company: κάρτες τύπου/τρόπου, στοιχεία με counters+inline min-80 error, breadcrumb κατηγορίας, extras/FAQ, πολυμέσα. ΟΚ — πανομοιότυπα με freelancer.
- **D-30-wizard-submit-silent-fail.jpg** — Τελικό «Δημιουργία υπηρεσίας»: POST 200, καμία δημιουργία, κανένα μήνυμα (session άλλου agent). 🐞 D2β — χρειάζεται ορατό error feedback στα mutations.

## 5. Δεν ελέγχθηκε / Περιορισμοί

- Πληρωμές/συνδρομές: **FROZEN** — δεν αγγίχτηκαν.
- Upload εικόνας προφίλ μέσω Cloudinary widget: μη αυτοματοποιήσιμο (όπως τεκμηριώθηκε το πρωί) — API workaround.
- Το save του coverage μέσω UI (D1) και η τελική υποβολή wizard μέσω UI (D2β) έγιναν μέσω backend API — UI flows μπλοκαρισμένα από D1/κοινό browser αντίστοιχα.
- Pause/delete υπηρεσίας, service edit για company: δεν ελέγχθηκαν (χρόνος — καλύφθηκαν για freelancer το πρωί).
- Google OAuth company (και το parity gap του missing role check — §0γ): δεν πατήθηκε (OAuth εκτός scope).

## 6. Τελική κατάσταση δεδομένων δοκιμής

- Λογαριασμός e2e-company-d@example.com: ενεργός, verified, step DASHBOARD, role=company, profile published/active (type=company).
- Υπηρεσία **1089** «E2E Company Κατασκευή Eshop Δοκιμή»: **pending** (ΔΕΝ εγκρίθηκε — εκκρεμεί δική σου έγκριση αν θες να δημοσιευτεί).
- Αίτημα πιστοποίησης ΑΦΜ 090000045 (E2E Company Δοκιμή ΕΠΕ): **PENDING** στον πίνακα verifications.
- Κανένας υπάρχων λογαριασμός/εγγραφή δεν τροποποιήθηκε (το verification row του e2e-pro-b επιβεβαιωμένα άθικτο).

