'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Star } from 'lucide-react';
import { NextLink } from '@/components';
import { useSubscriptionSheetStore } from '@/lib/stores/use-subscription-sheet-store';
import { usePaymentsAccess } from '@/lib/hooks/use-payments-access';
import { BillingInterval } from '@/lib/prisma-types';
import PricingSelection from './pricing-selection';

/**
 * Global subscription upgrade sheet.
 * Shows only pricing options (monthly/annual).
 * Plan comparison is shown inline on /dashboard/promote.
 * Controlled by useSubscriptionSheetStore.
 */
export default function SubscriptionSheet() {
  const { isOpen, triggerReason, close } = useSubscriptionSheetStore();
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>(BillingInterval.year);
  const router = useRouter();
  const { allowed, testModeBanner, isLoading } = usePaymentsAccess();

  const handleContinue = () => {
    router.push(`/dashboard/checkout?interval=${selectedInterval}`);
    close();
  };

  // Don't render sheet if access is denied, UNLESS it was triggered by a
  // feature limit (triggerReason) — limit dialogs should always show
  if (!isLoading && !allowed && !triggerReason) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className='w-full sm:max-w-2xl overflow-y-auto flex flex-col'>
        <SheetHeader>
          <SheetTitle className='flex items-center gap-2'>
            <Star className='size-5 fill-yellow-400 text-yellow-400 shrink-0' />
            Αναβάθμιση σε Προωθημένο
          </SheetTitle>
          <SheetDescription>
            Αύξησε την προβολή του προφίλ σου και ξεκλείδωσε περισσότερες δυνατότητες.
          </SheetDescription>
        </SheetHeader>

        <div className='mt-6 flex-1'>
          {isLoading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <>
              {testModeBanner && (
                <Alert className='bg-amber-50 border-amber-200 text-amber-800 mb-6'>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription className='ml-2'>
                    {testModeBanner}
                  </AlertDescription>
                </Alert>
              )}

              {triggerReason && (
                <Alert className='bg-amber-50 border-amber-200 text-amber-800 mb-6'>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription className='ml-2'>
                    {triggerReason}{' '}
                    <NextLink
                      href='/dashboard/promote'
                      onClick={close}
                      className='font-medium underline underline-offset-2 hover:text-amber-900'
                    >
                      Σύγκριση Πακέτων
                    </NextLink>
                  </AlertDescription>
                </Alert>
              )}

              <PricingSelection
                onBack={close}
                selectedInterval={selectedInterval}
                onIntervalChange={setSelectedInterval}
              />

              <Button
                className='w-full mt-6'
                size='lg'
                onClick={handleContinue}
              >
                Ολοκλήρωση Συνδρομής
              </Button>

              <Button
                variant='ghost'
                className='w-full mt-10 text-muted-foreground'
                onClick={close}
              >
                Όχι τώρα
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
