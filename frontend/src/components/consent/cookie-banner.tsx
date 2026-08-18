'use client';

/**
 * First layer — replica of the previous CookieFirst banner:
 * bottom-right white box (max 500px), title «Αποδοχή Cookies», the same
 * description, and two buttons side by side: «Αποδοχή Όλων» (green) and
 * «Προσαρμογή» (outlined, opens the settings dialog).
 */

import { acceptAllCookies, openCookiePreferences } from '@/lib/analytics/consent';

export default function CookieBanner() {
  return (
    <div
      role='dialog'
      aria-modal='false'
      aria-labelledby='dl-cookie-banner-title'
      className='fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[500px] max-w-[calc(100vw-2rem)] z-[2147483000] rounded-lg bg-white p-[15px] shadow-[0_2px_16px_rgba(0,0,0,0.18)] font-sans text-black'
    >
      <h2 id='dl-cookie-banner-title' className='text-[13.8px] font-bold leading-[1.3] pb-2'>
        Αποδοχή Cookies
      </h2>
      <p className='text-[12px] leading-[1.4] mb-4'>
        Χρησιμοποιούμε cookies για να σου προσφέρουμε μια καλύτερη προσωποποιημένη εμπειρία
        και να σε βοηθήσουμε να βρεις εύκολα αυτό που ψάχνεις. Για περισσότερες πληροφορίες
        σχετικά με τα cookies, ανοίξτε τις ρυθμίσεις.
      </p>
      <div className='flex gap-[10px]'>
        <button
          type='button'
          onClick={acceptAllCookies}
          className='flex-1 h-[31px] rounded-[3px] bg-[#109e79] text-white text-[12px] hover:bg-[#0d8867] transition-colors'
        >
          Αποδοχή Όλων
        </button>
        <button
          type='button'
          onClick={openCookiePreferences}
          className='flex-1 h-[31px] rounded-[3px] border border-[#cfcfcf] bg-white text-[#6b6b6b] text-[12px] hover:bg-gray-50 transition-colors'
        >
          Προσαρμογή
        </button>
      </div>
    </div>
  );
}
