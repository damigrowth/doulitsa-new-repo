'use client';

import { useAuthStore } from '@/lib/stores/authStore';
import React from 'react';

export default function RegisterHeading() {
  const type = useAuthStore((state) => state.type);

  // Don't render anything when no type is selected (per client request)
  if (type === '') {
    return null;
  }

  return (
    <div className='mb-4'>
      {type === 'user' && <h4>Δημιουργία λογαριασμού νέου χρήστη!</h4>}
      {type === 'pro' && (
        <h4>
          Δημιούργησε έναν επαγγελματικό λογαριασμό για να προσφέρεις τις
          υπηρεσίες σου!
        </h4>
      )}
    </div>
  );
}
