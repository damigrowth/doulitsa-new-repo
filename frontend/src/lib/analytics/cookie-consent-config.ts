/**
 * vanilla-cookieconsent v3 — HEADLESS engine configuration.
 *
 * `autoShow: false` and we never call show()/showPreferences(), so the library
 * renders nothing; our own components (components/consent/*) replicate the
 * previous CookieFirst banner and settings dialog. The library still owns:
 * the `dl_consent` cookie, revision management, auto-clearing the cookies of
 * rejected categories, and the callbacks that drive Consent Mode + GTM.
 *
 * Categories mirror the previous CookieFirst setup: necessary (Απαραίτητα,
 * read-only), performance (Απόδοση), functional (Λειτουργικά), marketing.
 */

import type { CookieConsentConfig } from 'vanilla-cookieconsent';

import {
  CONSENT_COOKIE_NAME,
  CONSENT_EXPIRES_DAYS,
  CONSENT_REVISION,
  applyConsentToGtag,
  loadGtmIfConsented,
  refreshBannerVisibility,
} from '@/lib/analytics/consent';

/** Set by onFirstConsent so onConsent knows the visitor just clicked. */
let justConsented = false;

export const cookieConsentConfig: CookieConsentConfig = {
  mode: 'opt-in',
  autoShow: false,
  revision: CONSENT_REVISION,
  disablePageInteraction: false,
  hideFromBots: true,
  autoClearCookies: true,
  manageScriptTags: false,

  cookie: {
    name: CONSENT_COOKIE_NAME,
    expiresAfterDays: CONSENT_EXPIRES_DAYS,
    sameSite: 'Lax',
    path: '/',
  },

  categories: {
    necessary: {
      enabled: true,
      readOnly: true,
    },
    performance: {
      autoClear: {
        cookies: [{ name: /^_ga/ }],
        reloadPage: false,
      },
    },
    functional: {},
    marketing: {
      autoClear: {
        cookies: [{ name: '_fbp' }, { name: 'fr' }],
        reloadPage: false,
      },
    },
  },

  // Required by the library even though its modals are never rendered.
  language: {
    default: 'el',
    translations: {
      el: {
        consentModal: {
          title: 'Αποδοχή Cookies',
          description: '',
          acceptAllBtn: 'Αποδοχή Όλων',
          showPreferencesBtn: 'Προσαρμογή',
        },
        preferencesModal: {
          title: 'Ρυθμίσεις απορρήτου',
          acceptAllBtn: 'Αποδοχή Όλων',
          acceptNecessaryBtn: 'Άρνηση',
          savePreferencesBtn: 'Αποθήκευση ρυθμίσεων',
          sections: [],
        },
      },
    },
  },

  // Callback order in the library: onFirstConsent → onConsent (first decision),
  // or just onConsent (page load with a stored decision). Signals + GTM load
  // happen once, in onConsent, strictly: consent update → event → gtm.js.
  onFirstConsent: () => {
    justConsented = true;
  },
  onConsent: () => {
    applyConsentToGtag();
    loadGtmIfConsented(justConsented);
    justConsented = false;
    refreshBannerVisibility();
  },
  // Preferences changed later (settings dialog) → signal + load if now opted in.
  onChange: () => {
    applyConsentToGtag();
    loadGtmIfConsented(true);
    refreshBannerVisibility();
  },
};
