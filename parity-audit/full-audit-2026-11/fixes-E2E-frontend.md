# Fixes E2E — Frontend (2026-11-06)

Διορθώσεις των frontend ευρημάτων του τοπικού E2E (κύριο αρχείο §4: #4, #7, #9, #10, #11 και
Agent B: B1, B4). Όλα επαληθεύτηκαν live στο http://localhost:3100 (dev container, HMR) με τους
λογαριασμούς δοκιμών του §2. `yarn tsc --noEmit` και `yarn lint` καθαρά. ΔΕΝ έγινε commit —
όλα στο working tree. Κανένα payments/billing αρχείο δεν αγγίχτηκε.

---

## FIX 1 (P1) — Admin user-detail forms νεκρά (ΠΡΟΒΛΗΜΑ 10)

**Τι άλλαξε**

- `frontend/src/components/forms/profile/form-account.tsx` (AccountForm, κοινό dashboard/admin):
  - Το submit περνάει πλέον από `form.handleSubmit(...)`, οπότε το validation τρέχει στο κλικ
    και τα λάθη εμφανίζονται ΟΡΑΤΑ στα `FormMessage` (πριν: raw `onSubmit` + κουμπί κλειδωμένο
    σε `!isValid` με `mode: 'onBlur'` → σιωπηλά νεκρό κλικ, κανένα μήνυμα).
  - Αφαιρέθηκε το `!isValid` από το disabled του «Αποθήκευση» (μένουν pending/uploading/`!isDirty`).
  - Το schema (`accountUpdateSchema`) είχε ήδη `image` optional — δεν απαιτείται εικόνα για save
    (επιβεβαιώθηκε με χρήστη χωρίς εικόνα).
  - Ο reducer του `useActionState` τυλίχτηκε σε try/catch: αν η κλήση του server action αποτύχει
    (network/stale action), γυρίζει error state → error toast αντί για κόλλημα.
- `frontend/src/components/admin/forms/edit-user-ban-form.tsx` (EditUserBanForm):
  - «Ban User»: `disabled={isPending}` ΜΟΝΟ (πριν: `|| !form.formState.isDirty` → μόνιμα disabled).
  - Το submit περνάει από `form.handleSubmit(...)` → κενό Ban Reason δείχνει ορατό μήνυμα
    «Please provide a ban reason» (το banReason input ήταν ήδη FormField — τώρα όντως δουλεύει).
  - Τα dispatch (`formAction`) τυλίχτηκαν σε `startTransition` (σωστή χρήση εκτός `<form action>`).
  - Reducer με try/catch (όπως πάνω) + το success-effect τρέχει μία φορά ανά αποτέλεσμα
    (handledStateRef): πριν, μετά το `router.refresh()` ξανάτρεχε με το νέο `user.banned` και
    έδειχνε ΑΝΑΠΟΔΑ toast («unbanned» μετά από ban).

**Επαλήθευση (live, admin e2e-admin-c, χρήστης e2e-user-a χωρίς εικόνα)**

- Account Information: αλλαγή «Όνομα / Επωνυμία» → Αποθήκευση → POST 200 στο network capture,
  toast «Ο λογαριασμός ενημερώθηκε επιτυχώς!», reload: η τιμή επέμεινε, DB: `displayName` ΟΚ και
  ΤΙΠΟΤΑ άλλο δεν σβήστηκε (banned/role/step/emailVerified αμετάβλητα).
- Ban: κουμπί ΕΝΕΡΓΟ σε active χρήστη· με reason → dialog → Confirm → banned=true στη DB, το
  panel δείχνει reason + «Ban Expires: 06/12/2026 12:34» (Athens). Unban μέσω UI → banned=false,
  banReason/banExpires καθαρίστηκαν. Ο χρήστης ΔΕΝ έμεινε banned.
- Κενό reason → ορατό validation error, κανένα dialog.

**Φωτό:** `e2e-shots/FIX-01-A-admin-account-save-toast.jpg`,
`FIX-01-B-admin-ban-flow-banned.jpg`, `FIX-01-C-admin-ban-validation-visible.jpg`

---

## FIX 2 — Leftover DEBUG panels (ΠΡΟΒΛΗΜΑ 4)

**Τι άλλαξε** — Τα debug panels αφαιρέθηκαν ΕΝΤΕΛΩΣ (όχι env-gated· το παλιό app δεν έχει τέτοια):

- `frontend/src/components/forms/profile/form-onboarding.tsx`: αφαιρέθηκε το μπλοκ
  «Debug Info» (isValid/isDirty/Errors/Form Values/Manual Validation + «Trigger Validation»).
- `frontend/src/components/forms/profile/form-basic-info.tsx`: αφαιρέθηκε το αντίστοιχο μπλοκ
  (εξέθετε και Username/User ID) + καθάρισμα του αχρησιμοποίητου πλέον `errors`.
- Grep σε όλο το `frontend/src`: κανένα άλλο «Debug Info» panel δεν υπάρχει.

