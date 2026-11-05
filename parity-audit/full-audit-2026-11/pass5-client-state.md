# Pass 5: client-side runtime state, parity audit (2026-11-05)

Cut: every hook, zustand store, context provider and stateful component pattern in
`frontend/src`, diffed against `oldnext/src`. I checked for: state that must survive
navigation, changed effect deps or cleanup, optimistic updates with no rollback,
persisted vs memory stores, handler races, subscription lifecycles, and derived
state that goes stale.

Dedupe: I read `_INSTRUCTIONS.md` (with the Addendum) and `SUMMARY.md`, and grepped
all 458 finding titles from passes 1–4. I also read the bodies of messaging
D1/D8/D13, pass3-messaging P3-D1/P3-D2 and §"churn", and the pass4 messaging verification
rows. Excluded as already known: archive drawer store / instantOpen / optimistic
selects (intentional), optimistic message bubbles (P3-D1), NoServiceDialog
localStorage (pass2-payload D2 / profiles-dashboard D2), register store persistence
(P3-D5), the chat badge `read` event (messaging D1), the WS 15-min token gap
(P3-D2), the payments-access UI gate (billing / lib-shared), and taxonomy drafts
moving from localStorage to the DB (admin D18).

Zero code changes. No git commands were run.

---

## 1. Coverage

### Enumeration method
- `find` over `lib/hooks/**`, `lib/stores/**`, `lib/providers/**`, `components/providers/**` on both sides.
- `grep -l` for `useEffect|useState|useOptimistic|useTransition|useSWR|setInterval|useActionState|localStorage|sessionStorage|zustand|createContext` on both sides: 157 new files, and the same set on the old side.
- Each new stateful file was diffed against its same-path old file. I read every file whose diff touches hook lines or data flow. Old-only and new-only stateful files are listed below.

### Hooks / stores / providers (old → new)
| File | Status |
|---|---|
| `lib/hooks/admin/use-admin-filters.ts` | identical |
| `lib/hooks/archives/use-archive-filters.ts`, `use-archive-pagination.ts`, `use-debounced-value.ts` | identical |
| `lib/hooks/ui/use-mobile.tsx`, `use-toast.ts`, `index.ts`; `lib/hooks/index.ts` | identical |
| `lib/hooks/use-hash-scroll.ts`, `use-resettable-action-state.ts`, `use-subscription-gate.ts`, `use-unread-count.ts` (SWR 60s) | identical |
| `lib/hooks/chat/use-chat-list-subscription.ts` | transport swap (Supabase → Channels); read in full; **N6** |
| `lib/hooks/chat/use-chat-subscription.ts` | transport swap; read in full; **N6** |
| `lib/hooks/chat/use-presence.ts` | rewritten (messaging D8 known); **N6** |
| `lib/hooks/chat/use-message-optimistic.ts` | module store (P3-D1 known); refinement in §4 |
| `lib/hooks/chat/use-infinite-scroll.ts` (OLD only) | dead in OLD (no importer); `components/archives/infinite-scroll.tsx` identical on both sides |
| `lib/hooks/use-payments-access.ts` (NEW only) | known (billing / lib-shared D18) |
| `lib/providers/saved-state-provider.tsx` | identical file, different behavior because the session source changed: **N1** |
| `lib/stores/authStore.ts` | persist added (P3-D5 known) |
| `lib/stores/use-home-featured-services-store.ts`, `use-navigation-skeleton-store.ts`, `use-subscription-sheet-store.ts` | identical; consumers identical (`home/category-tabs`, `home/services-carousel-wrapper`, `shared/navigation-skeleton-overlay`, `shared/next-link` (only a `href==null` guard added), `dashboard/services/create-service-button`, `subscription/plan-comparison`, `subscription/subscription-sheet` (payments gate, known)) |
| `lib/stores/use-service-order-store.ts` | type rename only; consumers `service-addons/-buy/-calculated-price` identical |
| `lib/stores/use-archive-filters-sheet-store.ts` (NEW only) | intentional (drawer) |
| `lib/auth/client.ts` | **rewritten**: better-auth shared atom → per-instance `useState`. Root cause of N1–N5 |
| `lib/realtime/channels-ws.ts` (NEW only) | read in full; **N6** |
| `components/providers/auth-provider.tsx`, `dashboard-provider.tsx` (OLD only) | dead in OLD (exports commented out in `providers/index.ts`) |

