// Import global styles
import '../styles/critical.css';
import '../styles/globals.css';
import '@fortawesome/fontawesome-svg-core/styles.css';

import type { Metadata } from 'next';
import { NotFoundPage } from '@/components/shared/not-found-page';
import { Footer, Header } from '@/components/shared/layout';
import { getNavigationMenuData } from '@/actions/services/get-categories';

export const metadata: Metadata = {
  title: '404 - Η σελίδα δεν βρέθηκε | Doulitsa',
  description: 'Η σελίδα που αναζητάτε δεν υπάρχει ή έχει αφαιρεθεί.',
};

export default async function GlobalNotFound() {
  // Fetch navigation data for header
  const navDataResult = await getNavigationMenuData();
  const navigationData = navDataResult.success ? navDataResult.data : [];

  return (
    <html lang='el'>
      <body>
        <Header navigationData={navigationData} />
        <main>
          <NotFoundPage
            title='Ουπς! Η σελίδα δεν βρέθηκε'
            description='Η σελίδα που αναζητάτε δεν υπάρχει ή έχει αφαιρεθεί. Ελέγξτε τη διεύθυνση URL ή επιστρέψτε στην αρχική σελίδα.'
            primaryButtonText='Αρχική Σελίδα'
            primaryButtonHref='/'
            showBackButton={false}
          />
        </main>
        <Footer />
      </body>
    </html>
  );
}
