/**
 * vanilla-cookieconsent v3 configuration — categories, Greek copy, GCM hooks.
 *
 * Compliance notes (Greek DPA / ΑΠΔΠΧ 2020 guidance, ePrivacy ν. 3471/2006 4§5):
 *  - "Αποδοχή όλων" and "Απόρριψη όλων" are both on the first layer with
 *    equal weight (same style, same click depth) — `equalWeightButtons: true`.
 *  - No close "X" on the consent modal, so there is no ambiguous dismissal.
 *  - Non-necessary categories are OFF by default (`enabled` unset) and the
 *    library runs in `opt-in` mode: scrolling/continuing is never consent.
 *  - Per-category toggles + per-cookie tables (name/provider/purpose/expiry).
 *  - Withdrawal any time via the footer button; changed cookies are erased
 *    (`autoClearCookies`).
 *  - `revision` re-asks everyone when the policy changes.
 *
 * Texts live here — edit freely; the cookie tables come from
 * constants/datasets/cookies.ts.
 */

import type { CookieConsentConfig, CookieTable } from 'vanilla-cookieconsent';

import { cookiesInCategory, type CookieCategory } from '@/constants/datasets/cookies';
import {
  CONSENT_COOKIE_NAME,
  CONSENT_EXPIRES_DAYS,
  CONSENT_REVISION,
  applyConsentToGtag,
  loadGtmIfConsented,
} from '@/lib/analytics/consent';

function cookieTable(category: CookieCategory): CookieTable {
  return {
    caption: 'Λίστα cookies',
    headers: {
      name: 'Cookie',
      provider: 'Πάροχος',
      purpose: 'Σκοπός',
      expiry: 'Διάρκεια',
    },
    body: cookiesInCategory(category).map((c) => ({
      name: c.name,
      provider: c.provider,
      purpose: c.purpose,
      expiry: c.expiry,
    })),
  };
}

/** Set by onFirstConsent so onConsent knows the visitor just clicked. */
let justConsented = false;

