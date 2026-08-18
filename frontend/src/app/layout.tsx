import '../styles/critical.css';
import '../styles/globals.css';

import { Metadata } from 'next';

// import 'react-tooltip/dist/react-tooltip.css';
// import 'react-loading-skeleton/dist/skeleton.css';
import {
  BottomToTop_D,
  // NavMenuMobileWrapper_D,
} from '@/components/dynamic';
import { FooterWrapper } from '@/components/shared/layout';
import { Body, Notifications } from '@/components/shared/layout/wrapper';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SavedStateProvider } from '@/lib/providers/saved-state-provider';
import NavigationSkeletonOverlay from '@/components/shared/navigation-skeleton-overlay';
import { openSans } from '@/lib/fonts';
import ConsentDefaultsScript from '@/components/consent/consent-defaults-script';
import CookieConsentRoot from '@/components/consent/cookie-consent';

export const metadata: Metadata = {
  title: {
    default: 'Doulitsa - Βρες Επαγγελματίες και Υπηρεσίες για Κάθε Ανάγκη',
    template: '%s | Doulitsa',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16-v1.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32-v1.png', type: 'image/png', sizes: '32x32' },
      // Google prefers a square favicon whose size is a multiple of 48px.
      { url: '/favicon-48x48-v1.png', type: 'image/png', sizes: '48x48' },
      { url: '/favicon-96x96-v1.png', type: 'image/png', sizes: '96x96' },
      { url: '/android-chrome-192x192-v1.png', type: 'image/png', sizes: '192x192' },
      { url: '/android-chrome-512x512-v1.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon-v1.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang='el' className={openSans.variable} suppressHydrationWarning>
      <head>
        {/* Google Consent Mode v2 defaults (all denied) — must precede any tag */}
        <ConsentDefaultsScript />
        {/* Resource hints for Cloudinary image optimization */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <Body>
        <SavedStateProvider>
        <TooltipProvider delayDuration={0}>
            {/* Global navigation skeleton overlay */}
            <NavigationSkeletonOverlay />
            <main>
              <Notifications>{children}</Notifications>
            </main>
            {/* Footer is shown globally except for dashboard and admin */}
            <FooterWrapper />
            <BottomToTop_D />

            {/*
              Cookie consent (banner + settings dialog, replica of the previous
              CookieFirst UI; vanilla-cookieconsent as headless engine). Google
              Tag Manager (GA4 + Meta Pixel) is loaded ONLY after the visitor
              accepts Απόδοση or Marketing — see lib/analytics/consent.ts and
              docs/COOKIE-CONSENT.md.
            */}
            <CookieConsentRoot />
            {/* Cloudinary Upload Widget */}
            {/* <Script
            src='https://upload-widget.cloudinary.com/global/all.js'
            strategy='beforeInteractive'
          /> */}
          </TooltipProvider>
        </SavedStateProvider>
      </Body>
    </html>
  );
}
