'use client';

/**
 * "Ρυθμίσεις cookies" — re-opens the preferences modal so visitors can change
 * or withdraw consent at any time (a legal requirement). Used in the footer
 * and on the /cookies page.
 */

import { openCookiePreferences } from '@/lib/analytics/consent';

interface CookieSettingsButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function CookieSettingsButton({
  className = 'text-gray-400 font-heading hover:text-white transition-colors',
  children = 'Ρυθμίσεις cookies',
}: CookieSettingsButtonProps) {
  return (
    <button type='button' onClick={openCookiePreferences} className={className}>
      {children}
    </button>
  );
}