**Επαλήθευση:** `/onboarding` (με προσωρινό `step='ONBOARDING'` στον e2e-pro-b μέσω psql, μετά
επαναφορά σε `DASHBOARD`) — η φόρμα τελειώνει στο «Ολοκλήρωση Εγγραφής», κανένα panel.
`/dashboard/profile/basic` — καθαρό μέχρι το τέλος.

**Φωτό:** `e2e-shots/FIX-02-A-onboarding-no-debug-panel.jpg`,
`FIX-02-B-profile-basic-no-debug-panel.jpg`

---

## FIX 3 — Hardcoded https://doulitsa.gr στο share review link (ΠΡΟΒΛΗΜΑ 7)

**Τι άλλαξε** — `frontend/src/components/dashboard/reviews/share-review-link.tsx`: το URL
χτίζεται από `window.location.origin` (set σε `useEffect` μετά το mount, ώστε SSR και client να
ρεντάρουν ίδια — χωρίς hydration mismatch), όπως και τα κουμπιά «Κοινοποίηση»
(breadcrumb-buttons) που χρησιμοποιούν `window.location`. Σημ.: στο oldnext το ίδιο component
είναι επίσης hardcoded — εκεί «δούλευε» μόνο επειδή το παλιό app ΕΙΝΑΙ το doulitsa.gr· σε
local/test έδειχνε λάθος origin, άρα bug και όχι parity.

**Λοιπά hardcoded `https://doulitsa.gr` στο frontend/src (αναφορά, ΔΕΝ αλλάχτηκαν):**
- Sitemaps (`app/(blog)/articles/sitemap.ts`, `(archives)/**/sitemap.ts`,
  `(sitemap)/sitemap_index.xml/route.ts`, `sitemap_static.xml/route.ts`): όλα
  `process.env.LIVE_URL || 'https://doulitsa.gr'` → config/SEO fallback, εκτός κλάσης bug.
- `app/(pages)/privacy/page.tsx`, `terms/page.tsx`: στατικό νομικό κείμενο, όχι links λογικής.

**Επαλήθευση:** login ως e2e-pro-b → `/dashboard/reviews` → το box δείχνει
`http://localhost:3100/profile/e2e-pro-b#review`.

**Φωτό:** `e2e-shots/FIX-03-share-review-link-origin.jpg`

---

## FIX 4 — Hydration/TZ mismatch σε admin dates (ΠΡΟΒΛΗΜΑ 11)

**Τι άλλαξε** — Τα κοινά date utils καρφώθηκαν σε Europe/Athens ώστε SSR (UTC container) και
client (οποιοδήποτε TZ browser) να παράγουν ΙΔΙΟ output:

- `frontend/src/lib/utils/date.ts`: νέο exported helper `toAthensDate()` (Intl.DateTimeFormat
  με `timeZone: 'Europe/Athens'`, `hourCycle: 'h23'` → Date με Athens wall-clock πεδία). Το
  `formatDate()` (και μέσω αυτού τα `formatDateTime`/`formatTime`) μορφοποιεί πλέον το
  Athens-shifted Date. Αυτό καλύπτει ΟΛΟΥΣ τους admin πίνακες (users, services, profiles,
  reviews, verifications, subscriptions, taxonomy submissions, chats κ.λπ.) που χρησιμοποιούν
  αυτά τα utils — μαζί και το `admin-taxonomy-submission-data-table` (cell createdAt) του
  ευρήματος.
- `frontend/src/lib/utils/formatting/date.ts` (δεύτερο util, review cards): ίδιο pinning μέσω
  `toAthensDate`.
- `frontend/src/components/admin/api-key-management.tsx`: το τοπικό `formatDate` (client
  component με `toLocaleDateString`) πήρε `timeZone: 'Europe/Athens'` — ίδια κλάση bug.

**Επαλήθευση:** `/admin/taxonomies/submissions` με δεδομένα (50 submissions): fresh reload,
κονσόλα ΧΩΡΙΣ hydration warnings/errors (pattern `hydrat|mismatch|server rendered` και
onlyErrors — κενά), κανένα dev overlay, ώρες σε Athens (π.χ. 06/11/2026 11:40). Το «Ban
Expires» του FIX 1 έδειξε 12:34 Athens για DB τιμή 10:34 UTC — σωστή μετατροπή.

**Φωτό:** `e2e-shots/FIX-04-taxonomy-submissions-athens-dates.jpg`

---

## FIX 5 — Saves χωρίς feedback/rollback (ΠΡΟΒΛΗΜΑ 9 + B1)

**Τι άλλαξε**

(α) Κουμπιά αποθήκευσης (καρδιά):
- `frontend/src/components/shared/breadcrumb-buttons.tsx` και
  `frontend/src/components/shared/save-button.tsx`: σε αποτυχία του `toggleSave`
  (`!result.success` Ή thrown error — π.χ. stale action/χαμένο request) γίνεται πλέον rollback
  του optimistic state ΚΑΙ error toast «Η αποθήκευση απέτυχε. Παρακαλώ δοκιμάστε ξανά.»
  (πριν: rollback μόνο στο `!success`, ποτέ toast, τίποτα σε thrown).
