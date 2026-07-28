'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import { Clock, Repeat, AlertCircle } from 'lucide-react';

// Form context
import { useFormContext, useWatch } from 'react-hook-form';
import type { CreateServiceInput } from '@/lib/validations/service';

// Dataset utilities
import { subscriptionTypeOptions } from '@/constants/datasets/options';

export default function OneoffSubscriptionStep() {
  const form = useFormContext<CreateServiceInput>();
  const { setValue, formState } = form;

  // Use useWatch for reactive form field watching
  const typeValues = useWatch({ name: 'type', control: form.control });
  const subscriptionValue = useWatch({
    name: 'subscriptionType',
    control: form.control,
  });
  // Get validation errors
  const typeError = formState.errors?.type?.message;
  const subscriptionError = formState.errors?.subscriptionType?.message;

  const handleOneoffSelection = () => {
    // Update type for one-off selection
    setValue(
      'type',
      {
        ...typeValues,
        oneoff: true,
        subscription: false,
        onbase: false,
        onsite: false,
      },
      { shouldValidate: true },
    );
    // Clear subscription period when selecting one-off
    setValue('subscriptionType', undefined, { shouldValidate: true });
  };

  const handleSubscriptionSelection = (subscription: string) => {
    // Update type for subscription selection
    const newTypeConfig = {
      ...typeValues,
      subscription: true,
      oneoff: false,
      onbase: false,
      onsite: false,
    };

    setValue('type', newTypeConfig, { shouldValidate: true });

    // Set subscription period
    setValue('subscriptionType', subscription as any, { shouldValidate: true });
  };

  const handleSubscriptionModeEnable = () => {
    setValue(
      'type',
      {
        ...typeValues,
        subscription: true,
        oneoff: false,
      },
      { shouldValidate: true },
    );
  };

  return (
    <>
      <div className='grid md:grid-cols-2 gap-6'>
        {/* One-off Service Option */}
        <Card
          className={`p-6 cursor-pointer border-2 transition-all duration-200 hover:shadow-md ${
            typeValues?.oneoff
              ? 'border-green-500 bg-green-50 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={handleOneoffSelection}
        >
          <div className='flex flex-col items-center text-center space-y-4'>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                typeValues?.oneoff
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Clock className='w-8 h-8' />
            </div>

            <div>
              <h3
                className={`text-lg font-semibold ${
                  typeValues?.oneoff ? 'text-green-900' : 'text-gray-900'
                }`}
              >
                Υπηρεσία μιας φοράς
              </h3>
              <p
                className={`text-sm mt-2 ${
                  typeValues?.oneoff ? 'text-green-700' : 'text-gray-600'
                }`}
              >
                Η υπηρεσία εκτελείται μια φορά χωρίς να επαναλαμβάνεται
              </p>
            </div>

            {typeValues?.oneoff && (
              <div className='flex items-center gap-1.5 text-green-600 text-base font-medium'>
                <span>✓</span>
                <span>Επιλεγμένο</span>
              </div>
            )}
          </div>
        </Card>

        {/* Subscription Service Option */}
        <Card
          className={`p-6 cursor-pointer border-2 transition-all duration-200 hover:shadow-md ${
            typeValues?.subscription
              ? 'border-green-500 bg-green-50 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={handleSubscriptionModeEnable}
        >
          <div className='flex flex-col items-center text-center space-y-4'>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                typeValues?.subscription
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Repeat className='w-8 h-8' />
            </div>

            <div>
              <h3
                className={`text-lg font-semibold ${
                  typeValues?.subscription ? 'text-green-900' : 'text-gray-900'
                }`}
              >
                Υπηρεσία συνδρομής
              </h3>
              <p
                className={`text-sm mt-2 ${
                  typeValues?.subscription ? 'text-green-700' : 'text-gray-600'
                }`}
              >
                Η υπηρεσία επαναλαμβάνεται <br></br>(π.χ. μαθήματα, συνεδρίες,
                συμβάσεις κλπ.)
              </p>
            </div>

            {typeValues?.subscription && (
              <div className='flex items-center gap-1.5 text-green-600 text-base font-medium'>
                <span>✓</span>
                <span>Επιλεγμένο</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Subscription Period Selection - Only shown when subscription is selected */}
      {typeValues?.subscription && (
        <div className='space-y-4'>
          <div className='text-center'>
            <h4 className='text-lg font-medium text-gray-900'>
              Επιλέξτε περίοδο πληρωμής
            </h4>
            <p className='text-sm text-gray-600 mt-1'>
              Με ποιον τρόπο υπολογίζεται η πληρωμή της συγκεκριμένης υπηρεσίας;
            </p>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            {subscriptionTypeOptions.map((option) => (
              <Card
                key={option.value}
                className={`cursor-pointer border-2 transition-all hover:shadow-md ${
                  subscriptionValue === option.value
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSubscriptionSelection(option.value)}
              >
                <div className='block p-3 cursor-pointer'>
                  <div className='flex items-center justify-between'>
                    <div
                      className={`text-sm font-semibold ${
                        subscriptionValue === option.value
                          ? 'text-green-900'
                          : 'text-gray-900'
                      }`}
                    >
                      {option.label}
                    </div>
                    {subscriptionValue === option.value && (
                      <div className='text-green-600 text-sm font-medium'>
                        ✓
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {subscriptionError && (
            <p className='text-sm text-red-600 mt-2'>{subscriptionError}</p>
          )}
        </div>
      )}
    </>
  );
}
