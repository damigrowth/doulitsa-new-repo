import { requireProUser, getCurrentUser } from '@/actions/auth/server';
import { getSubscription, getMyPaymentAttempts } from '@/actions/subscription';
import { getDashboardMetadata } from '@/lib/seo/pages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { BillingForm } from '@/components';
import { SubscriptionStatus, type Subscription } from '@/lib/prisma-types';
import SubscriptionManagement from './subscription-management';
import CancelSubscriptionButton from './cancel-subscription-button';
import PlanComparison from '@/components/subscription/plan-comparison';
import { PaymentAttemptsList } from '@/components/subscription/payment-attempts-list';
import { HistoryPagination } from '@/components/subscription/history-pagination';

export const metadata = getDashboardMetadata('Προώθηση');
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ historyPage?: string }>;
}

export default async function SubscriptionPage({ searchParams }: PageProps) {
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

  // Payment history (paginated via ?historyPage), mirrors OLD promote/page.tsx.
  const sp = await searchParams;
  const requestedPage = Math.max(1, parseInt(sp.historyPage || '1', 10) || 1);
  const historyResult = subscription
    ? await getMyPaymentAttempts(requestedPage)
    : null;
  const history = historyResult?.success ? historyResult.data : null;
  const attemptsTotal = history?.total ?? 0;
  const totalHistoryPages = history?.totalPages ?? 1;
  const currentHistoryPage = history?.page ?? 1;

  return (
    <div className='max-w-5xl w-full mx-auto space-y-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Προώθηση</h1>
        <p className='text-muted-foreground mt-1'>
          Διαχείριση επιλεγμένου πακέτου προβολής.
        </p>
      </div>

      <SubscriptionManagement subscription={subscription || null} />

      {/* Quick jump to the payment history for anyone with past charges. */}
      {attemptsTotal > 0 && (
        <Button asChild variant='outline' size='sm' className='w-fit'>
          <a href='#payment-history'>
            <History className='mr-2 h-4 w-4' />
            Ιστορικό χρεώσεων ({attemptsTotal})
          </a>
        </Button>
      )}

      {!isActive && <PlanComparison />}

      {/* Payment history: unlike OLD (which hid it with the whole isActive
          block), a client with past charges can always see them — even after
          the subscription lapses (user decision 2026-11-06). */}
      {attemptsTotal > 0 && (
        <Card id='payment-history' className='w-full max-w-3xl shadow-lg scroll-mt-24'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-lg'>
              Τελευταίες χρεώσεις
              <span className='ml-2 text-sm font-normal text-muted-foreground'>
                ({attemptsTotal})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentAttemptsList attempts={history?.attempts ?? []} variant='compact' />
            <HistoryPagination
              currentPage={currentHistoryPage}
              totalPages={totalHistoryPages}
              basePath='/dashboard/promote'
            />
          </CardContent>
        </Card>
      )}

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
