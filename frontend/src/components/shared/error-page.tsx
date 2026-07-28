'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { NavigationButton } from './navigation-button';
import {
  buildCloudinaryUrl,
  extractPublicId,
} from '@/lib/utils/cloudinary';

interface ErrorPageProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  description?: string;
  errorCode?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  showResetButton?: boolean;
  resetButtonText?: string;
  className?: string;
}

export function ErrorPage({
  error,
  reset,
  title = 'Ουπς! Κάτι πήγε στραβά',
  description = 'Παρουσιάστηκε ένα απροσδόκητο σφάλμα. Παρακαλούμε δοκιμάστε ξανά ή επιστρέψτε στην αρχική σελίδα.',
  errorCode = '500',
  primaryButtonText = 'Πίσω στην Αρχική',
  primaryButtonHref = '/',
  showResetButton = true,
  resetButtonText = 'Δοκιμάστε ξανά',
  className = '',
}: ErrorPageProps) {
  const errorImageUrl = React.useMemo(() => {
    const url =
      'https://res.cloudinary.com/ddejhvzbf/image/upload/v1750081347/Static/error-page-img_rr1uvk.svg';
    const publicId = extractPublicId(url);
    return publicId
      ? buildCloudinaryUrl(publicId, {
          width: 400,
          height: 400,
          crop: 'limit',
          quality: 'auto:good',
          format: 'auto',
          dpr: 'auto',
        })
      : url;
  }, []);

  return (
    <div
      className={`min-h-screen flex justify-center items-center bg-silver py-20 ${className}`}
    >
      <div className='container m-auto px-4'>
        <div className='max-w-4xl mx-auto'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
            {/* Image */}
            <div className='text-center lg:text-left'>
              <Image
                height={400}
                width={400}
                className='w-full max-w-md mx-auto lg:mx-0'
                src={errorImageUrl}
                alt='Σφάλμα'
                priority
              />
            </div>

            {/* Content */}
            <div className='text-center lg:text-left space-y-6'>
              <div className='space-y-4'>
                <div className='text-6xl lg:text-8xl font-bold text-gray-900'>
                  {errorCode.split('').map((digit, index) => (
                    <span
                      key={index}
                      className={index === 1 ? 'text-primary' : ''}
                    >
                      {digit}
                    </span>
                  ))}
                </div>
                <h1 className='text-2xl lg:text-3xl font-bold text-gray-900'>
                  {title}
                </h1>
                <p className='text-gray-600 text-lg max-w-md mx-auto lg:mx-0'>
                  {description}
                </p>
                {/* Show error message in development */}
                {process.env.NODE_ENV === 'development' && error?.message && (
                  <p className='text-red-600 text-sm font-mono bg-red-50 p-3 rounded'>
                    {error.message}
                  </p>
                )}
              </div>

              <div className='flex flex-col sm:flex-row gap-4 justify-center lg:justify-start'>
                {showResetButton && reset && (
                  <Button onClick={reset} size='lg' variant='default'>
                    {resetButtonText}
                  </Button>
                )}
                <NavigationButton
                  href={primaryButtonHref}
                  variant={showResetButton && reset ? 'outline' : 'default'}
                >
                  {primaryButtonText}
                </NavigationButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
