/**
 * Cookie inventory — the single source of truth for every cookie the site
 * sets or allows, used by BOTH the consent banner's per-category tables
 * (lib/analytics/cookie-consent-config.ts) and the /cookies policy page.
 *
 * Add a row here whenever a new cookie/vendor is introduced, then bump
 * CONSENT_REVISION in lib/analytics/consent.ts so returning visitors are
 * asked again (Greek DPA: consent must be re-obtained when the policy
 * changes).
 *
 * The third-party rows describe what the GA4 / Meta Pixel tags inside our
 * Google Tag Manager container set — confirm against the live container
 * whenever tags are added or removed there.
 */

export type CookieCategory = 'necessary' | 'analytics' | 'marketing';

export interface CookieInfo {
  /** Cookie name as it appears in the browser (a trailing * = prefix). */
  name: string;
  /** Who sets it / controls the data. */
  provider: string;
  /** Plain-language purpose (Greek — shown to visitors). */
  purpose: string;
  /** Lifetime (Greek — shown to visitors). */
  expiry: string;
  category: CookieCategory;
}

export const CATEGORY_LABELS: Record<CookieCategory, string> = {
  necessary: 'Απολύτως απαραίτητα',
  analytics: 'Στατιστικά',
  marketing: 'Εμπορική προώθηση',
};

const FIRST_PARTY = 'doulitsa.gr';
const GOOGLE = 'Google Analytics 4 (Google Ireland Ltd.)';
const META = 'Meta Pixel (Meta Platforms Ireland Ltd.)';

export const COOKIE_INVENTORY: CookieInfo[] = [
  // --- Strictly necessary (no consent required, cannot be disabled) --------
  {
    name: 'dj_access',
    provider: FIRST_PARTY,
    purpose: 'Διακριτικό σύνδεσης στον λογαριασμό σας (JWT access, httpOnly).',
    expiry: '15 λεπτά',
    category: 'necessary',
  },
  {
    name: 'dj_refresh',
    provider: FIRST_PARTY,
    purpose: 'Ανανέωση της σύνδεσής σας χωρίς νέα εισαγωγή κωδικού (JWT refresh, httpOnly).',
    expiry: '3 ημέρες',
    category: 'necessary',
  },
  {
    name: 'g_oauth_state',
    provider: FIRST_PARTY,
    purpose: 'Προστασία από επιθέσεις CSRF κατά τη σύνδεση μέσω Google.',
    expiry: '10 λεπτά',
    category: 'necessary',
  },
  {
    name: 'g_oauth_next',
    provider: FIRST_PARTY,
    purpose: 'Σελίδα επιστροφής μετά τη σύνδεση μέσω Google.',
    expiry: '10 λεπτά',
    category: 'necessary',
  },
  {
    name: 'oauth_intent',
    provider: FIRST_PARTY,
    purpose: 'Ο τύπος λογαριασμού που επιλέξατε πριν τη σύνδεση μέσω Google.',
    expiry: '10 λεπτά',
    category: 'necessary',
  },
  {
    name: 'sidebar_state',
    provider: FIRST_PARTY,
    purpose: 'Προτίμηση εμφάνισης του πλευρικού μενού στον πίνακα ελέγχου.',
    expiry: '7 ημέρες',
    category: 'necessary',
  },
  {
    name: 'dl_consent',
    provider: FIRST_PARTY,
    purpose: 'Αποθηκεύει τις επιλογές σας για τα cookies, ώστε να μη σας ρωτάμε σε κάθε επίσκεψη.',
    expiry: '6 μήνες',
    category: 'necessary',
  },

  // --- Analytics (consent required) ---------------------------------------
  {
    name: '_ga',
    provider: GOOGLE,
    purpose: 'Διάκριση μοναδικών επισκεπτών για ανώνυμα στατιστικά χρήσης.',
    expiry: '2 έτη',
    category: 'analytics',
  },
  {
    name: '_ga_*',
    provider: GOOGLE,
    purpose: 'Διατήρηση της κατάστασης συνεδρίας για τα στατιστικά.',
    expiry: '2 έτη',
    category: 'analytics',
  },

  // --- Marketing (consent required) ---------------------------------------
  {
    name: '_fbp',
    provider: META,
    purpose: 'Μέτρηση της αποτελεσματικότητας των ενεργειών μας στο Facebook/Instagram.',
    expiry: '3 μήνες',
    category: 'marketing',
  },
  {
    name: 'fr',
    provider: META,
    purpose: 'Εμφάνιση σχετικού περιεχομένου/διαφημίσεων στις πλατφόρμες της Meta.',
    expiry: '3 μήνες',
    category: 'marketing',
  },
];

export function cookiesInCategory(category: CookieCategory): CookieInfo[] {
  return COOKIE_INVENTORY.filter((c) => c.category === category);
}
