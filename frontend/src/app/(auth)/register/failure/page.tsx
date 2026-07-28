import { Suspense } from 'react';
import FormResendVerification from '@/components/forms/auth/form-resend-verification';

export default function EmailVerificationFailurePage() {
  return (
    <section className='mt-20 pt-20 pb-40 bg-gray-50'>
      <div className='container mx-auto px-4'>
        <div className='flex justify-center'>
          <div className='w-full max-w-lg'>
            <div className='relative bg-white p-12 sm:p-8 shadow-lg rounded-xl text-center border border-gray-300'>
              <div className='flex justify-center items-center mb-6'>
                <svg
                  className='w-16 h-16 text-red-500'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth={1.5}
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z'
                  />
                </svg>
              </div>
              <h2 className='text-2xl lg:text-3xl font-medium text-gray-900 mb-2'>
                Ο σύνδεσμος έληξε
              </h2>
              <p className='text-lg mb-4 text-muted-foreground'>
                Ο σύνδεσμος επιβεβαίωσης δεν είναι πλέον έγκυρος.
              </p>
              <p className='text-sm mb-6 text-muted-foreground'>
                Μπορείς να ζητήσεις νέο email επιβεβαίωσης πατώντας το παρακάτω
                κουμπί.
              </p>
              {/* Resend verification form */}
              <Suspense fallback={null}>
                <FormResendVerification />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