### Stateful components diffed (new path = old path)
Read in full or diffed hunk by hunk:
- **Auth forms:** `forms/auth/form-auth-login` (identical file; **N3**), `form-auth-register` (client push on success; Google role check is auth D3), `form-oauth-setup` (hard nav, intentional), `form-forgot-password` (error→message rename, consistent with action).
- **Profile forms:** `forms/profile/form-account`, `form-basic-info`, `form-onboarding` (handledStateRef guards; role-selection removal is auth D2), `form-change-username`, `form-upgrade-to-pro` (**N4**), `form-coverage` (profiles D16), `form-presentation-info`, `form-additional-info` (profiles D17), `form-billing`, `form-delete-account`, `form-verification`, `form-portfolio`.
- **Service forms:** `forms/service/form-service-create`, `-edit`, `-edit-media` (type-only).
- **Profile / shared UI:** `profile/menu-user` (**N2/N5**), `profile/contact-reveal` (analytics, D8 known), `shared/save-button` (identical; **N1**).
- **Dashboard:** `dashboard/dashboard-sidebar`, `dashboard-nav-user`, `dashboard-layout` (**N2**), `dashboard-nav-services` (payload unwrap), `dashboard/reviews/dashboard-review-card` (**N7**), `dashboard/services/featured-star-button` (gate + error match, known), `dashboard/support-feedback-dialog` (intentional), `dashboard/no-service-dialog` (known).
- **Messages:** every file in `components/messages/*`. `messages-container` (P3-D1), `chat-list-container`, `chat-list-item`, `chat-messages`, `chat-sidebar`, `header-presence` (identical), `message-input` (identical). OLD-only `header-actions`, `message-edit` and `message-reactions` are unused in OLD.
- **Archives / payments / guards:** `archives/archive-sidebar`, `archive-sidebar-filters` (intentional), `app/payment/callback/callback-redirect` (hard nav fix), `app/(dashboard)/dashboard/checkout/checkout-content`, `guards/oauth-setup-guard` (auth domain).
- **Admin:** all `components/admin/*-data-table.tsx`, `admin/forms/*taxonomy*`, `admin-create-service-form`, `manual-subscription-form`, `team-cards-client`. These are type/shape-only or already owned by admin.
- **Unchanged inputs I also checked:** `ui/server-search-combobox`, `home/home-search`, `shared/layout/header/header-search` (identical debounced searches).
- **Layouts:** `app/layout.tsx` and all 9 group layouts (identical except consent/GTM, known). There are no `template.tsx` files on either side, and the `loading.tsx` sets are identical.

### Reference read outside the repo
- better-auth's client query atom (`useAuthQuery` in `better-auth/dist/shared/*.mjs`, version 1.3.28 from a local copy; OLD pins `>=1.4.19 <1.5.0`). The shared-atom design is the same across 1.x. It is cited for the OLD `useSession` semantics.

### Delegated elsewhere
- Team "Blocked" badge removed (`admin/team/team-cards-client.tsx:79-83`) → admin (already in admin.md).
- `oauth-setup-guard` step condition change → auth.

---

## 2. Mapping (client state, old → new)
| Concern | OLD | NEW |
|---|---|---|
| Session state | one better-auth nanostore atom shared by every `useSession()`; `refetch` is stable and updates all subscribers; sign-in/update-user signals refresh it | module cache + **per-component** `useState`; `refetch` is recreated every render and updates only the calling component (`lib/auth/client.ts:29-101`) |
| Saved hearts | `SavedStateProvider` (root layout) reacts to the session atom | same provider, but its session is frozen at mount |
| Realtime | Supabase channels with `mounted` guards around async setup | `openChannelsSocket` (reconnecting WS) with no post-await `closed` check |
| Optimistic messages | per-instance useState (invisible) | module zustand store (P3-D1) |

---

## 3. DIFFERENCES (new findings)

### N1. After an email/password login, every saved heart on the site shows "not saved" until a full reload, and tapping a previously saved item un-saves it — MEDIUM
- **OLD:**
  - `oldnext/src/lib/auth/client.ts:28,71`: `useSession` comes from `createAuthClient`, a single shared atom. better-auth's `useAuthQuery` keeps one `atom({data,…,refetch})`, and `refetch` writes into that same atom (`value.set({... refetch: value.value.refetch})`).
  - So when `form-auth-login.tsx:75` calls `await refetch()` after the login action, **every** mounted `useSession()` consumer re-renders with the user.
  - That includes `SavedStateProvider` in the root layout (`app/layout.tsx`, `<SavedStateProvider>`). Its fetch effect depends on `session?.user?.id` (`saved-state-provider.tsx:63-82`), so it loads the user's saved ids.
