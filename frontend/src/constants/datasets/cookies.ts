/**
 * Cookie declaration — single source of truth for the consent UI (banner
 * "Cookies" tab) and the /cookies page.
 *
 * Structure, category names and category descriptions replicate the previous
 * CookieFirst configuration of doulitsa.gr 1:1 (Απαραίτητα / Απόδοση /
 * Λειτουργικά / Marketing, and the per-cookie fields Όνομα τομέα, Λήξη,
 * Τύπος, Προμηθευτής + description). Only the cookie rows differ: CookieFirst's
 * own cookies are replaced by the equivalent first-party ones of this app,
 * and the GA4 / Meta Pixel cookies set through Google Tag Manager are listed.
 *
 * When a cookie/vendor is added or removed: edit this file, update
 * COOKIE_LIST_UPDATED_AT and bump CONSENT_REVISION (lib/analytics/consent.ts)
 * so returning visitors are asked again.
 */

export type CookieCategory = 'necessary' | 'performance' | 'functional' | 'marketing';

export const CATEGORY_ORDER: CookieCategory[] = ['necessary', 'performance', 'functional', 'marketing'];

/** Category labels — exactly as in the previous banner. */
export const CATEGORY_LABELS: Record<CookieCategory, string> = {
  necessary: 'Απαραίτητα',
  performance: 'Απόδοση',
  functional: 'Λειτουργικά',
  marketing: 'Marketing',
};

/** Category descriptions shown in the settings tab — exactly as before. */
export const CATEGORY_DESCRIPTIONS: Record<CookieCategory, string[]> = {
  necessary: [
    'Αυτά τα cookies απαιτούνται για την καλή λειτουργία της ιστοσελίδας μας και δεν μπορούν να απενεργοποιηθούν.',
  ],
  performance: [
    'Χρησιμοποιούμε αυτά τα cookies για να παρέχουμε στατιστικές πληροφορίες σχετικά με τον ιστότοπό μας - χρησιμοποιούνται για μέτρηση και βελτίωση της απόδοσης.',
  ],
  functional: [
    'Χρησιμοποιούμε αυτά τα cookies για να βελτιώσουμε τη λειτουργικότητα και να επιτρέψουμε την εξατομίκευση, όπως live chats, βίντεο και τη χρήση των κοινωνικών μέσων.',
  ],
  marketing: [
    'Αυτά τα cookies τοποθετούνται μέσω του ιστότοπού μας από τους διαφημιστικούς μας συνεργάτες.',
    'Τα δεδομένα συλλέγονται με σκοπό την εξατομίκευση της διαφήμισης και τη μέτρηση της αποτελεσματικότητας των διαφημιστικών εκστρατειών. Τα δεδομένα ενδέχεται να κοινοποιούνται στην Google LLC, περισσότερες πληροφορίες μπορείτε να βρείτε <a href="https://business.safety.google/privacy/" target="_blank" rel="noopener noreferrer">εδώ</a>.',
  ],
};

export type CookieStorageType = 'Cookie' | 'Local storage';

export interface CookieInfo {
  /** Cookie name as it appears in the browser (trailing * = prefix). */
  name: string;
  /** Όνομα τομέα */
  domain: string;
  /** Λήξη (Greek, as displayed) */
  expiry: string;
  /** Τύπος */
  type: CookieStorageType;
  /** Προμηθευτής */
  vendor: string;
  /** Description shown under the fields (Greek). */
  description: string;
  category: CookieCategory;
}

/** Shown as "ΕΠΙΚΑΙΡΟΠΟΙΗΜΕΝΟ" on the Cookies tab and the /cookies page. */
export const COOKIE_LIST_UPDATED_AT = '18/8/2026';
/** Shown as "ΕΠΙΚΑΙΡΟΠΟΙΗΜΕΝΟ" on the Πολιτική cookies tab and the /cookies page. */
export const COOKIE_POLICY_UPDATED_AT = '18/8/2026';

const DOMAIN = 'doulitsa.gr';
const OWN = 'Doulitsa';
const GOOGLE = 'Google Analytics';
const META = 'Meta Platforms';

