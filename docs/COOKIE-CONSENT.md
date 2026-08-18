# Cookie consent — implementation guide

**Status:** implemented on branch `payments-test` (Aug 2026). Replaces the paid
**CookieFirst** CMP with an in-repo, open-source consent banner that speaks
**Google Consent Mode v2** and follows the Greek DPA (ΑΠΔΠΧ) 2020 cookie
guidance. Also unifies the auth-cookie lifetimes (see §9).

---

## 1. Why we changed it

| Before | After |
|---|---|
| CookieFirst (paid subscription) configured **inside** the GTM container; nothing in this repo enforced or even knew about consent. | Consent handled 100% in our code with [`vanilla-cookieconsent`](https://cookieconsent.orestbida.com) v3 (MIT, zero deps, ~15 KB). |
| `gtm.js` was injected **unconditionally** — on first interaction *or after 5 s* — with no `gtag('consent','default')` beforehand. | Consent-Mode defaults (all denied) are set in `<head>`; `gtm.js` is loaded **only after the visitor opts in** to at least one non-necessary category. |
| No cookie policy page, no "manage cookies" link, no cookie table. | `/cookies` page + footer «Ρυθμίσεις cookies» button + per-cookie tables in the banner. |

**Do we need a Google-certified CMP?** No. Google only mandates a certified CMP
for publishers serving **AdSense / Ad Manager / AdMob** ads to EEA/UK users.
We serve no ads and run no Google Ads campaigns; we only use **GA4** and the
**Meta Pixel** (both live inside GTM). For those, correct Consent Mode v2
signals are what matters — and we send them. If AdSense/Ad Manager is ever
added, revisit this (free certified CMPs exist, e.g. CookieYes free tier).

---

## 2. Compliance checklist (ΑΠΔΠΧ 2020 guidance · ePrivacy ν. 3471/2006 άρ. 4§5 · GDPR)

| Requirement | How it is met |
|---|---|
| Accept-all and Reject-all with **equal prominence**, same click depth | Both on the first layer, `equalWeightButtons: true` (same size/colour/font). Verified in headless Chrome: identical background, font-size, height. |
| No pre-ticked non-essential boxes; scrolling/continuing ≠ consent | Library `mode: 'opt-in'`; analytics/marketing default off; no close-"X" on the first layer. |
| Granular per-category choice | Preferences modal with per-category toggles (necessary is read-only). |
| Information per cookie (name, provider, purpose, expiry) | Cookie tables in the preferences modal **and** on `/cookies`, both generated from one inventory file. |
| Withdrawal as easy as consent, at any time | Footer «Ρυθμίσεις cookies» button on every page + button on `/cookies`; withdrawn categories' cookies are erased (`autoClearCookies`). |
| Nothing fires before consent | Zero requests to `googletagmanager.com` before a choice or after reject-all (verified). |
| Re-obtain consent when the policy changes | `CONSENT_REVISION` — bump it, everyone is asked again with a revision message. |
| Reasonable consent lifetime | 182 days (`CONSENT_EXPIRES_DAYS`). |
| Records | `dl_consent` cookie holds categories, revision, timestamp and a random consentId (library default). |

> The existing legal pages (`/terms`, `/privacy`) are untouched. The banner copy and
> the new sections of `/cookies` were drafted by engineering — have them reviewed by
> whoever owns the legal texts.

---

## 3. Architecture

```
<head>  ConsentDefaultsScript ─────► gtag('consent','default', all denied)   (SSR, before hydration)
                                     gtag('set','ads_data_redaction',true)

<body>  CookieConsentBanner ('use client') ──► CookieConsent.run(config)
            │
            ├─ no valid dl_consent cookie  → banner shown → visitor clicks
            └─ valid dl_consent cookie      → banner hidden, stored choice re-applied
                          │
                          ▼  onFirstConsent / onConsent / onChange
             applyConsentToGtag()   ─► gtag('consent','update', {…})           ─┐  pushed to
                                    ─► dataLayer.push({event:'cookie_consent_update', …})  ─┘  window.dataLayer
             loadGtmIfConsented()   ─► analytics OR marketing accepted?
                                         yes → inject gtm.js  (immediately after a click,
                                                                deferred on page load: 1st interaction / 5 s idle)
                                         no  → nothing (GTM never loads)
                                                    │
                                                    ▼
                                   GTM container GTM-KR7N94L4 → GA4 / Meta Pixel tags
                                   (each tag additionally gated by consent settings — §6)
```

"Basic" consent mode was chosen on purpose: no cookieless "modelling" pings to
Google before consent. Strictest reading of the Greek guidance; the trade-off
(no GA4 behavioural modelling for declined visitors) is irrelevant without ads.

Deliberately **no** `<noscript>` GTM iframe — it cannot honour opt-in.

---

## 4. Files

| File | Role |
|---|---|
| `frontend/src/constants/datasets/cookies.ts` | **Cookie inventory** — single source for the banner tables and `/cookies`. Add rows here. |
| `frontend/src/lib/analytics/consent.ts` | Constants (`GTM_ID`, `CONSENT_EVENT`, `CONSENT_COOKIE_NAME`, `CONSENT_REVISION`, `CONSENT_EXPIRES_DAYS`), `applyConsentToGtag()`, gated GTM loader, `trackEvent()`, `openCookiePreferences()`. |
| `frontend/src/lib/analytics/cookie-consent-config.ts` | Library config: categories, services, autoClear rules, **all Greek copy**, GUI options, callbacks. |
| `frontend/src/components/consent/consent-defaults-script.tsx` | Inline `<head>` script with the Consent Mode defaults. |
| `frontend/src/components/consent/cookie-consent.tsx` | Client component that runs the library (mounted in `app/layout.tsx`). |
| `frontend/src/components/consent/cookie-settings-button.tsx` | «Ρυθμίσεις cookies» button (footer + `/cookies`). |
| `frontend/src/styles/cookie-consent.css` | Theme overrides (site colours/radius/font). |
| `frontend/src/app/(pages)/cookies/page.tsx` | Πολιτική Cookies page — same skeleton/section style as `/terms` and `/privacy`; reuses the existing cookies wording of Όροι Χρήσης XVII and Πολιτική Απορρήτου III verbatim, adds the per-cookie list and the consent-management section (+ `getCookiesMetadata` in `lib/seo/pages.ts`, sitemap entry). |
| `frontend/src/app/layout.tsx` | Old unconditional GTM loader **removed**; head script + banner mounted. |
| `frontend/src/components/profile/contact-reveal.tsx` | `reveal_contact` now goes through `trackEvent()` (the old `window.gtag` call never worked — gtag was never defined). |
| `frontend/src/types/global.d.ts` | `window.gtag` typed loosely (needs `'consent'` command). |
| `frontend/Dockerfile`, `docker-compose.yml`, `DOKPLOY.md`, `DEPLOY-doulitsa-test.md` | `NEXT_PUBLIC_GTM_ID` plumbing. |

---

## 5. Cookie inventory

Generated from `constants/datasets/cookies.ts` — keep both in sync (edit the TS file, this table is documentation).

| Cookie | Category | Provider | Purpose | Expiry |
|---|---|---|---|---|
| `dj_access` | necessary | doulitsa.gr | JWT access token (httpOnly) | 15 min |
| `dj_refresh` | necessary | doulitsa.gr | JWT refresh token (httpOnly) | 3 days |
| `g_oauth_state` | necessary | doulitsa.gr | CSRF protection for Google login | 10 min |
| `g_oauth_next` | necessary | doulitsa.gr | Return path after Google login | 10 min |
| `oauth_intent` | necessary | doulitsa.gr | Chosen account type before Google login | 10 min |
| `sidebar_state` | necessary | doulitsa.gr | Dashboard sidebar open/closed | 7 days |
| `dl_consent` | necessary | doulitsa.gr | Stores the visitor's cookie choices | 6 months |
| `_ga`, `_ga_*` | analytics | Google Analytics 4 (Google Ireland Ltd.) | Visitor distinction / session state | 2 years |
| `_fbp`, `fr` | marketing | Meta Pixel (Meta Platforms Ireland Ltd.) | Ad measurement / targeting | 3 months |

> The third-party rows describe what the GA4 and Meta tags in the GTM container
> set. **Confirm against the live container** whenever tags are added/removed.

---

## 6. Google Tag Manager — changes to apply (container `GTM-KR7N94L4`)

The page now sets consent defaults itself and only loads GTM after an opt-in;
GTM must stop relying on CookieFirst and gate its tags on Consent Mode.

1. **Tags → CookieFirst**: delete (or pause) the CookieFirst tag. **Templates**: remove the CookieFirst template if present. Any "consent initialization" tag from CookieFirst → delete (defaults now come from the page).
2. **Admin → Container Settings → "Enable consent overview"** (checkbox) — gives you the consent column in the Tags list.
3. **Google tag (GA4 configuration)**
   - Triggers: `Initialization – All Pages` **and** a new *Custom Event* trigger with event name `cookie_consent_update`.
   - Advanced Settings → Consent Settings → **Require additional consent for tag to fire**: `analytics_storage`.
   - Advanced Settings → Tag firing options: **Once per page** (so the config fires once whether consent was stored at load or granted later from the preferences modal).
4. **Meta Pixel** (base code + any event tags)
   - Same two triggers; **additional consent**: `ad_storage` and `ad_user_data`. Once per page for the base code.
   - The Pixel is *marketing*, never analytics — do not gate it on `analytics_storage` alone.
5. **GA4 event `reveal_contact`** (new — the site pushes `{event:'reveal_contact', contact_type:'phone'|'email'}`)
   - Data Layer Variable `DLV - contact_type` (name `contact_type`).
   - GA4 Event tag, event name `reveal_contact`, parameter `contact_type = {{DLV - contact_type}}`, trigger *Custom Event* `reveal_contact`, additional consent `analytics_storage`.
6. Optional debug variables: `DLV - consent_analytics`, `DLV - consent_marketing` (booleans pushed with `cookie_consent_update`).
7. **Do not** add another Consent Mode default tag — defaults are set on-page before GTM can load.
8. **Preview (Tag Assistant)** on a fresh browser profile:
   - Before any choice / after «Απόρριψη όλων»: no `gtm.js` request at all (Tag Assistant won't even connect — expected).
   - After «Αποδοχή όλων»: container loads; *Consent* tab shows `analytics_storage`/`ad_storage` **granted**; GA4 + Meta fire once; `cookie_consent_update` visible in the event list.
   - Reject, then open footer «Ρυθμίσεις cookies» → enable only Στατιστικά → save: GA4 fires, Meta does not.
9. **Publish** the container.

---

## 7. Environment

| Var | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_GTM_ID` | build-time (`--build-arg` / Dokploy *Build-time Variables*) | Baked into the browser bundle. `frontend/Dockerfile` defaults it to `GTM-KR7N94L4`. **Empty/unset ⇒ GTM is never loaded** (banner still works) — that's the local `docker-compose.yml` default so laptops don't pollute GA4/Meta. |

---

## 8. Testing checklist

Local: `docker compose up -d frontend` → http://localhost:3000

- [ ] Banner appears; «Αποδοχή όλων» / «Απόρριψη όλων» look identical; «Διαχείριση προτιμήσεων» opens the modal.
- [ ] `view-source:` contains the `consent','default'` script and **no** `googletagmanager.com`.
- [ ] DevTools → Application → Cookies: no `dl_consent` before a choice; after a choice `dl_consent` with `categories` and `revision`.
- [ ] Console `dataLayer`: `['consent','default',…]`, then after a choice `['consent','update',…]` + `{event:'cookie_consent_update'}` **before** any `gtm.start`.
- [ ] Reload → banner stays hidden; footer «Ρυθμίσεις cookies» reopens it; withdrawing analytics erases `_ga*`.
- [ ] `/cookies` renders the table + button; `/sitemap_static.xml` lists `/cookies`.
- [ ] Reveal a profile phone → `dataLayer` gets `{event:'reveal_contact', contact_type:'phone'}`.
- [ ] Bump `CONSENT_REVISION` to 2 → banner re-shown with the revision message.
- [ ] `cd frontend && npx tsc --noEmit && yarn lint` clean.

GTM path (set `NEXT_PUBLIC_GTM_ID`): verified in headless Chrome — 0 requests before choice / after reject; 1 request right after accept or after a later grant; deferred (≤5 s idle) on reload with a stored accept; the `consent update` precedes `gtm.start` in the dataLayer.

---

## 9. Auth cookies (done in the same change)

The JWT cookie pair used to be written with **four different lifetime sets**
(15 min/3 d, 1 h/14 d — non-httpOnly, …). Now every path (login server action,
Google OAuth callback, middleware refresh) uses `frontend/src/lib/auth/cookies.ts`:

| Cookie | Max-Age | Flags |
|---|---|---|
| `dj_access` | 900 s (15 min) | HttpOnly, SameSite=Lax, Secure on https |
| `dj_refresh` | 259 200 s (3 days) | HttpOnly, SameSite=Lax, Secure on https |

Backend: `SIMPLE_JWT_ACCESS_LIFETIME_MINUTES=15`, `SIMPLE_JWT_REFRESH_LIFETIME_DAYS=3` (`docker-compose.yml`, deploy docs, `backend/.env.example`). Refresh tokens rotate on every use → active users stay logged in; 3 idle days = logout. The `canPersistServerCookies()` probe no longer re-sets `dj_access` (it was silently extending it).

Follow-up (not done): the browser branch of `setTokens()` and `signIn.email` in `lib/auth/client.ts` are dead code (login runs as a server action; httpOnly cookies are unreadable to JS) — safe to delete.

---

## 10. Maintenance

- **Change texts** → `lib/analytics/cookie-consent-config.ts` (`language.translations.el`).
- **Add a vendor/cookie** → add rows to `constants/datasets/cookies.ts`; if it's a new category add it to `categories` + a `preferencesModal.sections` entry with `linkedCategory`; gate the GTM tag with the matching consent type; **bump `CONSENT_REVISION`**.
- **Change consent lifetime** → `CONSENT_EXPIRES_DAYS`.
- **Disable tracking on an environment** → build with an empty `NEXT_PUBLIC_GTM_ID`.
- **Lighthouse / bots** → `hideFromBots: true`: crawlers never see the banner nor load GTM.
- **Known limitations** → no `<noscript>` GTM fallback (by design); no GA4 consent-mode modelling (basic mode); legal wording needs review.
