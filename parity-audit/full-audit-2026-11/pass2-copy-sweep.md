# Pass 2: systematic user-visible copy sweep (old vs new), 2026-11-05

Scope: a programmatic diff of every Greek string (and user-facing English) in the old app against the new frontend and backend. It covers the surfaces pass 1 only touched lightly. The dedupe rule applies: anything already in SUMMARY.md or in the 11 pass-1 reports is left out. That includes the English-errors cluster, the ~10 email subjects, the known toast rewordings, the support dialog, the breadcrumb/pill plural labels, the service meta description, the payment-email ISO date, the lost Reply-To/sender, the genericized report/support emails, the 24-48h contact line and the verification-email wording. Only new findings and corrections are listed here.

## 1. Coverage

Method (all scripts in the session scratchpad, read-only):
- Extracted every string literal, template literal and JSX text node with a Greek character (U+0370–03FF, U+1F00–1FFF), comments stripped:
  - `oldnext/src`: 410 files, 9,805 strings
  - `frontend/src`: 391 files, 9,425 strings
  - `backend` `.py`/`.html`/`.txt`, migrations excluded: 52 files, 716 strings
- Normalized `${…}`/`{…}` placeholders and punctuation. Then diffed both ways:
  - old → (new frontend ∪ backend): 356 old strings with no counterpart, in 85 files
  - new → old: 128 new-only frontend strings
  - backend → old: all backend-only Greek strings
- Ran an attribute pass (placeholder / aria-label / title / alt / label / description / message / toast() / English JSX text) old vs new: new English strings not present in old.
- Ran a file-level diff of every old file under `components/`, `app/`, `lib/` against the same path in new (336 changed or gone). Re-diffed every changed file, keeping only hunks that touch copy (Greek, JSX text, title/label/placeholder/description).
- Compared formatting call sites (`toLocale*String`, `Intl.DateTimeFormat`/`NumberFormat`, date-fns `format`) per file, old vs new.
- Compared emails body by body: every old template in `constants/email/templates/*.ts` (+ `email-config.ts`, `lib/email/auth-integration.ts`, `lib/email/services/*`) against `backend/apps/messaging/emails.py` + `tasks.py` callers.
- Checked every "absent in new" old component for liveness (imports, barrels, JSX usage) so dead old code isn't reported.

Old files examined individually beyond the automated pass:
- `constants/email/templates/{verification,welcome,password-reset,contact,new-profile,new-review,new-verification,profile-report,review-approved,service-created,service-published,service-report,subscription-payment,support-feedback,unread-messages,index}.ts`, `constants/email/email-config.ts`, `lib/email/auth-integration.ts`, `lib/email/services/{admin,service}-emails.ts`
- `app/api/payment/worldline/redirect/route.ts`
- `app/(pages)/**` (about, contact, faq, for-pros, politiki-akirosis, privacy, terms), `lib/seo/{pages,fetch-entity}.ts`, `lib/seo/schema/*`
- `components/subscription/{subscription-sheet,payment-attempts-list,pricing-selection}.tsx`, `app/(dashboard)/dashboard/promote/{page,subscription-management}.tsx`, `checkout/*`
- `components/messages/{chat-list-item,header-actions,message-edit}.tsx`, `components/dashboard/dashboard-content.tsx`
- `components/dashboard/services/{featured-star-button,service-table-filters,service-status-badge}.tsx`, `components/services/service-delete-dialog.tsx`, `actions/services/{create-service,delete-service}.ts`
- `components/forms/profile/{form-delete-account,form-onboarding}.tsx`, `components/forms/auth/{form-auth-register,form-oauth-setup}.tsx`
- `components/profile/{menu-user,contact-reveal}.tsx`, `components/shared/{service-media-card,layout/footer/footer-global}.tsx`, `components/service/service-info.tsx`
- `components/admin/forms/{create,edit}-*-taxonomy-form.tsx`, `admin-taxonomy-submission-data-table.tsx`, `app/(admin)/admin/notifications/page.tsx`
- `constants/datasets/{dashboard,footer,blog-categories}.ts` (+ removed `budgets,collections,company-sizes,subscription-types,tabs`), `middleware.ts`, `middlewares/*`
- Dead in old (no importer anywhere), not reported: `components/shared/{404,taxonomy-selector,verified-badge,profile-card,link}.tsx`, `components/ui/{media-display,loading-spinner,year-picker,…}.tsx`, `components/messages/{header-actions,message-edit,message-reactions}.tsx`, `components/forms/service/service-success.tsx`, `components/profile/{profile-rating,user-image}.tsx`, `components/review/review-stats.tsx`, `lib/utils/{format-rating.ts,misc/errors.js}`, `constants/datasets/{budgets,collections,company-sizes,subscription-types,tabs}.ts`.

