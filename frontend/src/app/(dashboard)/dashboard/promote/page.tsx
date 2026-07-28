import { requireProUser, getCurrentUser } from '@/actions/auth/server';
import { getSubscription } from '@/actions/subscription';
import { getDashboardMetadata } from '@/lib/seo/pages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BillingForm } from '@/components';
import { SubscriptionStatus, type Subscription } from '@/lib/prisma-types';
import SubscriptionManagement from './subscription-management';
import CancelSubscriptionButton from './cancel-subscription-button';
import PlanComparison from '@/components/subscription/plan-comparison';

export const metadata = getDashboardMetadata('Προώθηση');
export const dynamic = 'force-dynamic';

export default async function SubscriptionPage() {
  await requireProUser();

  const subResult = await getSubscription();
  const subscription: Subscription | null = subResult.success
    ? ((subResult.data?.subscription as Subscription | null) ?? null)
    : null;

  const userResult = await getCurrentUser();
  const user = userResult.success ? userResult.data?.user : null;
  const profile = userResult.success ? userResult.data?.profile : null;

  const isActive = subscription?.status === SubscriptionStatus.active;
  const isCanceling = isActive && subscription?.cancelAtPeriodEnd;

  return (
    <div className='max-w-5xl w-full mx-auto space-y-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Προώθηση</h1>
        <p className='text-muted-foreground mt-1'>
          Διαχείριση επιλεγμένου πακέτου προβολής.
        </p>
      </div>

      <SubscriptionManagement subscription={subscription || null} />

      {!isActive && <PlanComparison />}

      {isActive && user && (
        <Card className='w-full max-w-3xl shadow-lg'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-lg'>Στοιχεία Τιμολόγησης</CardTitle>
            <p className='text-sm text-muted-foreground'>
              Διαχείριση στοιχείων τιμολόγησης.
            </p>
          </CardHeader>
          <CardContent>
            <BillingForm initialUser={user} initialProfile={profile} hideCard />
          </CardContent>
        </Card>
      )}

      {isActive && (
        <PlanComparison
          currentPlan='promoted'
          promotedCurrentCta={
            isCanceling ? undefined : <CancelSubscriptionButton />
          }
        />
      )}

      <div aria-hidden className='h-8 md:h-12' />
    </div>
  );
}
