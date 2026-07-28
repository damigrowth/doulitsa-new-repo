'use client';

// Import global styles
import '../styles/critical.css';
import '../styles/globals.css';
import '@fortawesome/fontawesome-svg-core/styles.css';

import { ErrorPage } from '@/components/shared/error-page';
import { Footer, Header } from '@/components/shared/layout';

// Error boundaries must be Client Components
// global-error must include html and body tags

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang='el'>
      <body>
        <Header navigationData={[]} />
        <main>
          <ErrorPage
            error={error}
            reset={reset}
            title='Ουπς! Κάτι πήγε πολύ στραβά'
            description='Παρουσιάστηκε ένα κρίσιμο σφάλμα στην εφαρμογή. Παρακαλούμε δοκιμάστε ξανά ή επικοινωνήστε με την υποστήριξη αν το πρόβλημα επιμένει.'
            errorCode='500'
            showResetButton={true}
          />
        </main>
        <Footer />
      </body>
    </html>
  );
}
