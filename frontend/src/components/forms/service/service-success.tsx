'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Plus, Settings } from 'lucide-react';
import { NextLink } from '@/components';

interface ServiceSuccessProps {
  id: string | number;
  title: string;
  onReset?: () => void;
}

export default function ServiceSuccess({
  id,
  title,
  onReset,
}: ServiceSuccessProps) {
  const handleAddServiceReload = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (onReset) {
      onReset();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className='space-y-6 py-10'>
      {/* Success Icon and Badges */}
      <div className='text-center space-y-4 pt-6'>
        <div className='mx-auto w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg'>
          <Check className='w-6 h-6 text-white' />
        </div>

        {/* Service ID and Status Badges */}
        <div className='flex items-center justify-center gap-2'>
          <Badge
            variant='outline'
            className='bg-white border-green-300 text-green-700'
          >
            ID: #{id}
          </Badge>
          <Badge
            variant='secondary'
            className='bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200 hover:border-yellow-400 transition-colors cursor-default'
          >
            Υπό Έλεγχο
          </Badge>
        </div>
      </div>

      {/* Service Details */}
      <div className='text-center space-y-4'>
        <p className='text-gray-700'>
          Ευχαριστούμε για την δημιουργία υπηρεσίας{' '}
          <strong className='text-green-800'>"{title}"</strong>. Σύντομα θα
          γίνει η δημοσίευση της αφού ολοκληρωθεί η διαδικασία ελέγχου της.
        </p>
      </div>

      {/* Action Buttons */}
      <div className='flex flex-col sm:flex-row gap-3 justify-center items-center'>
        <Button
          type='button'
          onClick={handleAddServiceReload}
          size='lg'
          className='bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6'
        >
          <Plus className='w-4 h-4' />
          Προσθήκη Νέας Υπηρεσίας
        </Button>

        <Button
          asChild
          variant='outline'
          size='lg'
          className='border-gray-300 text-gray-700 hover:bg-gray-50 px-6'
        >
          <NextLink
            href='/dashboard/services'
            className='flex items-center gap-2'
          >
            <Settings className='w-4 h-4' />
            Διαχείριση Υπηρεσιών
          </NextLink>
        </Button>
      </div>
    </div>
  );
}
