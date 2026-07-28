'use client';

import React, { JSX } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import FormButton from '@/components/shared/button-form';
import { Card } from '@/components/ui/card';
import { User, Briefcase } from 'lucide-react';

export default function AuthTypeOptions(): JSX.Element | null {
  const { type, setAuthType } = useAuthStore();

  if (type !== '') {
    return (
      <>
        {/* Previous Step Button - positioned first */}
        <FormButton
          text='Προηγούμενο Βήμα'
          onClick={() => setAuthType('')}
          variant='outline'
          icon='arrow-left'
          iconPosition='left'
          className='mb-6 hover:bg-primary hover:text-white hover:border-primary'
        />
      </>
    );
  } else if (type === '') {
    return (
      <>
        <h5 className='pb-3 text-primary text-center'>Εγγραφή ως</h5>
        <div className='grid md:grid-cols-2 gap-6 mb-2'>
          {/* Simple Profile Option */}
          <Card
            className={`p-6 border-2 transition-all duration-200 cursor-pointer hover:shadow-md border-gray-200 hover:border-secondary`}
            onClick={() => setAuthType('user')}
          >
            <div className='flex flex-col items-center text-center space-y-4'>
              <div className='w-16 h-16 rounded-full flex items-center justify-center bg-primary/10 text-primary'>
                <User className='w-8 h-8' />
              </div>

              <div>
                <h5 className='font-semibold text-primary'>
                  Απλός
                  <br />
                  Λογαριασμός
                </h5>
                <p className='text-sm mt-2 text-gray-600'>
                  Ανακάλυψε υπηρεσίες
                  <br />
                  και επικοινώνησε άμεσα
                  <br />
                  με τους επαγγελματίες
                </p>
              </div>
            </div>
          </Card>
          {/* Professional Profile Option */}
          <Card
            className={`p-6 border-2 transition-all duration-200 cursor-pointer hover:shadow-md border-gray-200 hover:border-secondary`}
            onClick={() => setAuthType('pro')}
          >
            <div className='flex flex-col items-center text-center space-y-4'>
              <div className='w-16 h-16 rounded-full flex items-center justify-center bg-primary/10 text-primary'>
                <Briefcase className='w-8 h-8' />
              </div>

              <div>
                <h5 className='font-semibold text-primary'>
                  Επαγγελματικός
                  <br />
                  Λογαριασμός
                </h5>
                <p className='text-sm mt-2 text-gray-600'>
                  Παρουσίασε τις
                  <br />
                  υπηρεσίες που προσφέρεις
                  <br />
                  και βρες νέους πελάτες
                </p>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return null;
}
