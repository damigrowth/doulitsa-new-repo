import React from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, FileText, Plus } from 'lucide-react';
import { getCurrentUser } from '@/actions/auth/server';
import { getDashboardMetadata } from '@/lib/seo/pages';
import { NextLink } from '@/components';
import { canCreateService } from '@/lib/subscription/feature-gate';
import CreateServiceButton from '@/components/dashboard/services/create-service-button';

export const metadata = getDashboardMetadata('Επιτυχής Δημιουργία Υπηρεσίας');

interface PageProps {
  searchParams: Promise<{
    id?: string;
    title?: string;
  }>;
}

export default async function ServiceSuccessPage({ searchParams }: PageProps) {
  // Verify user is authenticated
  const userResult = await getCurrentUser();

  if (!userResult.success || !userResult.data.user) {
    redirect('/login');
  }

  // Await searchParams as required in Next.js 15
  const params = await searchParams;

  // Get service info from URL params
  const serviceId = params.id;
  const serviceTitle = params.title ? decodeURIComponent(params.title) : '';

  // If no service data, redirect back to create page
  if (!serviceId || !serviceTitle) {
    redirect('/dashboard/services/create');
  }

  const { profile } = userResult.data;
  const canCreateMore = profile?.id
    ? await canCreateService(profile.id)
    : true;

  return (
    <div className='max-w-5xl mx-auto p-6'>
      <Card>
        <CardContent className='pt-6'>
          <div className='space-y-6 py-10'>
            {/* Success Icon and Badges */}
            <div className='text-center space-y-4 pt-6'>
              <div className='mx-auto w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg'>
                <Check className='w-6 h-6 text-white' />
              </div>

              <h1 className='text-2xl font-bold text-gray-900'>
                Επιτυχής υποβολή υπηρεσίας!
              </h1>

              {/* Service ID and Status Badges */}
              <div className='flex items-center justify-center gap-2'>
                <Badge
                  variant='outline'
                  className='bg-white border-green-300 text-green-700'
                >
                  ID: #{serviceId}
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
                Επιτυχής δημιουργία της υπηρεσίας{' '}
                <strong className='text-green-800'>"{serviceTitle}"</strong>.
                <br></br> Σύντομα θα γίνει η δημοσίευση της αφού ολοκληρωθεί η
                διαδικασία ελέγχου.
              </p>
            </div>

            {/* Action Buttons */}
            <div className='flex flex-col sm:flex-row gap-3 justify-center items-center'>
              <CreateServiceButton
                canCreateMore={canCreateMore}
                className='bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6 h-10'
              >
                <Plus className='w-4 h-4' />
                Δημιουργία Νέας Υπηρεσίας
              </CreateServiceButton>

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
                  <FileText className='w-4 h-4' />
                  Διαχείριση Υπηρεσιών
                </NextLink>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