NEW files read: `backend/apps/messaging/{emails,tasks}.py`, `backend/apps/billing/views/public/billing.py` (WorldlineRedirectView), `backend/apps/accounts/services/{password,registration}.py`, `backend/apps/profiles/selectors/profile_reads.py`, `backend/apps/billing/services/subscription_ops.py`, `backend/apps/onboarding` caller, plus every same-path frontend file above.

Delegated elsewhere: none new. Every other copy hit traced back to an existing pass-1 finding (see §4).

## 2. Mapping (old → new) for the surfaces checked

| Surface | OLD | NEW |
|---|---|---|
| Static pages (about, terms, privacy, politiki-akirosis, faq, for-pros, contact) | `app/(pages)/**` | byte-identical; only `cookies/` added |
| Page metadata templates | `lib/seo/pages.ts` | identical except the added `getCookiesMetadata` |
| 404 / global-error / archive not-found / loading / skeletons | `app/**/not-found.tsx`, `global-*.tsx`, `skeletons/*` | identical |
| Transactional emails (14) | `constants/email/templates/*` via Brevo workflows | `backend/apps/messaging/emails.py` `_layout()` |
| Cardlink auto-submit page | Next `app/api/payment/worldline/redirect` | Django `WorldlineRedirectView` |
| Date/number formatting in UI | `toLocale*` / `Intl` call sites | the same call sites; deltas are only in the removed email/debug/git/chart files |

## 3. DIFFERENCES (new only)

### D1. Email bodies: sign-off, footer branding, CTA labels and per-email content changed beyond pass 1's D5 — MEDIUM
Pass 1 (lib-shared-sweep D5) covered subjects, the verification wording, the lost 24-48h line, the payment ISO date and the contact `ID Μηνύματος`. The body diffs below are new. OLD = `oldnext/src/constants/email/templates/*.ts`, NEW = `backend/apps/messaging/emails.py`.

Global, every email:
- Footer. OLD: black footer bar `® Doulitsa, 2026` (support-feedback: `© {year} Doulitsa.`). NEW: grey line `Doulitsa · Αυτό το μήνυμα στάλθηκε αυτόματα.` (`emails.py:62-71`).
- Sign-off. OLD: `Με εκτίμηση,<br/>Η ομάδα Doulitsa` in verification, welcome, review-approved and service-published. NEW: no sign-off in any email.
- Copy-link line. NEW `_button()` (`emails.py:74-81`) appends `Ή αντίγραψε τον σύνδεσμο: <url>` under every button, admin emails included. OLD had a raw link only in password-reset (`Αν δεν μπορείς να κάνεις κλικ στο κουμπί, αντίγραψε και επικόλλησε αυτό το link στον browser σου:`).
- Document shell. NEW has no `<html lang="el">` / `<title>` wrapper. OLD templates had them.

Per email:

