'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { NextLink } from '@/components';

interface SuccessContentProps {
  initialIsActive: boolean;
}

const MAX_POLL_ATTEMPTS = 12; // 12 attempts × 5 seconds = 60 seconds max
const POLL_INTERVAL = 5000; // 5 seconds

export default function SuccessContent({
  initialIsActive,
}: SuccessContentProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [pollCount, setPollCount] = useState(0);
  const [isPolling, setIsPolling] = useState(!initialIsActive);
  const router = useRouter();

  useEffect(() => {
    if (isActive || pollCount >= MAX_POLL_ATTEMPTS) {
      setIsPolling(false);
      return;
    }

    const timer = setTimeout(() => {
      router.refresh();
      setPollCount((prev) => prev + 1);
    }, POLL_INTERVAL);

    return () => clearTimeout(timer);
  }, [isActive, pollCount, router]);

  // Update isActive when prop changes after refresh
  useEffect(() => {
    if (initialIsActive) {
      setIsActive(true);
      setIsPolling(false);
    }
  }, [initialIsActive]);

  // Pending state - webhook still processing
  if (!isActive && isPolling) {
    return (
      <div className='flex flex-col items-center justify-center py-20 space-y-6'>
        <Loader2 className='size-12 animate-spin text-muted-foreground' />
        <div className='text-center space-y-2'>
          <h1 className='text-2xl font-bold'>Επεξεργασία πληρωμής...</h1>
          <p className='text-muted-foreground'>
            Η πληρωμή σας επεξεργάζεται. Παρακαλώ περιμένετε.
          </p>
        </div>
      </div>
    );
  }

  // Timeout state - webhook didn't complete in time
  if (!isActive && !isPolling) {
    return (
      <div className='flex flex-col items-center justify-center py-20 space-y-6'>
        <Card className='max-w-md w-full'>
          <CardContent className='pt-6 text-center space-y-4'>
            <h1 className='text-2xl font-bold'>Επεξεργασία σε εξέλιξη</h1>
            <p className='text-muted-foreground'>
              Η πληρωμή σας ολοκληρώθηκε επιτυχώς. Η ενεργοποίηση της συνδρομής
              μπορεί να διαρκέσει λίγα λεπτά.
            </p>
            <div className='space-y-2 pt-4'>
              <Button
                onClick={() => router.refresh()}
                variant='outline'
                className='w-full'
              >
                Ανανέωση
              </Button>
              <Button asChild className='w-full'>
                <NextLink href='/dashboard/promote'>Προώθηση</NextLink>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className='flex flex-col items-center justify-center py-20 space-y-6'>
      <Card className='max-w-md w-full'>
        <CardContent className='pt-6 text-center space-y-4'>
          <CheckCircle2 className='size-16 text-green-600 mx-auto' />
          <h1 className='text-2xl font-bold'>Το Προωθημένο Πακέτο ενεργοποιήθηκε!</h1>
          <p className='text-muted-foreground'>
            Η συνδρομή σας ενεργοποιήθηκε επιτυχώς. Απολαύστε όλα τα προνόμια
            του Προωθημένου πακέτου.
          </p>

          <div className='space-y-2 pt-4'>
            <Button asChild variant='outline' className='w-full'>
              <NextLink href='/dashboard/promote'>Προώθηση</NextLink>
            </Button>
            <Button asChild className='w-full'>
              <NextLink href='/dashboard/services'>
                Διαχείριση Υπηρεσιών
              </NextLink>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
