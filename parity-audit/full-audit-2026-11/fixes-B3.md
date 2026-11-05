# Fix batch B3: frontend, non-admin (2026-11-05)

Working tree only. Nothing was committed or pushed, and `maps.generated.json*` was not touched.

**Checks:**
- `corepack yarn tsc --noEmit -p tsconfig.json`: clean.
- `corepack yarn lint`: no warnings or errors.

**How the live checks were run:**
- The docker `frontend` container has no source mount, so it runs code baked into the image. It was also OOM-killed during this run.
- Instead, the patched tree ran on the host with `next dev --turbo -p 3200`, against Django on :8800, driven by playwright scripts in the scratchpad (`e2e/b3_*.js`). The dev server has been stopped.
- Pages tested before the fix still show stale `unstable_cache` entries in `.next/cache/fetch-cache` from October, for up to 5 minutes. The archive checks therefore used a cache-busting query param.

## FIXED

| Item | Files | Evidence |
|---|---|---|
| **useSession vein (P5-CS-1..5, pass6 K-4 "US / User")** | `lib/auth/client.ts`, `components/forms/auth/form-auth-login.tsx` | **Store:** a module store read through `useSyncExternalStore`, with one shared snapshot and a stable module-level `refetchSession`. `isPending` turns true only when no user is known (better-auth parity, so the avatar no longer flashes). A request-sequence guard stops a stale "logged out" response from overwriting a newer one. `signIn`/`signOut` commit through the store. **K-4 root cause:** the login action's cookie write makes Next refresh `/login`, and the middleware bounces it to `/dashboard`. The sidebar then mounted inside the 5 s cache window and was served the cached pre-login `null`. The new `invalidateSession()` runs on login submit. **Guard:** the login form has the `handledStateRef` guard, deps `[state, …]`. **Live K-4:** after email login, the sidebar footer shows "E2E Pro One / e2e-pro1@…" and the full pro menu (Προφίλ → `/profile/e2epro1d`, Υπηρεσίες, Προώθηση) with no reload. Exactly 1 `getSession` POST followed the login, so there is no loop. **Live N1:** e2e-simple1 logs in, then client-side `router.push('/')`. Saved service 862 shows "Διαγραφή" (saved) without a reload. **N4:** the toast re-fire is fixed by the stable `refetch`; not checked live. **N2 rename:** not checked live, because the test user's username-change dialog was unavailable (cooldown). It uses the same shared-store `refetch` that the N1 and K-4 runs exercised. |
| **NoServiceDialog shows again every ~15 min** (payload D2) | `dashboard/no-service-dialog.tsx`, `dashboard-content.tsx`, `lib/auth/client.ts` | The key was the access-token jti, which rotates every 15 min. It is now the stable user id, and `signOut` clears the flags. The result is "once per login per tab", as with OLD's session id. |
| **P1-15** archive `?search=` lost | `actions/services/get-services.ts` | `filters` is built the way OLD did (`get-services.ts:903-930`: search, county/περιοχή, online, a validated sortBy, page, limit, taxonomy ids). Any non-null values the backend sends win. **Live:** both inputs show "λογιστης", 1-12 of 12. After a sort change the URL is `?search=λογιστης&sortBy=recent&limit=20`, still 12 results, the same as OLD. |
| **P1-16** service meta / JSON-LD `" -  - …"` | `lib/seo/fetch-entity.ts` | The bundle ships `category` as its Greek label, while subcategory and subdivision are ids. The category is now resolved by id, then by top-level label/slug, then as the parent of the subcategory. **Live** `/s/…-196` meta: "Καθαρισμοί - Βιολογικός Καθαρισμός - Βιολογικός καθαρισμός – …". The JSON-LD reuses this text. |
| **CG-1, frontend half (P1-18)** + soft-404 | `actions/services/get-services.ts` | **Routes:** subcategory and subdivision routes resolve through `findTaxonomyBySubcategorySlug`. Category routes use OLD's depth-first `findBySlug`. If nothing resolves, the action returns `'… not found'` BEFORE calling the backend, and the pages call `notFound()`. **Lists:** sibling and child lists resolve inside their parent first. **Live (dev):** `/ipiresies/zz-nope`, `/categories/zz-nope`, `/ipiresies/udraulika/zz-nope` and `/ipiresies/zz-nope/zz-nope` all return 404. The `/ipiresies/udraulika` banner now matches OLD ("…για υδραυλικά προβλήματα στο σπίτι σου…"), and so does `/ipiresies/digital-marketing` ("…digital marketing που προσελκύουν και αυξάνουν…"). The `/categories/marketing` banner reads "Ανάπτυξε την επιχείρησή σου…", the same as OLD; its meta was already the same as OLD. **Caveat:** the test-host 200 was seen on a prod build. Dev already gave 404, so re-probe LC-5 after the full `yarn build`. |
| **P1-12** (frontend half) + **PLURAL-1 (P2-19)** + `/dir/udraulika` | `actions/profiles/get-profiles.ts`, `lib/utils/datasets.ts` (`getTaxonomyBreadcrumbs` gains OLD's `baseHref` option) | **Resolution:** a type-scoped, level-aware port of OLD `get-profiles.ts:487-569` (`filterTaxonomyByType`, `findAllSubcategoriesBySlug`, `findTaxonomyBySlugInContext`, depth-first `findBySlug`). The current node is the in-category variant. **Pills:** `plural‖label`, href `/dir/<parent>/<sub>`. Pills are dropped when the parent can't be resolved (null-category guard), when they are the current subcategory, or when the type doesn't match. **Crumbs:** generated as in OLD, with plural labels and the base crumb linking to `/directory`; on the root page the base crumb is unlinked. That also fixes P3-15's `/dir` half. **Live:** the `/dir` pills are `/dir/ekpaideysi-and-didaskalia/kathigites-xenon-glosson` "Καθηγητές Ξένων Γλωσσών", "Καθηγητές", …, and `/dir/marketing/digital-marketing-agencies`. Crumbs: Αρχική / Επαγγελματικός Κατάλογος (`/directory`) / Εκπαίδευση & Διδασκαλία / Καθηγητές Ξένων Γλωσσών. `/dir/udraulika` returns 404, like OLD. The backend half (`profile_aggregations.py` `categorySlug: None`) belongs to B2. |
| **P1-19** taxonomy-submission / skill-proposal errors | `actions/taxonomy-submission.ts` | Failures now return `message` (OLD contract), plus `error`. The 3 consumers' `result.message` toasts now show the backend's Greek text. |
| **Review-visibility toast** (rev D2) | `actions/reviews/toggle-review-visibility.ts` | Success copy is OLD's "Η αξιολόγηση είναι τώρα ορατή/κρυφή". Errors carry `message`: the backend text, or OLD's fallback "Αποτυχία ενημέρωσης εμφάνισης αξιολόγησης". |
| **Resend-verification UI** (P1-5, UI leg) | `actions/auth/resend-verification.ts` | A port of OLD's action: zod email validation and the OLD "στάλθηκε" copy. A 200 `{error:…}` envelope or a 409 now gives OLD's always-success "Αν το email υπάρχει…" message instead of a blank result; a 429 gives OLD's rate-limit text. The backend half belongs to B1. |
| **Login `?error=`** (P3-D7) | `form-auth-login.tsx` | Maps `google_denied`, `oauth_state`, `oauth_exchange`, `oauth_network` and `oauth_unconfigured` to a Greek destructive alert. **Live:** `/login?error=google_denied` shows "Η σύνδεση με Google ακυρώθηκε." |
| **P1-22** blog slugs | `constants/datasets/blog-categories.ts` | Reverted to the OLD/Django set: `dimiourgia-periechomenou`, `eyexia-frontida`, `marketingk`, `technika`, `ypostirixi`. A warning comment was added. No other frontend links hardcode these slugs; the `footer.ts` slugs are service categories, identical to OLD. **Live:** `/articles/marketingk` returns 200 "Μάρκετινγκ - Άρθρα". |
| **P5-RW-2 / W2** sitemaps per request | `lib/api/services.ts`, `lib/api/profiles.ts` | `getServiceTaxonomyPaths` is now anonymous with revalidate 3600 (OLD 1 h). `getProfileTaxonomyPaths` is anonymous with revalidate 86400 (OLD TAXONOMIES TTL). Both carry tags `taxonomy-paths` + `services:all` / `profiles:all`, so existing write purges cover them. **Pending:** confirm `x-nextjs-cache` on the prod build. |
| **P5-RW-1 / W1** home regeneration flips static → dynamic | `app/(home)/page.tsx` | `dynamic = 'force-static'` restored (OLD), keeping `revalidate = 300`. `fetchCache` was deliberately NOT forced, so the taxonomy-maps refresh can't be cached forever. Under force-static, `markCurrentScopeAsDynamic` and the `revalidate:0` lowering are no-ops (checked in `next/dist/server/lib/patch-fetch.js:481,797`). **Pending:** verify on the prod build. |
| **P5-CS-6** leaked WebSocket | `lib/realtime/channels-ws.ts` | `if (closed) return;` after `await fetchAccessToken()`. |
| **Messages TZ hydration error (K-2)** + P1-21 frontend half | `src/instrumentation.ts` (new) | OLD's mechanism ported: `process.env.TZ='Europe/Athens'` in the Node runtime, as OLD did. OLD never suppressed the hydration warning. **Live:** messages SSR now renders 13:24 (Athens) instead of 11:24 (UTC); 0 hydration errors with an Athens browser. |

## BLOCKER-1 (added by the coordinator): FIXED
**Symptom:** "Έναρξη Δραστηριότητας" and "Ελάχιστος Προϋπολογισμός" loaded empty in `form-additional-info.tsx`. Because the form writes every field, the next save stored null. Both surfaces were affected: the owner page `/dashboard/profile/additional` and the admin profile page.

**Root cause:** not a field-name mismatch.
- The payload is correct (`/api/profiles/me` returns `commencement:'2018'`, `budget:'4'`), and the form's `reset()` received those values.
- Debug logging showed Radix calling `onValueChange("")` straight after the reset, so RHF ended up with `commencement:''` and `budget:''`.
- The cause is dependency drift. OLD's lockfile resolved `@radix-ui/react-select` 2.2.6; NEW resolves 2.3.0.
- 2.3.0's hidden native `<select>` has `onChange={e => onValueChange(e.target.value)}`. It also dispatches a bubbling `change` whenever the controlled value changes. When that value has no matching native `<option>` yet (closed content), the event reads `''`.
- These are the only 2 fields in this form built on Radix Select (YearSelect, Selectbox), which is why only they broke.

**Fix:** `frontend/src/components/ui/select.tsx`. The `Select` root now drops `onValueChange('')`. Radix forbids `''` as an item value, so it is never a real choice. The clear buttons call their own `onValueChange('')` directly, so clearing still works. The guard applies to every Select in the app.

**Live checks** (patched tree on :3200, same Django :8800). The :3100 container runs a pre-built image without a source mount, and it was down/OOM.
- The test profile was seeded with commencement '2018' and budget '4'. Before the fix the triggers showed the placeholders and the native values were `['','']`. After the fix both surfaces show `2018 | 1000€` and native values `['2018','4']`.
- An unrelated save (rate only) on the owner page, then on the admin page, left the DB at `commencement=2018, budget=4`, with rate updated to 78 and then 89.
- The backend was not changed. `form-additional-info.tsx` is unchanged (only a temporary debug edit, since reverted).

## ALREADY-FIXED / NOT REPRODUCED
- **N3 login loop:** not reproduced in pass 6. The guard and the stable `refetch` are in place anyway (1 `getSession` after login, measured).
- **Change-username / upgrade-to-pro components:** need no change. They are identical to OLD and are correct once `refetch` is stable.

## SKIPPED
- **`/profile/<missing>` returns 200 with the 404 page.** pass6-test-public §4 found that old prod does the same, so this is parity. MASTER does not ask for a change.
- **P5-CS-7:** the review-card visibility change is a deliberate fix and was not reverted.

## OUT OF B3 SCOPE (admin files belong to B4; listed in FIXPLAN B3, so flagged for the coordinator)
- **XC-DEADREVAL:** the dead tags live in `src/actions/admin/revalidate-taxonomies.ts:37-57`. Use the real tags instead:
  - `categories-page`, `nav:menu`, `archive:services`, `archive:profiles`, `services:all`, `profiles:all`, `page:home`, `search:suggestions`
  - plus the new `taxonomy-paths`
- **NEW-1 and P5-DU-1:** already done by B4 (per the coordinator); skipped.

## Notes for later batches
- The final `yarn build` must re-probe the following on the prod server:
  - the soft-404 statuses
  - `x-nextjs-cache` on `/ipiresies/sitemap.xml`, `/categories/sitemap.xml` and `/dir/sitemap.xml`
  - home regeneration
- Archive bundles cached by `unstable_cache` before the deploy keep their old pills, crumbs and banners for up to 5 minutes. They self-heal.
