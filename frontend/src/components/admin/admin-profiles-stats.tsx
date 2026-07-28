import { Suspense } from 'react';
import { Users, CheckCircle2, Star, Award, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getProfileStats } from '@/actions/admin/profiles';

async function StatsCardsContent() {
  const statsResult = await getProfileStats();

  if (!statsResult.success || !statsResult.data) {
    return <StatsCardsSkeleton />;
  }

  const stats = statsResult.data;

  return (
    <>
      {/* Total Profiles Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Total Profiles</CardTitle>
          <Users className='h-4 w-4 text-green-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Professional</span>
              <span className='text-xs font-medium'>{stats.professional || 0}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Company</span>
              <span className='text-xs font-medium'>{stats.company || 0}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Total</span>
          <span className='text-xl font-bold'>{stats.total}</span>
        </CardFooter>
      </Card>

      {/* Status Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Status</CardTitle>
          <Star className='h-4 w-4 text-yellow-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Featured</span>
              <span className='text-xs font-medium'>{stats.featured}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Top</span>
              <span className='text-xs font-medium'>{stats.top || 0}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Featured</span>
          <span className='text-xl font-bold'>{stats.featured}</span>
        </CardFooter>
      </Card>

      {/* Verification Card */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Verification</CardTitle>
          <ShieldCheck className='h-4 w-4 text-blue-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Verified</span>
              <span className='text-xs font-medium'>{stats.verified}</span>
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Unverified</span>
              <span className='text-xs font-medium'>{stats.unverified || 0}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <span className='text-sm font-medium'>Verified</span>
          <span className='text-xl font-bold'>{stats.verified}</span>
        </CardFooter>
      </Card>
    </>
  );
}

function StatsCardsSkeleton() {
  return (
    <>
      {/* Total Profiles Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Total Profiles</CardTitle>
          <Users className='h-4 w-4 text-green-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Professional</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Company</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-12' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>

      {/* Status Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Status</CardTitle>
          <Star className='h-4 w-4 text-yellow-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Featured</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Top</span>
              <Skeleton className='h-3 w-8' />
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex items-baseline justify-between pt-3'>
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-6 w-12' />
        </CardFooter>
      </Card>

      {/* Verification Skeleton */}
      <Card className='flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <CardTitle className='text-sm'>Verification</CardTitle>
          <ShieldCheck className='h-4 w-4 text-blue-500' />
        </CardHeader>
        <CardContent className='flex-1 p-0'>
          <div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Verified</span>
              <Skeleton className='h-3 w-8' />
            </div>
            <div className='flex items-center justify-between px-6 py-2'>
              <span className='text-xs text-muted-foreground'>Unverified</span>
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

export function AdminProfilesStats() {
  return (
    <Suspense fallback={<StatsCardsSkeleton />}>
      <StatsCardsContent />
    </Suspense>
  );
}
