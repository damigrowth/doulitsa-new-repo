import { Metadata } from 'next';
import NextLink from '@/components/shared/next-link';

import { getRegisterMetadata } from '@/lib/seo/pages';
import {
  redirectOnboardingUsers,
  redirectCompletedUsers,
  redirectOAuthUsersToSetup,
} from '@/actions/auth/server';
import {
  AuthTypeOptions,
  FormAuthRegister,
  HeadingFormRegister,
  RegisterAuthStateSync,
} from '@/components';
import { JSX } from 'react';

export const dynamic = 'force-dynamic';

// Static SEO
export async function generateMetadata(): Promise<Metadata> {
  return getRegisterMetadata();
}

export default async function RegisterPage(): Promise<JSX.Element> {
  // Server-side auth check - redirect authenticated users to their dashboard
  await redirectCompletedUsers();

  // Server-side auth check - redirect ONBOARDING users to /onboarding
  await redirectOnboardingUsers();

  // Server-side auth check - redirect OAuth users who need role setup
  await redirectOAuthUsersToSetup();

  return (
    <section className='mt-20 pt-20 pb-40 bg-gray-50'>
      <div className='container mx-auto px-4'>
        {/* Title Section */}
        <div className='flex justify-center mb-15'>
          <div className='lg:w-1/2 text-center'>
            <div className='relative mb-15 lg:mb-8'>
              <h2 className='text-2xl lg:text-3xl font-medium text-gray-900 mb-2'>
                Εγγραφή
              </h2>
              <p className='text-gray-700 font-sans'>
                Δημιουργία νέου λογαριασμού με λίγα μόνο βήματα
              </p>
              <p className='text-gray-600 mt-2'>
                Έχεις ήδη λογαριασμό?{' '}
                <NextLink
                  href='/login'
                  className='text-green-600 hover:text-green-700 font-medium'
                >
                  Σύνδεση!
                </NextLink>
              </p>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className='flex justify-center'>
          <div className='xl:w-2/5 w-full max-w-2xl'>
            <div className='relative bg-white p-12 sm:p-8 rounded-xl shadow-lg border border-gray-300'>
              <RegisterAuthStateSync />
              <HeadingFormRegister />
              <AuthTypeOptions />
              <FormAuthRegister />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
