'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle } from 'lucide-react';
import {
  SubscriptionStatus,
  SubscriptionPlan,
  BillingInterval,
  type Subscription,
} from '@/lib/prisma-types';

interface SubscriptionManagementProps {
  subscription: Subscription | null;
}

export default function SubscriptionManagement({
  subscription,
}: SubscriptionManagementProps) {
  const isActive = subscription?.status === SubscriptionStatus.active;
  const isCanceling = isActive && subscription?.cancelAtPeriodEnd;

  // Free plan state
  if (!subscription || subscription.plan === SubscriptionPlan.free || subscription.status === SubscriptionStatus.canceled) {
    return (
      <Card className='w-full max-w-3xl shadow-lg'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-lg flex items-center gap-2'>
            Βασικό Πακέτο
            <Badge variant='outline'>Δωρεάν</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground'>
            Αναβάθμισε στο Προωθημένο πακέτο για μεγαλύτερη προβολή και περισσότερες δυνατότητες.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Active subscription
  return (
    <Card className='w-full max-w-3xl shadow-lg'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-lg flex items-center gap-2'>
          Προωθημένο Πακέτο
          <Badge>{isActive ? 'Ενεργό' : subscription.status}</Badge>
          {isCanceling && (
            <Badge variant='destructive'>Ακυρώνεται</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <p className='text-muted-foreground'>Χρέωση</p>
            <p className='font-medium'>
              {subscription.billingInterval === BillingInterval.year ? '180€/έτος' : '20€/μήνα'}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground'>Επόμενη χρέωση</p>
            <p className='font-medium'>
              {subscription.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString('el-GR')
                : '-'}
            </p>
          </div>
        </div>

        {isCanceling && (
          <>
            <Separator />
            <div className='flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3'>
              <AlertTriangle className='size-4 text-amber-600 mt-0.5 shrink-0' />
              <p className='text-sm text-amber-800'>
                Η συνδρομή σας θα λήξει στις{' '}
                {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString('el-GR')
                  : ''}
                . Μετά τη λήξη, θα επιστρέψετε στο Βασικό πακέτο.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
