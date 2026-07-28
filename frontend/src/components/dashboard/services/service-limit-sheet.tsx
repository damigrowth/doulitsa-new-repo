'use client';

import { AlertCircle, FileText, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NextLink } from '@/components';

export default function ServiceLimitSheet() {
  return (
    <div className='max-w-5xl mx-auto p-6'>
      <Card>
        <CardContent className='pt-6'>
          <div className='space-y-6 py-10'>
            <div className='text-center space-y-4 pt-6'>
              <div className='mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center'>
                <AlertCircle className='w-6 h-6 text-amber-600' />
              </div>

              <h1 className='text-2xl font-bold text-gray-900'>
                Όριο υπηρεσιών
              </h1>
            </div>

            <div className='text-center'>
              <p className='text-gray-700'>
                Έχεις φτάσει το μέγιστο όριο υπηρεσιών στο δωρεάν πακέτο προβολής.
              </p>
              <p className='text-gray-500 text-sm mt-2'>
                Αναβάθμισε το πακέτο σου για να δημιουργήσεις περισσότερες
                υπηρεσίες και να σε δουν περισσότεροι χρήστες.
              </p>
            </div>

            <div className='flex flex-col sm:flex-row gap-3 justify-center items-center'>
              <Button asChild size='lg'>
                <NextLink href='/dashboard/promote'>
                  <Rocket className='w-4 h-4 mr-2' />
                  Αναβάθμιση Πακέτου
                </NextLink>
              </Button>

              <Button asChild variant='outline' size='lg'>
                <NextLink href='/dashboard/services'>
                  <FileText className='w-4 h-4 mr-2' />
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
