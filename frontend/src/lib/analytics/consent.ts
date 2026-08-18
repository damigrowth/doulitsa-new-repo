/**
 * Consent ⇄ Google Consent Mode v2 ⇄ Google Tag Manager bridge.
 *
 * Client-only helpers (no React). The flow:
 *
 *   <head> consent-defaults script      → gtag('consent','default', all denied)
 *   CookieConsentBanner (vanilla-cookieconsent) → user decides / stored decision
 *   applyConsentToGtag()                → gtag('consent','update', …) + dataLayer event
 *   loadGtmIfConsented()                → inject gtm.js ONLY if ≥1 non-necessary
 *                                          category is accepted ("basic" consent mode)
 *
 * With basic mode nothing from Google/Meta is requested unless the visitor
 * opted in — the strictest reading of the Greek DPA (ΑΠΔΠΧ) 2020 guidance.
 * The default-denied signals are still pushed so that GTM's built-in and
 * "additional" consent checks behave correctly once the container loads, and
 * so that a later grant from the preferences modal takes effect without a
 * page reload.
 *
 * Google Tag Manager itself only hosts GA4 + Meta Pixel; when the visitor
 * rejects everything there is nothing inside it that may fire, so we simply
 * never load it.
 */

import * as CookieConsent from 'vanilla-cookieconsent';

/** GTM container id — build-time public env. Unset/empty ⇒ GTM never loads. */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? '';

/** dataLayer event fired after every consent decision (GTM trigger name). */
export const CONSENT_EVENT = 'cookie_consent_update';

/** First-party cookie that stores the visitor's choices. */
export const CONSENT_COOKIE_NAME = 'dl_consent';

/**
 * Bump whenever the cookie policy / vendor list changes: every returning
 * visitor is shown the banner again (with `revisionMessage`) and must
 * re-consent. 0 would disable revision management — keep it ≥ 1.
 */
export const CONSENT_REVISION = 1;

/** Consent expiry (days). Greek DPA guidance considers 6 months reasonable. */
export const CONSENT_EXPIRES_DAYS = 182;

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing';

// ---------------------------------------------------------------------------
// gtag / dataLayer plumbing
// ---------------------------------------------------------------------------

function ensureDataLayer(): unknown[] {
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

/**
 * Minimal gtag shim. IMPORTANT: Google's consent/set commands are only
 * recognised by GTM when the *arguments object* is pushed (not an array).
 * `window.gtag` is normally defined by the head script; this is the fallback.
 */
function gtag(..._args: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  ensureDataLayer().push(arguments);
}

/** Current consent snapshot as the library sees it. */
export function getConsentState(): { analytics: boolean; marketing: boolean } {
  return {
    analytics: CookieConsent.acceptedCategory('analytics'),
    marketing: CookieConsent.acceptedCategory('marketing'),
  };
}

/**
 * Translate the visitor's category choices into Consent Mode v2 signals and
 * announce the change to GTM. Call this BEFORE loading gtm.js so the update
 * (and the event) precede the container's tag evaluation.
 */
export function applyConsentToGtag(): void {
  if (typeof window === 'undefined') return;
  const { analytics, marketing } = getConsentState();
  const g = window.gtag ?? gtag;
  g('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  });
  ensureDataLayer().push({
    event: CONSENT_EVENT,
    consent_analytics: analytics,
    consent_marketing: marketing,
  });
}

// ---------------------------------------------------------------------------
// GTM loading (basic consent mode: only after an opt-in)
// ---------------------------------------------------------------------------

let gtmLoaded = false;
let gtmScheduled = false;

/** Inject gtm.js exactly once (no-op when NEXT_PUBLIC_GTM_ID is unset). */
export function loadGtm(): void {
  if (gtmLoaded || !GTM_ID || typeof document === 'undefined') return;
  gtmLoaded = true;
  const dl = ensureDataLayer();
  dl.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  const first = document.getElementsByTagName('script')[0];
  if (first?.parentNode) first.parentNode.insertBefore(script, first);
  else document.head.appendChild(script);
}

/**
 * Lazy variant for page loads that already carry a stored opt-in: defer the
 * (non-critical) GTM download until the first user interaction or 5 s idle,
 * so it never competes with hydration (TBT). Same heuristic the old inline
 * loader used — but now only ever runs after consent.
 */
export function scheduleGtmLoad(): void {
  if (gtmLoaded || gtmScheduled || !GTM_ID || typeof window === 'undefined') return;
  gtmScheduled = true;
  const events = ['scroll', 'click', 'touchstart', 'mousemove', 'keydown'] as const;
  const once = () => {
    events.forEach((e) => window.removeEventListener(e, once));
    loadGtm();
  };
  events.forEach((e) => window.addEventListener(e, once, { passive: true, once: true }));
  window.setTimeout(once, 5000);
}

/**
 * Load GTM only if the visitor accepted at least one non-necessary category.
 * `immediate` = the visitor just clicked (load right away); otherwise defer.
 */
export function loadGtmIfConsented(immediate: boolean): void {
  const { analytics, marketing } = getConsentState();
  if (!analytics && !marketing) return;
  if (immediate) loadGtm();
  else scheduleGtmLoad();
}

// ---------------------------------------------------------------------------
// Public helpers for the app
// ---------------------------------------------------------------------------

/**
 * Push a custom event to the dataLayer. GTM decides (via each tag's consent
 * settings) whether anything fires; when GTM isn't loaded the push is inert.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  ensureDataLayer().push({ event: name, ...params });
}

/** Re-open the preferences modal (footer "Ρυθμίσεις cookies", /cookies page). */
export function openCookiePreferences(): void {
  if (typeof window === 'undefined') return;
  CookieConsent.showPreferences();
}
