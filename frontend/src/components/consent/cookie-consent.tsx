'use client';

/**
 * Cookie consent banner (vanilla-cookieconsent v3).
 *
 * Renders nothing itself — the library appends its own modals to <body>.
 * Mounted once in the root layout. If a valid `dl_consent` cookie already
 * exists the banner stays hidden and `onConsent` re-applies the stored choice
 * (Consent Mode signals + gated GTM load) — see lib/analytics/consent.ts.
 */

import { useEffect } from 'react';
import * as CookieConsent from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import '@/styles/cookie-consent.css';

import { cookieConsentConfig } from '@/lib/analytics/cookie-consent-config';

export default function CookieConsentBanner() {
  useEffect(() => {
    void CookieConsent.run(cookieConsentConfig);
  }, []);

  return null;
}
