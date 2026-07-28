import '../styles/critical.css';
import '../styles/globals.css';

import Script from 'next/script';
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
        {/* Resource hints for Cloudinary image optimization */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <Body>
        {/* CookieFirst loads via Google Tag Manager - no React wrapper needed */}
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

            {/* Google Tag Manager - User-interaction based loading for TBT optimization */}
            {/* Only loads after first user interaction (scroll, click, touch) or after 5s idle */}
            {/* GA4 & Meta Pixel are configured inside GTM (governed by CookieFirst Consent Mode). */}
            {/* Do NOT load gtag.js / GA directly here — it would bypass consent. */}
            <Script
              id='gtm-loader'
              strategy='afterInteractive'
              dangerouslySetInnerHTML={{
                __html: `
                (function() {
                  let loaded = false;

                  function loadGTM() {
                    if (loaded) return;
                    loaded = true;

                    // Load GTM
                    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer','GTM-KR7N94L4');
                  }

                  // Load on first user interaction
                  const events = ['scroll', 'click', 'touchstart', 'mousemove', 'keydown'];
                  const loadOnce = function() {
                    loadGTM();
                    events.forEach(e => window.removeEventListener(e, loadOnce));
                  };
                  events.forEach(e => window.addEventListener(e, loadOnce, { passive: true, once: true }));

                  // Fallback: Load after 5 seconds if no interaction
                  setTimeout(loadGTM, 5000);
                })();
              `,
              }}
            />
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
