import React from 'react';
import CookieList from '@/components/consent/cookie-list';
import CookiePolicyContent from '@/components/consent/cookie-policy-content';
import CookieSettingsButton from '@/components/consent/cookie-settings-button';
import { getCookiesMetadata } from '@/lib/seo/pages';

export async function generateMetadata() {
  return getCookiesMetadata();
}

/*
 * Πολιτική Cookies — same page chrome as the other legal pages (terms /
 * privacy). The content is the previous banner's "Πολιτική cookies" text
 * (verbatim, CookiePolicyContent) followed by the cookie declaration in the
 * previous "Cookies" tab format (CookieList), plus the way to reopen the
 * settings dialog.
 */
export default function CookiePolicyPage() {
  return (
    <div className='mt-16 lg:mt-20 flex flex-col w-full overflow-hidden'>
      <section className='container mx-auto max-w-2xl py-12 px-5'>
        <h1 className='text-2xl font-bold'>Πολιτική Cookies</h1>
        <div className='pb-10 space-y-4'>
          <div className='pt-4'>
            <CookiePolicyContent variant='page' />
          </div>

          <p className='pt-4 text-dark text-lg font-semibold'>Cookies</p>
          <CookieList variant='page' />

          <p className='pt-4 text-dark text-lg font-semibold'>Ρυθμίσεις cookies</p>
          <p>
            Μπορείτε να αλλάξετε τις επιλογές σας ή να αποσύρετε τη συγκατάθεσή σας ανά πάσα
            στιγμή από τον σύνδεσμο «Ρυθμίσεις cookies» στο υποσέλιδο κάθε σελίδας ή{' '}
            <CookieSettingsButton className='text-primary underline'>εδώ</CookieSettingsButton>.
          </p>
        </div>
      </section>
    </div>
  );
}
