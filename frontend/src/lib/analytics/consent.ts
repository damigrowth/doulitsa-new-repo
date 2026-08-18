/**
 * Consent engine ⇄ Google Consent Mode v2 ⇄ Google Tag Manager bridge.
 *
 * `vanilla-cookieconsent` is used HEADLESS (autoShow: false, no library UI):
 * it stores the decision in the `dl_consent` cookie, handles revisions and
 * auto-clearing of rejected cookies, and fires the callbacks below. The
 * visible UI (banner + settings dialog) is our own React replica of the
 * previous CookieFirst banner — see components/consent/*.
 *
 * Flow:
 *   <head> consent-defaults script   → gtag('consent','default', all denied)
 *   engine (stored decision / click)  → onConsent / onChange
 *   applyConsentToGtag()              → gtag('consent','update', …) + dataLayer event
 *   loadGtmIfConsented()              → inject gtm.js ONLY when a category that
 *                                       has tags in the container (Απόδοση /
 *                                       Marketing) was accepted ("basic" mode)
 */

import * as CookieConsent from 'vanilla-cookieconsent';

import type { CookieCategory } from '@/constants/datasets/cookies';

/** GTM container id — build-time public env. Unset/empty ⇒ GTM never loads. */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? '';

/** dataLayer event fired after every consent decision (GTM trigger name). */
export const CONSENT_EVENT = 'cookie_consent_update';

/** First-party cookie that stores the visitor's choices. */
export const CONSENT_COOKIE_NAME = 'dl_consent';

/**
 * Bump whenever the cookie policy / vendor list changes: every returning
 * visitor sees the banner again and must re-consent. Keep it ≥ 1.
 */
export const CONSENT_REVISION = 1;

/** Consent expiry (days). */
export const CONSENT_EXPIRES_DAYS = 182;

/**
 * Whether the settings dialog pre-selects every category before any consent
 * has been given (this is how the previous CookieFirst banner behaved).
 * NOTE: the Greek DPA (ΑΠΔΠΧ) 2020 guidance considers pre-ticked non-essential
 * categories invalid consent — set to false to open the dialog with only
 * Απαραίτητα enabled.
 */
export const PRESELECT_ALL_CATEGORIES = true;

export const OPTIONAL_CATEGORIES: CookieCategory[] = ['performance', 'functional', 'marketing'];

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
 */
function gtag(..._args: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  ensureDataLayer().push(arguments);
}

export interface ConsentState {
  performance: boolean;
  functional: boolean;
  marketing: boolean;
}

/** Current consent snapshot as the engine sees it. */
export function getConsentState(): ConsentState {
  return {
    performance: CookieConsent.acceptedCategory('performance'),
    functional: CookieConsent.acceptedCategory('functional'),
    marketing: CookieConsent.acceptedCategory('marketing'),
  };
}

/** Has the visitor made a (still valid) decision? */
export function hasValidConsent(): boolean {
  return CookieConsent.validConsent();
}

/**
 * Translate category choices into Consent Mode v2 signals and announce them
 * to GTM. Called BEFORE loading gtm.js so the update precedes tag evaluation.
 */
export function applyConsentToGtag(): void {
  if (typeof window === 'undefined') return;
  const { performance, functional, marketing } = getConsentState();
  const g = window.gtag ?? gtag;
  g('consent', 'update', {
    analytics_storage: performance ? 'granted' : 'denied',
    functionality_storage: functional ? 'granted' : 'denied',
    personalization_storage: functional ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  });
  ensureDataLayer().push({
    event: CONSENT_EVENT,
    consent_performance: performance,
    consent_functional: functional,
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
  ensureDataLayer().push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  const first = document.getElementsByTagName('script')[0];
  if (first?.parentNode) first.parentNode.insertBefore(script, first);
  else document.head.appendChild(script);
}

/**
 * Lazy variant for page loads that already carry a stored opt-in: defer the
 * GTM download until the first user interaction or 5 s idle so it never
 * competes with hydration (TBT). Only ever runs after consent.
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
 * Load GTM only if a category with tags in the container was accepted
 * (GA4 → Απόδοση, Meta Pixel → Marketing). `immediate` = the visitor just
 * clicked; otherwise defer.
 */
export function loadGtmIfConsented(immediate: boolean): void {
  const { performance, marketing } = getConsentState();
  if (!performance && !marketing) return;
  if (immediate) loadGtm();
  else scheduleGtmLoad();
}

// ---------------------------------------------------------------------------
// Decisions (called by the UI)
// ---------------------------------------------------------------------------

/** "Αποδοχή Όλων" */
export function acceptAllCookies(): void {
  CookieConsent.acceptCategory('all');
}

/** "Άρνηση" — only Απαραίτητα stay enabled. */
export function declineAllCookies(): void {
  CookieConsent.acceptCategory([]);
}

/** "Αποθήκευση ρυθμίσεων" — enable exactly the given optional categories. */
export function saveCookieChoices(enabled: CookieCategory[]): void {
  CookieConsent.acceptCategory(enabled.filter((c) => c !== 'necessary'));
}

/** Categories currently accepted (or the pre-selection when undecided). */
export function currentlyAcceptedCategories(): CookieCategory[] {
  if (CookieConsent.validConsent()) {
    return CookieConsent.getUserPreferences().acceptedCategories as CookieCategory[];
  }
  return PRESELECT_ALL_CATEGORIES ? ['necessary', ...OPTIONAL_CATEGORIES] : ['necessary'];
}

// ---------------------------------------------------------------------------
// UI store — banner / settings-dialog visibility (tiny external store so the
// footer button, the /cookies page and the engine can all drive the same UI)
// ---------------------------------------------------------------------------

export interface ConsentUiState {
  /** Engine finished reading the stored decision. */
  ready: boolean;
  /** First layer visible (no valid decision yet). */
  bannerVisible: boolean;
  /** Settings dialog open. */
  panelOpen: boolean;
}

let uiState: ConsentUiState = { ready: false, bannerVisible: false, panelOpen: false };
const listeners = new Set<() => void>();

function setUiState(patch: Partial<ConsentUiState>): void {
  uiState = { ...uiState, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeConsentUi(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getConsentUiState(): ConsentUiState {
  return uiState;
}

/** Called by the banner component once the engine has run. */
export function markConsentEngineReady(): void {
  setUiState({ ready: true, bannerVisible: !CookieConsent.validConsent() });
}

/** Called after any decision so the banner hides. */
export function refreshBannerVisibility(): void {
  setUiState({ bannerVisible: !CookieConsent.validConsent() });
}

/** Re-open the settings dialog (footer «Ρυθμίσεις cookies», /cookies page). */
export function openCookiePreferences(): void {
  if (typeof window === 'undefined') return;
  setUiState({ panelOpen: true });
}

export function closeCookiePreferences(): void {
  setUiState({ panelOpen: false });
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
