'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import { Building, Home, AlertCircle } from 'lucide-react';

// Form context
import { useFormContext, useWatch } from 'react-hook-form';
import type { CreateServiceInput } from '@/lib/validations/service';

interface OnsiteOnbaseStepProps {
  disabledOptions?: {
    presence?: boolean;
    online?: boolean;
    onsite?: boolean;
    onbase?: boolean;
  };
}

export default function OnsiteOnbaseStep({
  disabledOptions,
}: OnsiteOnbaseStepProps) {
  const form = useFormContext<CreateServiceInput>();
  const { setValue, formState } = form;

  // Use useWatch for reactive form field watching
  const typeValues = useWatch({ name: 'type', control: form.control });

  // Get validation errors
  const typeError = formState.errors?.type?.message;

  // Get current selection
  const selectedLocation = typeValues?.onbase
    ? 'onbase'
    : typeValues?.onsite
      ? 'onsite'
      : null;

  const handleSelection = (locationType: 'onbase' | 'onsite') => {
    // Reset all type flags and set the selected one, preserving presence=true
    setValue(
      'type',
      {
        presence: true, // This step is only for presence services
        online: false,
        onbase: locationType === 'onbase',
        onsite: locationType === 'onsite',
        oneoff: false, // Reset online sub-options
        subscription: false, // Reset online sub-options
      },
      { shouldValidate: true },
    );
  };

  return (
    <>
      <div className='grid md:grid-cols-2 gap-6'>
        {/* Own Space Option */}
        <Card
          className={`p-6 border-2 transition-all duration-200 ${
            disabledOptions?.onbase
              ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
              : `cursor-pointer hover:shadow-md ${
                  selectedLocation === 'onbase'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`
          }`}
          onClick={() => !disabledOptions?.onbase && handleSelection('onbase')}
        >
          <div className='flex flex-col items-center text-center space-y-4'>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                disabledOptions?.onbase
                  ? 'bg-gray-100 text-gray-400'
                  : selectedLocation === 'onbase'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Building className='w-8 h-8' />
            </div>

            <div>
              <h3
                className={`text-lg font-semibold ${
                  disabledOptions?.onbase
                    ? 'text-gray-400'
                    : selectedLocation === 'onbase'
                      ? 'text-green-900'
                      : 'text-gray-900'
                }`}
              >
                Στον χώρο μου
              </h3>
              <p
                className={`text-sm mt-2 ${
                  disabledOptions?.onbase
                    ? 'text-gray-400'
                    : selectedLocation === 'onbase'
                      ? 'text-green-700'
                      : 'text-gray-600'
                }`}
              >
                Ο πελάτης έρχεται στον χώρο σας (γραφείο, κατάστημα κλπ.)
              </p>
            </div>

            {selectedLocation === 'onbase' && !disabledOptions?.onbase && (
              <div className='flex items-center gap-1.5 text-green-600 text-base font-medium'>
                <span>✓</span>
                <span>Επιλεγμένο</span>
              </div>
            )}
          </div>
        </Card>

        {/* Client Space Option */}
        <Card
          className={`p-6 border-2 transition-all duration-200 ${
            disabledOptions?.onsite
              ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
              : `cursor-pointer hover:shadow-md ${
                  selectedLocation === 'onsite'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`
          }`}
          onClick={() => !disabledOptions?.onsite && handleSelection('onsite')}
        >
          <div className='flex flex-col items-center text-center space-y-4'>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                disabledOptions?.onsite
                  ? 'bg-gray-100 text-gray-400'
                  : selectedLocation === 'onsite'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Home className='w-8 h-8' />
            </div>

            <div>
              <h3
                className={`text-lg font-semibold ${
                  disabledOptions?.onsite
                    ? 'text-gray-400'
                    : selectedLocation === 'onsite'
                      ? 'text-green-900'
                      : 'text-gray-900'
                }`}
              >
                Στον χώρο του πελάτη
              </h3>
              <p
                className={`text-sm mt-2 ${
                  disabledOptions?.onsite
                    ? 'text-gray-400'
                    : selectedLocation === 'onsite'
                      ? 'text-green-700'
                      : 'text-gray-600'
                }`}
              >
                Επισκέπτεστε τον πελάτη στον χώρο του
              </p>
            </div>

            {selectedLocation === 'onsite' && !disabledOptions?.onsite && (
              <div className='flex items-center gap-1.5 text-green-600 text-base font-medium'>
                <span>✓</span>
                <span>Επιλεγμένο</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Disabled Options Notices */}
      {(disabledOptions?.onbase || disabledOptions?.onsite) && (
        <div className='mt-4 space-y-2'>
          {disabledOptions?.onbase && (
            <Alert className='border-gray-200 bg-gray-50'>
              <AlertCircle className='h-4 w-4 text-gray-600' />
              <AlertDescription className='text-gray-700'>
                Για να επιλέξετε "Στον χώρο μου" ενεργοποιήστε το από τη
                Διαχείριση Προφίλ (Τρόποι Παροχής).
              </AlertDescription>
            </Alert>
          )}
          {disabledOptions?.onsite && (
            <Alert className='border-gray-200 bg-gray-50'>
              <AlertCircle className='h-4 w-4 text-gray-600' />
              <AlertDescription className='text-gray-700'>
                Για να επιλέξετε "Στον χώρο του πελάτη" ενεργοποιήστε το από τη
                Διαχείριση Προφίλ (Τρόποι Παροχής).
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </>
  );
}
