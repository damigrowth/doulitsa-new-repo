'use client';

import React from 'react';
import { useWatch } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import { MapPin, Globe, AlertCircle } from 'lucide-react';

// Form context
import { useFormContext } from 'react-hook-form';
import type { CreateServiceInput } from '@/lib/validations/service';

interface PresenceOnlineStepProps {
  disabledOptions?: {
    presence?: boolean;
    online?: boolean;
    onsite?: boolean;
    onbase?: boolean;
  };
}

export default function PresenceOnlineStep({
  disabledOptions,
}: PresenceOnlineStepProps) {
  const form = useFormContext<CreateServiceInput>();
  const { setValue, formState } = form;

  // Use useWatch for reactive form field watching
  const presenceValue = useWatch({
    name: 'type.presence',
    control: form.control,
  });
  const onlineValue = useWatch({ name: 'type.online', control: form.control });

  // Get current selection
  const selectedType = presenceValue
    ? 'presence'
    : onlineValue
      ? 'online'
      : null;

  // Get validation errors for this step
  const typeError = formState.errors?.type?.message;

  const handleSelection = (type: 'presence' | 'online') => {
    setValue(
      'type',
      {
        presence: type === 'presence',
        online: type === 'online',
        oneoff: false,
        onbase: false,
        subscription: false,
        onsite: false,
      },
      { shouldValidate: true },
    );
  };

  return (
    <>
      <div className='grid md:grid-cols-2 gap-6'>
        {/* Physical Presence Option */}
        <Card
          className={`p-6 border-2 transition-all duration-200 ${
            disabledOptions?.presence
              ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
              : `cursor-pointer hover:shadow-md ${
                  selectedType === 'presence'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`
          }`}
          onClick={() =>
            !disabledOptions?.presence && handleSelection('presence')
          }
        >
          <div className='flex flex-col items-center text-center space-y-4'>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                disabledOptions?.presence
                  ? 'bg-gray-100 text-gray-400'
                  : selectedType === 'presence'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              <MapPin className='w-8 h-8' />
            </div>

            <div>
              <h3
                className={`text-lg font-semibold ${
                  disabledOptions?.presence
                    ? 'text-gray-400'
                    : selectedType === 'presence'
                      ? 'text-green-900'
                      : 'text-gray-900'
                }`}
              >
                Φυσική παρουσία
              </h3>
              <p
                className={`text-sm mt-2 ${
                  disabledOptions?.presence
                    ? 'text-gray-400'
                    : selectedType === 'presence'
                      ? 'text-green-700'
                      : 'text-gray-600'
                }`}
              >
                Η υπηρεσία παρέχεται με φυσική παρουσία <br></br> (π.χ. στον
                χώρο σας ή στον χώρο του πελάτη)
              </p>
            </div>

            {selectedType === 'presence' && !disabledOptions?.presence && (
              <div className='flex items-center gap-1.5 text-green-600 text-base font-medium'>
                <span>✓</span>
                <span>Επιλεγμένο</span>
              </div>
            )}
          </div>
        </Card>

        {/* Online Service Option */}
        <Card
          className={`p-6 border-2 transition-all duration-200 ${
            disabledOptions?.online
              ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
              : `cursor-pointer hover:shadow-md ${
                  selectedType === 'online'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`
          }`}
          onClick={() => !disabledOptions?.online && handleSelection('online')}
        >
          <div className='flex flex-col items-center text-center space-y-4'>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                disabledOptions?.online
                  ? 'bg-gray-100 text-gray-400'
                  : selectedType === 'online'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Globe className='w-8 h-8' />
            </div>

            <div>
              <h3
                className={`text-lg font-semibold ${
                  disabledOptions?.online
                    ? 'text-gray-400'
                    : selectedType === 'online'
                      ? 'text-green-900'
                      : 'text-gray-900'
                }`}
              >
                Online/Απομακρυσμένα
              </h3>
              <p
                className={`text-sm mt-2 ${
                  disabledOptions?.online
                    ? 'text-gray-400'
                    : selectedType === 'online'
                      ? 'text-green-700'
                      : 'text-gray-600'
                }`}
              >
                Η υπηρεσία παρέχεται εξ αποστάσεως
              </p>
            </div>

            {selectedType === 'online' && !disabledOptions?.online && (
              <div className='flex items-center gap-1.5 text-green-600 text-base font-medium'>
                <span>✓</span>
                <span>Επιλεγμένο</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Disabled Options Notices */}
      {(disabledOptions?.presence || disabledOptions?.online) && (
        <div className='mt-4 space-y-2'>
          {disabledOptions?.presence && (
            <Alert className='border-gray-200 bg-gray-50'>
              <AlertCircle className='h-4 w-4 text-gray-600' />
              <AlertDescription className='text-gray-700'>
                Για να επιλέξετε "Φυσική παρουσία" ενεργοποιήστε το από τη
                Διαχείριση Προφίλ (Τρόποι Παροχής).
              </AlertDescription>
            </Alert>
          )}
          {disabledOptions?.online && (
            <Alert className='border-gray-200 bg-gray-50'>
              <AlertCircle className='h-4 w-4 text-gray-600' />
              <AlertDescription className='text-gray-700'>
                Για να επιλέξετε "Online" ενεργοποιήστε το από τη Διαχείριση
                Προφίλ (Τρόποι Παροχής).
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </>
  );
}