| Email | OLD body copy | NEW body copy |
|---|---|---|
| Welcome (`welcome.ts`) | H1 `Καλώς ήρθατε στη Doulitsa!`; `Γεια σας {displayName\|username\|'φίλε'},`; `Ο λογαριασμός σας έχει επιβεβαιωθεί επιτυχώς! Μπορείτε τώρα να εκμεταλλευτείτε όλες τις δυνατότητες της πλατφόρμας μας.`; **branch** — with displayName (pros): `Ως επαγγελματίας, μπορείτε να δημιουργήσετε το προφίλ σας και να προσελκύσετε νέους πελάτες.`, otherwise: `Μπορείτε τώρα να αναζητήσετε και να επικοινωνήσετε με επαγγελματίες στην περιοχή σας.`; button `Μετάβαση στο Dashboard`; `Αν έχετε οποιαδήποτε απορία, είμαστε στη διάθεσή σας!` + sign-off | H2 `Καλώς ήρθες στη Doulitsa!`; `Γεια {name}! Ο λογαριασμός σου είναι έτοιμος.`; button `Στον πίνακά μου` (`emails.py:143-149`). The pro/simple-user branch is gone, and the register switches from formal (σας) to informal (σου). |
| Password reset (`password-reset.ts`) | `Γεια σου {displayName\|username\|'φίλε'},`; `…Κάνε κλικ στον παρακάτω σύνδεσμο για να δημιουργήσεις νέο κωδικό:`; button `Επαναφορά Κωδικού`; red **`Αυτός ο σύνδεσμος θα λήξει σε 1 ώρα.`** | `Γεια{ name},`; `…Πάτησε το κουμπί για να ορίσεις νέο κωδικό (ο σύνδεσμος λήγει σύντομα):` (`emails.py:125-136`). The token TTL is still 1 h (`accounts/services/password.py:21`), so the precise expiry warning is lost for no reason. |
| Verification (`verification.ts`) | button `Επιβεβαίωση Λογαριασμού`; `Αν δεν πραγματοποίησες εσύ αυτή την εγγραφή, μπορείς να αγνοήσεις αυτό το μήνυμα. Αν έχεις οποιαδήποτε απορία, είμαστε στη διάθεσή σου!` | button `Επαλήθευση email`; the "if this wasn't you, ignore it" line is **missing** (`emails.py:111-121`) |
| Contact confirmation (`contact.ts`) | H1 `Λάβαμε το μήνυμα σου {name}!`; `Σε ευχαριστούμε που επικοινώνησες μαζί μας!`; `Η ομάδα μας θα δει το αίτημά σου και θα σου απαντήσει το συντομότερο.` | H2 `Λάβαμε το μήνυμά σου` (no name); `Γεια {name}, ευχαριστούμε που επικοινώνησες μαζί μας. Θα σου απαντήσουμε το συντομότερο δυνατό.` |
| Contact → admin | H1 `Νέα Φόρμα Επικοινωνίας!`; `Θέμα: {subject \|\| 'Φόρμα Επικοινωνίας'}` | H2 `Νέο μήνυμα επικοινωνίας`; `Θέμα: {subject}` with no fallback, so an empty subject also yields the email subject `[Doulitsa] Επικοινωνία: ` |
| Service published (owner) | the same paragraphs + **`Καλή επιτυχία!`** + sign-off; both links styled as buttons | `Καλή επιτυχία!` and the sign-off are gone; `Επεξεργασία Υπηρεσίας` is demoted to a small grey link (`emails.py:348-356`) |
| Review approved (owner) | the same text + sign-off | sign-off gone (`emails.py:241-254`) |
| New profile → admin | header `Νέο Επαγγελματικό Προφίλ`, H2 = profile name; `👤 Στοιχεία Προφίλ:` Email/Τύπος; `🔧 Ενέργειες:` buttons **`Προβολή Προφίλ`** (public) + **`Επεξεργασία Προφίλ`** (admin); `Ημερομηνία: {toLocaleString('el-GR')}` | H2 `Νέο προφίλ επαγγελματία` (profile name only as a row); adds Username/Profile ID rows; button `Προβολή στο Admin` + small link `Δημόσιο προφίλ`; **no Ημερομηνία** (`emails.py:270-289`) |
| Service created → admin | `🔧 Ενέργειες:` + button; `Ημερομηνία: …el-GR`; the category was **never rendered** | **no Ημερομηνία**. Adds `Κατηγορία: {service.category}`, which prints the raw taxonomy id (e.g. `109`) because the caller passes `service.category` (`tasks.py:231`; model CharField of ids). It also shows two headings (`Νέα Υπηρεσία` + the title as a second H2). |
| Subscription payment → admin | `🔧 Ενέργειες:` heading above the 2 buttons | heading gone; `Προβολή Προφίλ` demoted to a small link (the ISO date is known from D5) |
| Unread digest | footer `® Doulitsa, 2026` | the generic footer (the rest is known from messaging D3) |