export const COOKIE_INVENTORY: CookieInfo[] = [
  // ---- Απαραίτητα ---------------------------------------------------------
  {
    name: 'dl_consent',
    domain: DOMAIN,
    expiry: '6 μήνες',
    type: 'Cookie',
    vendor: OWN,
    description:
      'Αυτό το cookie αποθηκεύει τις προτιμήσεις cookie σας για αυτόν τον ιστότοπο. Μπορείτε να τα αλλάξετε ή να αποσύρετε τη συγκατάθεσή σας εύκολα.',
    category: 'necessary',
  },
  {
    name: 'dj_access',
    domain: DOMAIN,
    expiry: '15 λεπτά',
    type: 'Cookie',
    vendor: OWN,
    description:
      'Αυτό το cookie διατηρεί τη σύνδεσή σας στον λογαριασμό σας (διακριτικό πρόσβασης). Πρέπει να ελέγξουμε αν είστε συνδεδεμένοι.',
    category: 'necessary',
  },
  {
    name: 'dj_refresh',
    domain: DOMAIN,
    expiry: '3 ημέρες',
    type: 'Cookie',
    vendor: OWN,
    description:
      'Αυτό το cookie ανανεώνει αυτόματα τη σύνδεσή σας ώστε να μη χρειάζεται να εισάγετε ξανά τον κωδικό σας.',
    category: 'necessary',
  },
  {
    name: 'g_oauth_state',
    domain: DOMAIN,
    expiry: '10 λεπτά',
    type: 'Cookie',
    vendor: OWN,
    description:
      'Αυτό το cookie προστατεύει τη διαδικασία σύνδεσης μέσω Google από κακόβουλες ενέργειες (CSRF).',
    category: 'necessary',
  },
  {
    name: 'g_oauth_next',
    domain: DOMAIN,
    expiry: '10 λεπτά',
    type: 'Cookie',
    vendor: OWN,
    description:
      'Αυτό το cookie θυμάται τη σελίδα στην οποία θα επιστρέψετε μετά τη σύνδεση μέσω Google.',
    category: 'necessary',
  },
  {
    name: 'oauth_intent',
    domain: DOMAIN,
    expiry: '10 λεπτά',
    type: 'Cookie',
    vendor: OWN,
    description:
      'Αυτό το cookie θυμάται τον τύπο λογαριασμού που επιλέξατε πριν τη σύνδεση μέσω Google.',
    category: 'necessary',
  },
  {
    name: 'sidebar_state',
    domain: DOMAIN,
    expiry: '7 ημέρες',
    type: 'Cookie',
    vendor: OWN,
    description:
      'Αυτό το cookie αποθηκεύει την προτίμησή σας για την εμφάνιση του πλευρικού μενού στον πίνακα ελέγχου.',
    category: 'necessary',
  },

  // ---- Απόδοση ------------------------------------------------------------
  {
    name: '_ga',
    domain: DOMAIN,
    expiry: '2 χρόνια',
    type: 'Cookie',
    vendor: GOOGLE,
    description:
      'Αυτό το cookie καταχωρεί ένα μοναδικό αναγνωριστικό που χρησιμοποιείται για τη δημιουργία στατιστικών δεδομένων σχετικά με τον τρόπο που ο επισκέπτης χρησιμοποιεί τον ιστότοπο.',
    category: 'performance',
  },
  {
    name: '_ga_*',
    domain: DOMAIN,
    expiry: '2 χρόνια',
    type: 'Cookie',
    vendor: GOOGLE,
    description:
      'Αυτό το cookie χρησιμοποιείται από το Google Analytics για τη διατήρηση της κατάστασης της συνεδρίας.',
    category: 'performance',
  },

  // ---- Λειτουργικά --------------------------------------------------------
  // (no functional cookies are set at the moment)

  // ---- Marketing ----------------------------------------------------------
  {
    name: '_fbp',
    domain: DOMAIN,
    expiry: '3 μήνες',
    type: 'Cookie',
    vendor: META,
    description:
      'Αυτό το cookie χρησιμοποιείται από το Facebook για την παροχή μιας σειράς διαφημιστικών προϊόντων, όπως προσφορές σε πραγματικό χρόνο από τρίτους διαφημιστές.',
    category: 'marketing',
  },
  {
    name: 'fr',
    domain: '.facebook.com',
    expiry: '3 μήνες',
    type: 'Cookie',
    vendor: META,
    description:
      'Αυτό το cookie χρησιμοποιείται από το Facebook για την παροχή στοχευμένων διαφημίσεων και τη μέτρηση της αποτελεσματικότητάς τους.',
    category: 'marketing',
  },
];

export function cookiesInCategory(category: CookieCategory): CookieInfo[] {
  return COOKIE_INVENTORY.filter((c) => c.category === category);
}
