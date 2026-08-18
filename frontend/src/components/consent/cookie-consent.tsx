'use client';

/**
 * Cookie consent root — runs the headless engine (vanilla-cookieconsent) and
 * renders our replica of the previous CookieFirst UI:
 *   - the first-layer banner while no valid decision is stored,
 *   - the settings dialog when opened (banner «Προσαρμογή», footer
 *     «Ρυθμίσεις cookies», /cookies page).
 * Mounted once in the root layout.
 */

import { useEffect, useSyncExternalStore } from 'react';
import * as CookieConsent from 'vanilla-cookieconsent';

import { cookieConsentConfig } from '@/lib/analytics/cookie-consent-config';
import {
  getConsentUiState,
  markConsentEngineReady,
  subscribeConsentUi,
} from '@/lib/analytics/consent';

import CookieBanner from './cookie-banner';
import CookiePanel from './cookie-panel';

const SERVER_STATE = { ready: false, bannerVisible: false, panelOpen: false };

export default function CookieConsentRoot() {
  const ui = useSyncExternalStore(subscribeConsentUi, getConsentUiState, () => SERVER_STATE);

  useEffect(() => {
    let cancelled = false;
    void CookieConsent.run(cookieConsentConfig).then(() => {
      if (!cancelled) markConsentEngineReady();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ui.ready) return null;
  return (
    <>
      {ui.bannerVisible && !ui.panelOpen && <CookieBanner />}
      {ui.panelOpen && <CookiePanel />}
    </>
  );
}