- Impact: every user-facing email loses the "Η ομάδα Doulitsa" sign-off and the ® footer branding. Pros lose the onboarding hint in the welcome mail. The reset mail no longer states the 1-hour expiry. The verification mail drops its "not you? ignore" safety line. Admins lose the timestamp on new-profile and new-service mails and get a raw category id.
- Fix: port the old template strings verbatim into the `emails.py` builders. Restore the footer and sign-off in `_layout()` (an `audience='user'|'admin'` flag fits, since admin templates had no sign-off). Restore `Ημερομηνία` via an Athens-local `strftime('%d/%m/%Y, %H:%M:%S')`, which matches el-GR `toLocaleString`. Resolve the category label or drop the line.
- Possibly intentional?: partly. The layout simplification may be deliberate, but these texts are user-visible copy and the old app is the source of truth.

### D2. Cardlink redirect interstitial lost its spinner, styling and no-JS explanation — LOW
- OLD: `oldnext/src/app/api/payment/worldline/redirect/route.ts:34-86`. Centered page (`#f9fafb` background, system font) with an animated spinner, `Ανακατεύθυνση στη σελίδα πληρωμής...`, and in `<noscript>` a red line **`Η JavaScript πρέπει να είναι ενεργοποιημένη. Πατήστε το κουμπί παρακάτω.`** above the `Συνέχεια στην πληρωμή` button.
- NEW: `backend/apps/billing/views/public/billing.py:259-273`. Unstyled bare `<p>` text, no spinner. The `<noscript>` holds only the button, without the explanatory sentence.
- Impact: every checkout passes through this page. It now flashes as an unstyled white page, and no-JS users see a lone button with no explanation.
- Fix: copy the old HTML/CSS block verbatim into the Django view.
- Possibly intentional?: no.

### D3. Admin notifications page is now real data (old was a hard-coded English mock) — LOW / INFO
- OLD: `app/(admin)/admin/notifications/page.tsx:15-61`. Static English mock items ("New User Registration", "John Doe has registered…", a "High Priority" tab).
- NEW: live feed from `backend/apps/admin_api/views/admin/notifications.py` with Greek texts (`Νέα εγγραφή χρήστη`, `Εκκρεμής επαλήθευση επαγγελματία`, `πριν N λεπτά/ώρες/ημέρες/μήνες`, empty state `Δεν υπάρχουν ειδοποιήσεις σε αυτή την κατηγορία.`). The "High Priority" tab is gone.
- Impact: an improvement for admins only. Listed so the change isn't mistaken for drift.
- Possibly intentional?: yes, almost certainly.

### D4. Admin taxonomy toasts changed wording (still English in both) — LOW / INFO
- OLD: `Draft saved` / `Failed to save draft` / `Changes saved to drafts` / `Approved (ID: X). Go to Git to publish.` (git-draft flow).
- NEW: `Created` / `Failed to create — please try again` / `Saved` / `Failed to save changes — please try again` / `Approved (ID: X) — live now.` (`components/admin/forms/{create-pro,create-service,edit-pro,edit-taxonomy-item}-*.tsx`, `admin-taxonomy-submission-data-table.tsx:94`).
- Impact: admin-only. This follows from the intentional git-flow removal (admin.md D24). Both apps use English here, so there is no Greek regression.
- Possibly intentional?: yes.

## Corrections to pass 1