- **NEW:**
  - `frontend/src/lib/auth/client.ts:74-101`: each `useSession()` call has its own `useState`, filled once by a mount-only effect (`useEffect(..., [])`, `:92-98`). `refetch` (`:79-90`) only does `setData` on **its own** instance. Nothing notifies other instances.
  - `SavedStateProvider` sits in the root layout (`frontend/src/app/layout.tsx:57`), so it never remounts during client-side navigation. It mounted on `/login` with `data = null`. After login, `form-auth-login.tsx:84-85` does `router.push(redirectPath)` + `router.refresh()`. Neither resets client state, so the provider's `session?.user?.id` stays `undefined` forever. The fetch guard at `saved-state-provider.tsx:64` never passes, `hasFetched` stays false, and `isSaved()` returns `false` for everything (`:88-91`).
  - `SaveButton` mounts later with its own fresh `useSession` (logged in) and calls the pure toggle endpoint (`save-button.tsx:62-77`, `actions/saved/toggle-save.ts:7-17`, `backend/apps/saved/services/toggle.py:11-34`: it deletes if the item exists).
- **Scenario:**
  1. A user with saved services logs in with email/password, lands on `/dashboard`, and clicks the logo (client nav) to go home or to an archive.
  2. Every heart is empty, including services they saved.
  3. They tap the heart on one they had saved. It fills, then the server answer (`isSaved:false`) empties it. The item has been **removed** from "Αποθηκευμένα".
  4. A hard reload fixes the display. Google login (full redirect) and fresh page loads are not affected.
- **Possibly intentional?:** no. This is a side effect of replacing the better-auth client.
- **Fix:** make the session a shared store (zustand / `useSyncExternalStore` over `cachedSession` with subscriber notify in `fetchSession`/`signIn`/`signOut`). That also fixes N2–N5.

### N2. Dashboard sidebar and top-right menu keep the old avatar, display name and username after the user changes them; profile links go to the old `/profile/<old-username>` — MEDIUM
- **OLD:**
  - `forms/profile/form-account.tsx:106-108` and `form-change-username.tsx:143-144` call `refetch()` + `router.refresh()`.
  - The server actions also force-bust better-auth's 2-minute cookie cache (`oldnext/src/actions/auth/update-account.ts:107-130`: `auth.api.updateUser` + `getSession({disableCookieCache:true})` ×2; `change-username.ts:133`).
  - With the shared atom, the dashboard sidebar footer (`dashboard-sidebar.tsx` → `NavUser`) and the header `UserMenu` (`dashboard-layout.tsx:30`) re-render at once with the new image, name and username.
- **NEW:**
  - The same `refetch()` calls (`form-account.tsx:124-125`, `form-change-username.tsx:143-144`) refresh only the form's own instance (`lib/auth/client.ts:79-90`).
  - `DashboardSidebar` (`dashboard-sidebar.tsx:66,116-122,281`), `NavUser` (`dashboard-nav-user.tsx:54,119`: `userProfilePath = /profile/${sessionUser?.username}`) and `UserMenu` (`menu-user.tsx:65,169,200-218`) each hold their own session, captured at mount. They live in the persistent dashboard layout, so they never remount while the user stays in `/dashboard/*`. `router.refresh()` doesn't re-run their mount effects.
- **Scenario:**
  - A pro changes their username in Λογαριασμός. The success toast shows, but "Προφίλ" in the sidebar and avatar menu still links to `/profile/<old>`, which is now a 404.
  - Changing the avatar or display name leaves the old ones in the sidebar footer and header until the user leaves the dashboard route group or reloads.
- **Possibly intentional?:** no.

### N3. Login success effect re-runs in a loop: repeated `getSession` server actions and repeated `router.push`/`refresh` until the page unmounts — MEDIUM (verify live)
- **OLD:**
  - `form-auth-login.tsx:68-90` (file identical in both apps) has deps `[state.success, state.data, router, refetch]`.
  - better-auth's `refetch` is a stable reference (stored once in the atom), so the effect runs once per action result: one session refetch, one push, one refresh.
- **NEW:**
  - `useSession` returns a **new `refetch` closure every render** (`lib/auth/client.ts:79`).
  - `refetch` itself causes renders: `setPending(true)` → `setData(new object)` → `setPending(false)` (`:80-89`).
  - So once `state.success` is true, each render re-fires the effect. Each pass calls `refetch()` (a forced `getSession` server action, `fetchSession(true)` bypasses dedupe, `:35-72`) and schedules another `router.push` + `router.refresh` after 300ms. Each resolved refetch triggers about two more renders and therefore more passes, until navigation unmounts the form.
  - The team already hit this exact loop in the sibling forms. The comments at `form-account.tsx:109-115`, `form-basic-info.tsx:147-151`, `form-onboarding.tsx:222-225` and `menu-user.tsx:75-80` say "hammering /api/auth/session until Django rate-limits to 429" / "freezing /onboarding". The login form was not given the same `handledStateRef` guard.
