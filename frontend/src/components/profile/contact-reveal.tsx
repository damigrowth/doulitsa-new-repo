'use client';

import React, { useState } from 'react';

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

  // Track contact reveals with analytics
  const handleReveal = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'reveal_contact', {
        event_category: 'Contact',
        event_label: type,
        value: 1,
      });
    }
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