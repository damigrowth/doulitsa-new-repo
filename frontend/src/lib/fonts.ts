import { Open_Sans } from 'next/font/google';

/**
 * Open Sans is the single brand typeface for the entire website.
 *
 * It is loaded as a variable font (a single optimized file covers every weight
 * from 300 to 800), self-hosted by Next.js at build time. This avoids any
 * runtime request to Google's servers, enables automatic preloading and uses a
 * size-adjusted fallback to prevent layout shift (CLS).
 *
 * The `greek` subset is required because the site content is in Greek.
 */
export const openSans = Open_Sans({
  subsets: ['latin', 'greek'],
  display: 'swap',
  variable: '--font-open-sans',
  // Variable axis: ships every weight (300–800) in one file.
  weight: 'variable',
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'sans-serif',
  ],
  adjustFontFallback: true,
});