- **Impact:**
  - "Επιτυχής Σύνδεση" / redirecting spinner lasts longer (Next queues server actions ahead of the navigation).
  - It can burst into the global `user 200/5s` throttle (lib-shared D12). A 429 inside the server-action refresh path deletes the cookies (pass3-lib S-D1), which shows as a login that silently fails.
- **Possibly intentional?:** no.
- **Fix:** add the `handledStateRef` guard (as in the other forms), or memoize `refetch` (part of the N1 fix).

### N4. Username-change and upgrade-to-pro error toasts re-fire on every keystroke — LOW
- **OLD:**
  - `form-change-username.tsx:125-153` has deps `[state, form, onSuccess, refreshSession, router]`. `form-upgrade-to-pro.tsx:99-121` has deps `[state.success, state.message, onSuccess, refreshSession]`.
  - With a stable `refreshSession`, the `else if (!state.success && state.message) toast.error(...)` branch runs once per action result.
- **NEW:**
  - The code is identical, but `refreshSession` changes on every render. Both forms use RHF `mode: 'onChange'` (`form-change-username.tsx:98`, `form-upgrade-to-pro.tsx:74`), so every keystroke re-runs the effect and calls `toast.error(state.message, {id})` again.
  - The success branch is protected by `toastShownRef`. The error branch is not.
- **Impact:** after a failed attempt (e.g. "username already taken"), the error toast never times out while the user types a new value, and reappears if dismissed.
- **Possibly intentional?:** no (same root cause as N3).

### N5. `refetch` puts the session back into "pending" even when a user is already known; the header avatar flashes to a skeleton on /onboarding and /oauth-setup — LOW
- **OLD:** better-auth `onRequest` sets `isPending: currentValue.data === null`, so a refetch with a known user keeps `isPending=false`. Only `isRefetching` turns true.
- **NEW:**
  - `lib/auth/client.ts:80` sets `setPending(true)` unconditionally.
  - `menu-user.tsx:80-86` calls `refetch()` on every navigation to `/onboarding` or `/oauth-setup`, and `:123` renders the skeleton while `isPending`.
  - Login and onboarding forms also expose `isPending` from their own instance; `form-onboarding.tsx:121` reads `isSessionPending`.
- **Impact:** the logged-in avatar menu is briefly replaced by skeleton circles on those pages. Any UI that gates on `isPending` blinks on each refetch.
- **Possibly intentional?:** no.

### N6. A socket closed while its token fetch is in flight is still opened afterwards and never closed (leaked WebSocket) — LOW
- **OLD:** each Supabase hook guarded the async setup with a `mounted` flag and unsubscribed the channel if the component unmounted mid-setup:
  - `use-chat-list-subscription.ts:48,61-65,76`
  - `use-presence.ts:85,104-108,121`
  - `use-chat-subscription.ts:55,161-165,187-190,202`
- **NEW:**
  - `lib/realtime/channels-ws.ts:76-81`: `connect()` checks `closed` **before** `await fetchAccessToken()` and not after, then does `socket = new WebSocket(url)` anyway.
  - `close()` (`:139-147`) ran while `socket` was still `null`, so it closed nothing. The late socket gets live handlers. Its `onclose` won't reconnect (`closed` is true), but nothing ever closes it.
  - The token cache lasts 60s (`:45`), so the window is the network latency of `/api/auth/ws-token` on the first connect and on any reconnect more than 60s after the last one.
- **Triggers:**
  - opening a chat and leaving it or switching chats before the token returns (each chat page opens 4 sockets: the list, the chat, and 2× presence in `header-presence.tsx:29-40`);
  - the chat-list effect churn (pass3-messaging §churn: each refresh tears down and reopens the list socket) when the token cache has expired;
  - React StrictMode in dev (every mount).
- **Impact:**
  - Orphan sockets stay open for the life of the tab.
  - Each leaked chat-list socket fires `getChats` server actions on every presence or message event (`use-chat-list-subscription.ts:46-55`).
  - Leaked presence sockets hold the user's presence refcount above 0 (`consumers.py:49-93`). Presence is not rendered (messaging D8), so this is not visible.
- **Possibly intentional?:** no.
- **Fix:** add `if (closed) return;` after the `await` in `connect()`.