- **lib-shared-sweep.md D5** says the password-reset email lost the old raw link. The new email still has one: `_button()` always appends `Ή αντίγραψε τον σύνδεσμο: <url>`, `emails.py:80`. What it actually lost is the `1 ώρα` expiry warning and the monospace styling (see D1 above).
- **lib-shared-sweep.md D5** says "Old templates had plain-text twins". That is not true for the welcome email: old `lib/email/auth-integration.ts:70-103` sent `WELCOME_HTML` without `WELCOME_TEXT`, and used the `EMAIL_TEMPLATES.WELCOME` subject `Καλώς ήρθες στο Doulitsa, {name}!`. So the new tag-stripped text part is not a regression for welcome.
- No correction, just a confirmation. The full old→new "absent" sweep found only one block of Greek copy that silently disappeared from live UI components: the role-picker strings in `form-auth-register` / `form-onboarding` (`Παρακαλώ επιλέξτε αν είστε Επαγγελματίας ή Επιχείρηση`, `Επιλέξτε πρώτα αν είστε Επαγγελματίας ή Επιχείρηση για να εμφανιστούν οι κατηγορίες.`). They are already covered by auth-accounts D2/D3. Every other old-only Greek string in live code is either an action/backend message already in a pass-1 report, or lives in dead old components (listed in §1).

## 4. Confirmed same (verified by diff)

- Static/marketing pages: about, terms, privacy, politiki-akirosis, faq, for-pros, contact. `diff -r app/(pages)` shows only `cookies/` added.
- Every page title/description template in `lib/seo/pages.ts` (auth pages, archives `%arcCategoryPlural%…`, services `%label% - Βρες τις καλύτερες Υπηρεσίες στη Doulitsa`, profile `%displayName% - %type% - %subcategorySingular%. %tagline%` / `%bio%`, `… | Doulitsa` index pages). `lib/seo/{meta,format-template,get-entity-values}.ts` are identical, so OG/Twitter titles are the same. The profile SEO payload (`serialize_profile_summary`) carries the displayName/tagline/bio/type/subcategory fields the template needs.
- JSON-LD schema components: copy identical (baseUrl env chain known D14).
- All not-found / global-error / loading / skeleton texts. All empty states and confirmation dialogs in shared components: service delete dialog, delete-account form (only the FormData transport changed), review/visibility dialogs. Badge/chip labels (service status badge, verified/top, featured star) and the Greek in tooltips/aria-labels/placeholders: no Greek string is new or missing in live components outside the items above and the known pass-1 ones.
- Frontend date/currency formatting call sites: per-file identical. The old-only sites live in removed email templates, `app/api/debug/time`, `actions/admin/git-operations.ts` and `components/ui/chart.tsx` (dead). `payment-attempts-list` `formatAmount` and the chat `formatChatDateDivider` / `formatCompactMessageTime` are unchanged (only null-guards added). The digest email times use Athens `HH:MM`, the same as old.
- Plural/singular on cards, menus, titles, meta: the components are identical. Plural is used only in breadcrumbs/pills (known D14/D4/D8). The profile page breadcrumb uses `plural ?? label` in both.
- `constants/datasets/{dashboard,footer}.ts` labels: identical (shape flattened; the footer adds `Πολιτική Cookies`, known home D17).
- Cardlink `orderDesc` (`Doulitsa {plan} - Ετήσια|Μηνιαία Συνδρομή Προώθησης - Δυνατότητα ακύρωσης…`): identical in `billing/services/worldline.py:439`.
- Email copy that matches old: new-review admin email, the review-approved main paragraph, the service-published main paragraphs, the unread-digest greeting/count/overflow line/button, and the subscription-payment field labels.
- No SMS or push channel exists in either app.

## 5. Open questions / couldn't verify

- Cookie banner copy: the old banner was the third-party CookieFirst UI loaded via GTM, so its texts aren't in the repo. The new `components/consent/*` (`Αποδοχή Όλων`, `Άρνηση`, `Ρυθμίσεις απορρήτου`, `Αποθήκευση ρυθμίσεων`, …) claims to be a "replica". Compare against a production screenshot.
- Brevo workflow emails: the old app sent through Brevo workflows with `attributes` (USER_NAME, PROFILE_NAME, …). If any Brevo-side automation template used those attributes for its own copy, that copy lives in Brevo, not the repo. Check the Brevo dashboard to confirm no automation still depends on the old attribute names.
- The `/payments/check-access` `testModeBanner` string comes from the server route (`app/api/payments/check-access`). Not re-audited here; billing domain.
