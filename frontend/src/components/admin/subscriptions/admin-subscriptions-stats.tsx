import { Suspense } from 'react';
import { CreditCard, CheckCircle2, XCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getSubscriptionStats } from '@/actions/admin/subscriptions';

async function StatsCardsContent() {
  const statsResult = await getSubscriptionStats();

  if (!statsResult.success || !statsResult.data) {
    return <StatsCardsSkeleton />;
  }

  const stats = statsResult.data;

  return (
    <>
      {/* Total Subscriptions Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Συνολικές Συνδρομές</CardTitle>
          <CreditCard className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Ενεργές</span>
              <span className='text-xs font-medium'>{stats.active || 0}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Ανενεργές</span>
              <span className='text-xs font-medium'>
                {(stats.canceled || 0) + (stats.pastDue || 0)}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Σύνολο</span>
          <span className='text-xl font-bold'>{stats.total}</span>
        </CardFooter>
      </Card>

      {/* Active Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Ενεργές</CardTitle>
          <CheckCircle2 className='h-4 w-4 text-green-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>% του Συνόλου</span>
              <span className='text-xs font-medium'>
                {stats.total > 0
                  ? ((stats.active / stats.total) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Τρέχουσες</span>
              <span className='text-xs font-medium'>{stats.active || 0}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Ενεργές</span>
          <span className='text-xl font-bold text-green-600'>{stats.active}</span>
        </CardFooter>
      </Card>

      {/* Expired Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Έληξαν</CardTitle>
          <XCircle className='h-4 w-4 text-red-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>% του Συνόλου</span>
              <span className='text-xs font-medium'>
                {stats.total > 0
                  ? ((stats.canceled / stats.total) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Λήξεις</span>
              <span className='text-xs font-medium'>{stats.canceled || 0}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Έληξαν</span>
          <span className='text-xl font-bold text-red-600'>{stats.canceled}</span>
        </CardFooter>
      </Card>

    </>
  );
}

function StatsCardsSkeleton() {
  return (
    <>
      {/* Total Subscriptions Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Συνολικές Συνδρομές</CardTitle>
          <CreditCard className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Ενεργές</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Ανενεργές</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-12' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>

      {/* Active Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Ενεργές</CardTitle>
          <CheckCircle2 className='h-4 w-4 text-green-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>% του Συνόλου</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Τρέχουσες</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>

      {/* Expired Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Έληξαν</CardTitle>
          <XCircle className='h-4 w-4 text-red-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>% του Συνόλου</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Λήξεις</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>

    </>
  );
}

export function AdminSubscriptionsStats() {
  return (
    <Suspense fallback={<StatsCardsSkeleton />}>
      <StatsCardsContent />
    </Suspense>
  );
}