### N7. Dashboard review card: the "Εμφάνιση σχολίου" eye icon now reflects the real `visibility`. OLD showed `published` and broke after the first click — LOW (old bug fixed)
- **OLD:**
  - `components/dashboard/reviews/dashboard-review-card.tsx:24,40` uses `useState(review.published)` and then `setIsPublished(result.data.published)`.
  - The OLD action returns `data: { visibility }` (`oldnext/src/actions/reviews/toggle-review-visibility.ts:95`), so after any toggle the state became `undefined`, which renders EyeOff.
  - On load it showed the admin `published` flag, which is always true for approved reviews. So it showed "visible" even when the pro had hidden the comment.
- **NEW:** `useState(review.visibility)` / `setIsPublished(result.data.visibility)` (`:24,40`). Django sends `visibility` (`backend/apps/reviews/selectors/review_reads.py:269,327`).
- **Impact:** the icon state differs from OLD: NEW is correct, OLD was wrong.
- **Possibly intentional?:** yes, likely a deliberate fix. Listed so it is not "re-fixed" back to parity.

---

## 4. Corrections and refinements to earlier reports

- **auth-accounts.md §4 ("Identical components: `form-auth-login`, …, `form-change-username`, `form-upgrade-to-pro`…")**
  - The files are byte-identical, but the behavior is not. Their effects depend on `useSession().refetch`, which was stable in OLD and is new on every render in NEW.
  - That gives the loop in N3 and the toast re-fire in N4, and their `refetch()` no longer updates the rest of the UI (N1/N2).
  - The same applies to `saved-state-provider.tsx` and `save-button.tsx`, also "identical" (reviews-saved scope).
- **pass3-messaging P3-D1 point 3 (phantom bubbles survive navigation)** has a sharper variant worth noting for the fix:
  1. Send a message, then delete it.
  2. Navigate to another chat and back, client-side.
  3. The deleted message reappears as a normal own bubble. Django's list excludes `deleted=True` (`chat_ops.py:306`), so its `serverId` is no longer in `serverIds` (`messages-container.tsx:166-173`), and the store entry (`use-message-optimistic.ts:115`) is never cleared.
  - OLD removed the temp entry after 1s, so this could not happen.
  - Same fix as P3-D1: clear `byChat[chatId]` on unmount, or drop entries once `serverId` is set.
- **pass3-messaging §"Chat-list socket churn … parity":** the churn itself is parity. Its interaction with the missing post-await guard (N6) is new-only.

---

## 5. Confirmed same (verified)
- `useUnreadCount` SWR config: 60s interval, focus/reconnect revalidate, 5s dedupe, no error retry, keyed by user id.
- `use-chat-subscription`: module-level `activeSubscriptions` double-subscribe guard; `processedMessageIds` reset on `[chatId, initialMessages]`; `messages` state is seeded once from `initialMessages`. The chat page remounts per `[chatId]` segment on both sides.
- `HeaderPresence`: `userWithPresence` cached from props with the same effect on both sides. The file is identical.
- `messages-container`: mark-read effects (`[chatId,currentUserId]` and `[realtimeMessages,…]`); scroll-to-bottom timer is cleared; older-page loading (50, `before` = first message's `createdAt`, `hasMore` initial `>= 20`). Django returns pages oldest→newest (`chat_ops.py:315-318`), so `[0]` is the oldest.
- `SaveButton` optimistic toggle with rollback on `success:false`; `startTransition` + `disabled={isPending}`. Identical.
- `FeaturedStarButton` and `DashboardReviewCard`: non-optimistic and disabled while pending.
- `SavedStateProvider` route-change reset and the stale-pathname discard. Identical.
- Zustand stores (home featured tabs, navigation skeleton, service order, subscription sheet) are memory-only on both sides, with identical consumers. None is persisted in NEW except `authStore` (known).
- `form-account`, `form-basic-info`, `form-onboarding`: the new `handledStateRef` / snapshot guards keep OLD's "once per action result" semantics, given NEW's unstable `refetch`.
- `callback-redirect` and `form-oauth-setup` hard navigations: deliberate fixes.
- Debounced searches (header, home, admin combobox) are identical.

## 6. Open questions / couldn't verify
- **N3:** I did not run the loop live. The fan-out count depends on server-action latency and on Next's action queue. The sibling-form comments say the same pattern produced 429s in practice.
- **N1:** I assumed the dashboard → home hop is a client-side `NextLink`, which it is for the sidebar and logo links. Any hard navigation in between hides the bug.
- **better-auth source:** read from a local 1.3.28 copy, because OLD has no `node_modules` and pins 1.4.x. The shared-atom / stable-`refetch` design is the same in 1.4.
