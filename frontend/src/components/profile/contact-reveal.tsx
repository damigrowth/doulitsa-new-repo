'use client';

import React, { useState } from 'react';
import { trackEvent } from '@/lib/analytics/consent';

interface ContactRevealProps {
  /** Contact type (phone or email) */
  type: 'phone' | 'email';
  /** The contact value to reveal */
  value: string;
  /** Initial visibility state */
  initialVisible?: boolean;
  /** Custom reveal button text */
  revealText?: string;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Client-side component for revealing contact information
 * Handles analytics tracking and state management for contact reveals
 */
export default function ContactReveal({
  type,
  value,
  initialVisible = false,
  revealText = 'Προβολή',
  className = '',
}: ContactRevealProps) {
  const [isVisible, setIsVisible] = useState(initialVisible);

  // Track contact reveals: pushed to the GTM dataLayer; the GA4 event tag in
  // GTM only fires when analytics consent was granted (and GTM is only loaded
  // after an opt-in), so no consent logic is needed here.
  const handleReveal = () => {
    trackEvent('reveal_contact', { contact_type: type });
    setIsVisible(true);
  };

  if (isVisible) {
    if (type === 'phone') {
      return (
        <a
          href={`tel:${value}`}
          className={`text-sm font-medium text-primary hover:underline ${className}`}
        >
          {value}
        </a>
      );
    } else {
      return (
        <a
          href={`mailto:${value}`}
          className={`text-sm font-medium text-primary hover:underline ${className}`}
          title={value}
        >
          {value}
        </a>
      );
    }
  }

  return (
    <button
      type='button'
      onClick={handleReveal}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline ${className}`}
    >
      {revealText}
    </button>
  );
}