export const cookieConsentConfig: CookieConsentConfig = {
  mode: 'opt-in',
  autoShow: true,
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

  guiOptions: {
    consentModal: {
      layout: 'box wide',
      position: 'bottom center',
      equalWeightButtons: true,
      flipButtons: false,
    },
    preferencesModal: {
      layout: 'box',
      position: 'right',
      equalWeightButtons: true,
      flipButtons: false,
    },
  },

  categories: {
    necessary: {
      enabled: true,
      readOnly: true,
    },
    analytics: {
      autoClear: {
        cookies: [{ name: /^_ga/ }],
        reloadPage: false,
      },
      services: {
        ga4: { label: 'Google Analytics 4' },
      },
    },
    marketing: {
      autoClear: {
        cookies: [{ name: '_fbp' }, { name: 'fr' }],
        reloadPage: false,
      },
      services: {
        meta_pixel: { label: 'Meta Pixel' },
      },
    },
  },

  language: {
    default: 'el',
    translations: {
      el: {
        consentModal: {
          label: 'Ρυθμίσεις cookies',
          title: 'Χρησιμοποιούμε cookies',
          description:
            'Το doulitsa.gr χρησιμοποιεί απολύτως απαραίτητα cookies για τη λειτουργία του ' +
            '(π.χ. τη σύνδεση στον λογαριασμό σας). Με τη συγκατάθεσή σας χρησιμοποιούμε επίσης ' +
            'cookies στατιστικών (Google Analytics) και εμπορικής προώθησης (Meta Pixel), ώστε να ' +
            'κατανοούμε πώς χρησιμοποιείται η πλατφόρμα και να τη βελτιώνουμε. Μπορείτε να τα ' +
            'αποδεχθείτε όλα, να τα απορρίψετε όλα ή να επιλέξετε ανά κατηγορία. Μπορείτε να ' +
            'αλλάξετε ή να ανακαλέσετε την επιλογή σας ανά πάσα στιγμή από τον σύνδεσμο ' +
            '«Ρυθμίσεις cookies» στο υποσέλιδο.',
          acceptAllBtn: 'Αποδοχή όλων',
          acceptNecessaryBtn: 'Απόρριψη όλων',
          showPreferencesBtn: 'Διαχείριση προτιμήσεων',
          revisionMessage:
            'Η Πολιτική Cookies μας ενημερώθηκε. Παρακαλούμε ελέγξτε και επιβεβαιώστε ξανά τις προτιμήσεις σας.',
          footer:
            '<a href="/cookies">Πολιτική Cookies</a>\n<a href="/privacy">Πολιτική Απορρήτου</a>',
        },
        preferencesModal: {
          title: 'Ρυθμίσεις cookies',
          acceptAllBtn: 'Αποδοχή όλων',
          acceptNecessaryBtn: 'Απόρριψη όλων',
          savePreferencesBtn: 'Αποθήκευση επιλογών',
          closeIconLabel: 'Κλείσιμο',
          serviceCounterLabel: 'Υπηρεσία|Υπηρεσίες',
          sections: [
            {
              title: 'Χρήση cookies',
              description:
                'Τα cookies είναι μικρά αρχεία κειμένου που αποθηκεύονται στη συσκευή σας. ' +
                'Παρακάτω μπορείτε να ενημερωθείτε για κάθε κατηγορία και να επιλέξετε ποιες ' +
                'αποδέχεστε. Τα απολύτως απαραίτητα cookies δεν μπορούν να απενεργοποιηθούν, ' +
                'καθώς χωρίς αυτά ο ιστότοπος δεν λειτουργεί.',
            },
            {
              title: 'Απολύτως απαραίτητα <span class="pm__badge">Πάντα ενεργά</span>',
              description:
                'Απαιτούνται για τη σύνδεση στον λογαριασμό σας, την ασφάλεια (προστασία CSRF ' +
                'κατά τη σύνδεση μέσω Google), τις βασικές προτιμήσεις εμφάνισης και την ' +
                'αποθήκευση των επιλογών σας για τα cookies. Δεν χρησιμοποιούνται για παρακολούθηση.',
              linkedCategory: 'necessary',
              cookieTable: cookieTable('necessary'),
            },
            {
              title: 'Στατιστικά (Analytics)',
              description:
                'Το Google Analytics 4 μάς βοηθά να κατανοούμε ανώνυμα πώς χρησιμοποιείται η ' +
                'πλατφόρμα (σελίδες, διάρκεια επίσκεψης, συσκευή). Τα δεδομένα επεξεργάζεται η ' +
                'Google Ireland Ltd. Ενεργοποιούνται μόνο με τη συγκατάθεσή σας.',
              linkedCategory: 'analytics',
              cookieTable: cookieTable('analytics'),
            },
            {
              title: 'Εμπορική προώθηση (Marketing)',
              description:
                'Το Meta Pixel μάς επιτρέπει να μετράμε την αποτελεσματικότητα των ενεργειών μας ' +
                'στο Facebook/Instagram και να εμφανίζουμε σχετικό περιεχόμενο. Τα δεδομένα ' +
                'επεξεργάζεται η Meta Platforms Ireland Ltd. Ενεργοποιούνται μόνο με τη συγκατάθεσή σας.',
              linkedCategory: 'marketing',
              cookieTable: cookieTable('marketing'),
            },
            {
              title: 'Περισσότερες πληροφορίες',
              description:
                'Για οποιαδήποτε απορία σχετικά με τα cookies και τις επιλογές σας, δείτε την ' +
                '<a href="/cookies">Πολιτική Cookies</a>, την <a href="/privacy">Πολιτική Απορρήτου</a> ' +
                'ή <a href="/contact">επικοινωνήστε μαζί μας</a>.',
            },
          ],
        },
      },
    },
  },

  // Callback order in the library: onFirstConsent → onConsent (first decision),
  // or just onConsent (page load with a stored decision). We only mark the
  // "just clicked" case here; the signals + load happen once, in onConsent,
  // strictly in the order: consent update → dataLayer event → gtm.js.
  onFirstConsent: () => {
    justConsented = true;
  },
  onConsent: () => {
    applyConsentToGtag();
    // Just clicked → load right away; stored decision on page load → defer
    // (interaction / 5 s idle) so GTM never competes with hydration.
    loadGtmIfConsented(justConsented);
    justConsented = false;
  },
  // Preferences changed later (footer button) → signal + load if now opted in.
  onChange: () => {
    applyConsentToGtag();
    loadGtmIfConsented(true);
  },
};