- `frontend/src/app/layout.tsx` + `(dashboard)/dashboard/layout.tsx` +
  `components/admin/admin-layout-wrapper.tsx`: ο sonner `<Toaster />` ανέβηκε στο root layout
  (ένα global mount) και αφαιρέθηκε από dashboard/admin ώστε να μην διπλορεντάρει. Χωρίς αυτό,
  στα public pages (όπου πατιέται η καρδιά — B1) τα toasts ΔΕΝ εμφανίζονταν καθόλου γιατί δεν
  υπήρχε πουθενά Toaster εκτός dashboard/admin.

(β) «Αιώνιο spinner» σε stale/failed server action (A#9β):
- `frontend/src/components/forms/service/form-service-edit.tsx`,
  `frontend/src/components/forms/profile/form-coverage.tsx`,
  `frontend/src/components/forms/profile/form-account.tsx`: ο reducer του `useActionState`
  τυλίχτηκε σε try/catch — αν η ΚΛΗΣΗ του action αποτύχει (network error, «Server Action was
  not found» μετά από redeploy), επιστρέφεται error state → το υπάρχον effect δείχνει error
  toast και το pending/spinner καθαρίζει, αντί να μείνει για πάντα.

**Επαλήθευση (live, με πραγματικό failure: `docker stop django-backend-backend-1`):**
- Public `/profile/e2e-pro-b`, καρδιά με backend down: optimistic flip → ΕΠΑΝΗΛΘΕ σε
  «Αποθηκεύτηκε» (rollback) + ορατό error toast. DB: η εγγραφή saved_profiles άθικτη.
- `/dashboard/saved`, «Διαγραφή» σε αποθηκευμένο προφίλ με backend down: η κάρτα ΕΜΕΙΝΕ στη
  λίστα + ένα (όχι διπλό) error toast — ο root Toaster δουλεύει και στο dashboard.
- Happy paths άθικτα: heart save/unsave ΟΚ με backend up· coverage save → toast «Η κάλυψη
  ενημερώθηκε»· admin account save → ένα success toast (βλ. FIX 1). Ο backend επανήλθε
  (health 200) και η τελική κατάσταση δεδομένων είναι όπως την άφησε το E2E (1 saved profile).

**Φωτό:** `e2e-shots/FIX-05-A-heart-rollback-error-toast-public.jpg`,
`FIX-05-B-saved-remove-rollback-toast-dashboard.jpg`, `FIX-05-C-coverage-save-toast.jpg`

---

## FIX 6 — Ο συντάκτης δεν βλέπει την pending αξιολόγηση (B4): **parity, όχι bug — ΚΑΜΙΑ αλλαγή**

Έλεγχος στο oldnext (source of truth):
- `oldnext/src/actions/reviews/get-user-reviews.ts`: ΟΛΑ τα queries του /dashboard/reviews
  (given + received + recommendations) φιλτράρουν `status: 'approved', published: true` —
  η pending αξιολόγηση ΔΕΝ εμφανιζόταν στον συντάκτη ούτε στο παλιό app.
- `oldnext/src/components/review/reviews-container.tsx` + `review-form.tsx`: στο public page ο
  μη-owner βλέπει ΠΑΝΤΑ τη φόρμα· το `ReviewSuccess` εμφανίζεται μόνο in-memory αμέσως μετά το
  submit, και μετά από reload η φόρμα ξαναεμφανίζεται άδεια. Το «Έχετε ήδη αξιολογήσει…»
  επιστρέφεται μόνο ως error σε δεύτερη υποβολή (create-review.ts) — ακριβώς ό,τι είδε το E2E
  στο νέο app (B-11, B-12, B-13).

Άρα η συμπεριφορά του νέου app είναι 1:1 με το παλιό → δεν αλλάχτηκε τίποτα (parity rule).

---

## Τελικός έλεγχος

- `cd frontend && yarn tsc --noEmit` → καθαρό.
- `yarn lint` → «No ESLint warnings or errors».
- Λογαριασμοί δοκιμών: e2e-user-a ΞΕΜΠΑΝΑΡΙΣΤΟΣ (banned=f), displayName «E2E User A»·
  e2e-pro-b step=DASHBOARD (επαναφέρθηκε)· saved_profiles όπως τα άφησε το E2E.
- Αρχεία που άλλαξαν (frontend μόνο):
  `app/layout.tsx`, `app/(dashboard)/dashboard/layout.tsx`,
  `components/admin/admin-layout-wrapper.tsx`, `components/admin/api-key-management.tsx`,
  `components/admin/forms/edit-user-ban-form.tsx`,
  `components/dashboard/reviews/share-review-link.tsx`,
  `components/forms/profile/form-account.tsx`, `components/forms/profile/form-basic-info.tsx`,
  `components/forms/profile/form-coverage.tsx`, `components/forms/profile/form-onboarding.tsx`,
  `components/forms/service/form-service-edit.tsx`,
  `components/shared/breadcrumb-buttons.tsx`, `components/shared/save-button.tsx`,
  `lib/utils/date.ts`, `lib/utils/formatting/date.ts`
