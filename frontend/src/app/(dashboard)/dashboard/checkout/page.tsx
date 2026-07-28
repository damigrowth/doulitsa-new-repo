import { redirect } from 'next/navigation';
import { getDashboardMetadata } from '@/lib/seo/pages';
import { SubscriptionStatus, BillingInterval, type Subscription } from '@/lib/prisma-types';
import { requireProUser, getCurrentUser } from '@/actions/auth/server';
import { getSubscription } from '@/actions/subscription';
import { canAccessPayments, getTestModeBanner } from '@/lib/payment/test-mode';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import CheckoutContent from './checkout-content';

export const metadata = getDashboardMetadata('Ολοκλήρωση Συνδρομής');
export const dynamic = 'force-dynamic';

interface CheckoutPageProps {
  searchParams: Promise<{
    interval?: string;
  }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  // Require pro user type — same guard as billing/page.tsx
  await requireProUser();

  const [userResult, subResult, params] = await Promise.all([
    getCurrentUser(),
    getSubscription(),
    searchParams,
  ]);

  if (!userResult.success || !userResult.data.user) {
    redirect('/login');
  }

  // If already subscribed, redirect to subscription management
  const existingSubscription = subResult.success
    ? ((subResult.data?.subscription as Subscription | null) ?? null)
    : null;
  if (existingSubscription?.status === SubscriptionStatus.active) {
    redirect('/dashboard/promote');
  }

  // Check test mode access - redirect if not allowed
  const accessCheck = await canAccessPayments();
  if (!accessCheck.allowed) {
    redirect('/dashboard');
  }

  const { user, profile } = userResult.data;
  const billingInterval =
    params.interval === 'month' ? BillingInterval.month : BillingInterval.year;
  const testModeBanner = await getTestModeBanner();

  return (
    <div className='max-w-5xl w-full mx-auto space-y-6'>
      {testModeBanner && (
        <Alert className='bg-amber-50 border-amber-200 text-amber-800'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription className='ml-2'>
            {testModeBanner}
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h1 className='text-2xl font-bold tracking-tight'>
          Ολοκλήρωση Συνδρομής
        </h1>
        <p className='text-muted-foreground mt-1'>
          Αναβάθμιση σε Προωθημένο πακέτο.
        </p>
      </div>

      <CheckoutContent
        user={user}
        profile={profile}
        defaultInterval={billingInterval}
      />
    </div>
  );
}
